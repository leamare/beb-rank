import * as db from '../db/localDb'
import * as sheets from '../sheets/sheetsClient'
import { isSignedIn, msUntilExpiry, silentRenew } from '../auth/googleAuth'
import type { LogEntry } from '../domain/log'

const RENEW_BEFORE_MS = 10 * 60 * 1000

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
  await db.enqueuePending({ id: `del-${id}-${Date.now()}`, kind: 'delete', entryId: id, createdAt: Date.now() })
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
  const ordered = [...pending].sort((a, b) => a.createdAt - b.createdAt)
  for (const action of ordered) {
    try {
      if (action.kind === 'append') {
        await sheets.appendLog(action.entry)
      } else {
        await sheets.deleteLogRemote(action.entryId)
      }
      await db.removePending(action.id)
    } catch {
      await setState({ status: 'error' })
      await refreshPendingCount()
      return
    }
  }
  await setState({ status: 'idle' })
  await refreshPendingCount()
}

/**
 * Pushes local entries the remote sheet doesn't have yet, beyond whatever's
 * still in the pending queue. Needed because "pending" only tracks entries
 * this device hasn't confirmed sending — it says nothing about entries this
 * device already sent to a *different* sheet before switching (e.g. two
 * devices that each had their own sheet before reconnecting to a shared
 * one). Without this, those entries stay stuck local-only forever.
 */
async function pushLocalOnly(remoteLogs: LogEntry[]): Promise<void> {
  const remoteIds = new Set(remoteLogs.map((l) => l.id))
  const pending = await db.getPending()
  const pendingIds = new Set(pending.map((p) => (p.kind === 'append' ? p.entry.id : p.entryId)))
  const localLogs = await db.getAllLogs()
  const missing = localLogs.filter((l) => !remoteIds.has(l.id) && !pendingIds.has(l.id))

  for (const entry of missing) {
    try {
      await sheets.appendLog(entry)
    } catch {
      // leave it for the next reconciliation pass
    }
  }
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
    const [logs, config] = await Promise.all([sheets.getLogs(), sheets.getConfig()])
    await db.putLogs(logs)
    await db.setCachedConfig(config)
    await pushLocalOnly(logs)
    await setState({ status: 'idle' })
    return db.getAllLogs()
  } catch {
    await setState({ status: 'error' })
    return db.getAllLogs()
  }
}

async function tick(): Promise<void> {
  if (navigator.onLine && isSignedIn() && msUntilExpiry() < RENEW_BEFORE_MS) {
    await silentRenew()
  }
  await flushPending()
  await pullRemote()
}

export function startBackgroundSync(intervalMs = 60_000): () => void {
  const run = () => void tick()
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
