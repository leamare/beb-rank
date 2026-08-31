import * as db from '../db/localDb'
import * as sheets from '../sheets/sheetsClient'
import { isSignedIn, recheckSignedIn } from '../auth/googleAuth'
import type { LogEntry } from '../domain/log'
import type { PendingAction } from '../db/localDb'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

interface SyncState {
  status: SyncStatus
  pendingCount: number
}

const listeners = new Set<(state: SyncState) => void>()
let state: SyncState = { status: 'idle', pendingCount: 0 }

export function onSyncChange(cb: (state: SyncState) => void): () => void {
  listeners.add(cb)
  cb(state)
  return () => listeners.delete(cb)
}

async function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  for (const cb of listeners) cb(state)
}

const dataListeners = new Set<() => void>()

/** Fired whenever local logs change as a result of a background sync pass —
 * lets the UI refresh even though nothing the user did triggered it directly. */
export function onDataChanged(cb: () => void): () => void {
  dataListeners.add(cb)
  return () => dataListeners.delete(cb)
}

function notifyDataChanged() {
  for (const cb of dataListeners) cb()
}

async function refreshPendingCount() {
  const pending = await db.getPending()
  await setState({ pendingCount: pending.length })
}

export async function logPoint(entry: LogEntry): Promise<void> {
  await db.putLog(entry)
  await db.enqueuePending({ id: entry.id, kind: 'append', entry, createdAt: Date.now() })
  await refreshPendingCount()
  void flushPending()
}

export async function deleteLog(id: string): Promise<void> {
  await db.deleteLogLocal(id)
  // If the append for this id hasn't been sent yet, just cancel it locally —
  // nothing to delete remotely, and it avoids an append+delete race where
  // the append could land in the same sync pass after the delete no-ops.
  const pending = await db.getPending()
  const pendingAppend = pending.find((p) => p.kind === 'append' && p.entry.id === id)
  if (pendingAppend) {
    await db.removePending(pendingAppend.id)
  } else {
    await db.enqueuePending({ id: `del-${id}-${Date.now()}`, kind: 'delete', entryId: id, createdAt: Date.now() })
  }
  await refreshPendingCount()
  void flushPending()
}

let flushInFlight: Promise<void> | null = null

/**
 * Guarded against overlapping calls — the interval tick, the 'online' event,
 * visibilitychange, and the direct call right after logging a point can all
 * fire close together. Without this, two overlapping runs could both see the
 * same pending entry (removed only after success) and append it twice.
 */
export function flushPending(): Promise<void> {
  if (flushInFlight) return flushInFlight
  flushInFlight = flushPendingNow().finally(() => {
    flushInFlight = null
  })
  return flushInFlight
}

async function flushPendingNow(): Promise<void> {
  if (!navigator.onLine || !isSignedIn()) {
    await setState({ status: navigator.onLine ? state.status : 'offline' })
    return
  }
  const pending = await db.getPending()
  if (pending.length === 0) return

  await setState({ status: 'syncing' })
  const appends = pending.filter((p): p is Extract<PendingAction, { kind: 'append' }> => p.kind === 'append')
  const deletes = pending.filter((p): p is Extract<PendingAction, { kind: 'delete' }> => p.kind === 'delete')

  try {
    if (appends.length > 0) {
      await sheets.appendLogs(appends.map((a) => a.entry))
      await Promise.all(appends.map((a) => db.removePending(a.id)))
    }
    if (deletes.length > 0) {
      await sheets.deleteLogsRemote(deletes.map((d) => d.entryId))
      await Promise.all(deletes.map((d) => db.removePending(d.id)))
    }
    await setState({ status: 'idle' })
  } catch {
    await setState({ status: 'error' })
  }
  await refreshPendingCount()
}

/**
 * Pushes local-only entries into the connected sheet, but only once per
 * (device, sheet) — covers reconnecting devices that each had their own
 * separate history before pointing at a shared sheet. Running this on every
 * pull (the old behavior) meant any remote deletion — including a deliberate
 * "reset database" — got silently re-uploaded by every other device's next
 * sync, since it kept treating "not in the last fetch" as "needs restoring".
 */
async function mergeLocalHistoryOnce(remoteLogs: LogEntry[]): Promise<LogEntry[]> {
  const currentId = sheets.getSpreadsheetId()
  if (!currentId) return remoteLogs
  const mergedFor = await db.getMeta<string>('historyMergedFor')
  if (mergedFor === currentId) return remoteLogs

  const remoteIds = new Set(remoteLogs.map((l) => l.id))
  const pending = await db.getPending()
  const pendingIds = new Set(pending.map((p) => (p.kind === 'append' ? p.entry.id : p.entryId)))
  const localLogs = await db.getAllLogs()
  const missing = localLogs.filter((l) => !remoteIds.has(l.id) && !pendingIds.has(l.id))

  if (missing.length > 0) {
    try {
      await sheets.appendLogs(missing)
    } catch {
      return remoteLogs // retry next pull, don't mark as merged yet
    }
  }
  await db.setMeta('historyMergedFor', currentId)
  return missing.length > 0 ? [...remoteLogs, ...missing] : remoteLogs
}

/** Makes the local cache mirror the remote sheet exactly, except entries this
 * device has queued but not yet confirmed sending/deleting. */
async function reconcileLocalWithRemote(remoteLogs: LogEntry[]): Promise<void> {
  const pending = await db.getPending()
  const byId = new Map(remoteLogs.map((l) => [l.id, l]))
  for (const action of pending) {
    if (action.kind === 'append') byId.set(action.entry.id, action.entry)
    else byId.delete(action.entryId)
  }
  await db.replaceAllLogs([...byId.values()])
}

let pullInFlight: Promise<LogEntry[]> | null = null

/** Same overlapping-calls concern as flushPending — see its comment. */
export function pullRemote(): Promise<LogEntry[]> {
  if (pullInFlight) return pullInFlight
  pullInFlight = pullRemoteNow().finally(() => {
    pullInFlight = null
  })
  return pullInFlight
}

async function pullRemoteNow(): Promise<LogEntry[]> {
  if (!navigator.onLine || !isSignedIn()) return db.getAllLogs()

  await setState({ status: 'syncing' })
  try {
    const [remoteLogs, config] = await Promise.all([sheets.getLogs(), sheets.getConfig()])
    const effectiveRemote = await mergeLocalHistoryOnce(remoteLogs)
    await reconcileLocalWithRemote(effectiveRemote)
    await db.setCachedConfig(config)
    await setState({ status: 'idle' })
    notifyDataChanged()
    return db.getAllLogs()
  } catch {
    await setState({ status: 'error' })
    return db.getAllLogs()
  }
}

async function syncOnly(): Promise<void> {
  // No automatic token renewal here, ever — GIS's "silent" prompt: 'none'
  // isn't reliably silent in every browser/cookie configuration, and any
  // automatic call risked flashing a real popup at an arbitrary moment while
  // the tab sat idle in the background. Sessions now simply expire after
  // their natural ~1hr and require one deliberate click to continue — no
  // surprise windows, ever, at the cost of not lasting indefinitely.
  recheckSignedIn() // no network call — just re-broadcasts current expiry state so the UI updates promptly
  await flushPending()
  await pullRemote()
}

export function startBackgroundSync(intervalMs = 60_000): () => void {
  const run = () => void syncOnly()
  const onVisible = () => {
    if (document.visibilityState === 'visible') run()
  }
  const interval = setInterval(run, intervalMs)
  window.addEventListener('online', run)
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    clearInterval(interval)
    window.removeEventListener('online', run)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
