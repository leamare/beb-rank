import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as db from '../db/localDb'
import * as auth from '../auth/googleAuth'
import * as sheets from '../sheets/sheetsClient'
import * as sync from '../sync/syncEngine'
import { DEFAULT_CATEGORIES, type Category, type CategoryKey } from '../domain/categories'
import type { LogEntry } from '../domain/log'
import { todayKey } from '../domain/log'
import { signedDelta, type MagnitudeType } from '../domain/points'

type AuthStatus = 'checking' | 'signedOut' | 'signedIn' | 'guest'

const GUEST_FLAG = 'bmc_guest'

interface AppState {
  authStatus: AuthStatus
  categories: Category[]
  logs: LogEntry[]
  syncStatus: sync.SyncStatus
  pendingCount: number
  sheetUrl: string | null
  signIn: () => Promise<void>
  continueAsGuest: () => void
  signOut: () => void
  addLog: (category: CategoryKey, type: MagnitudeType, sign: 1 | -1, reason: string) => Promise<void>
  removeLog: (id: string) => Promise<void>
  updateCategories: (updated: Category[]) => Promise<void>
  switchSheet: (idOrUrl: string) => Promise<void>
  resetDatabase: () => Promise<void>
}

function extractSpreadsheetId(idOrUrl: string): string {
  const match = idOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : idOrUrl.trim()
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [syncStatus, setSyncStatus] = useState<sync.SyncStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)
  const [sheetUrl, setSheetUrl] = useState<string | null>(sheets.getSpreadsheetUrl())

  const refreshFromLocal = useCallback(async () => {
    const [cachedLogs, cachedConfig] = await Promise.all([db.getAllLogs(), db.getCachedConfig()])
    setLogs(cachedLogs)
    if (cachedConfig?.length) setCategories(cachedConfig)
  }, [])

  const connectSheet = useCallback(async () => {
    await sheets.connect()
    setSheetUrl(sheets.getSpreadsheetUrl())
    await sync.pullRemote()
    await refreshFromLocal()
  }, [refreshFromLocal])

  useEffect(() => {
    const unsub = sync.onSyncChange((s) => {
      setSyncStatus(s.status)
      setPendingCount(s.pendingCount)
    })
    return unsub
  }, [])

  useEffect(() => {
    // Catches a token going bad mid-session (e.g. a stale token missing a
    // scope added after it was issued) — bounces back to the sign-in gate
    // instead of leaving the app stuck showing a signed-in shell with no data.
    const unsub = auth.onAuthChange((signedIn) => {
      if (!signedIn) setAuthStatus((prev) => (prev === 'signedIn' ? 'signedOut' : prev))
    })
    return unsub
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      await refreshFromLocal()

      if (localStorage.getItem(GUEST_FLAG) === 'true') {
        if (!cancelled) setAuthStatus('guest')
        return
      }
      if (auth.isSignedIn()) {
        setAuthStatus('signedIn')
        try {
          await connectSheet()
        } catch (err) {
          console.error('connectSheet failed', err)
        }
      } else {
        setAuthStatus('signedOut')
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [refreshFromLocal, connectSheet])

  useEffect(() => {
    if (authStatus !== 'signedIn') return
    const stop = sync.startBackgroundSync()
    return stop
  }, [authStatus])

  const signIn = useCallback(async () => {
    await auth.signIn()
    localStorage.removeItem(GUEST_FLAG)
    setAuthStatus('signedIn')
    await connectSheet()
  }, [connectSheet])

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_FLAG, 'true')
    setAuthStatus('guest')
  }, [])

  const signOut = useCallback(() => {
    auth.signOut()
    localStorage.removeItem(GUEST_FLAG)
    setAuthStatus('signedOut')
  }, [])

  const addLog = useCallback(
    async (category: CategoryKey, type: MagnitudeType, sign: 1 | -1, reason: string) => {
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        date: todayKey(),
        category,
        type,
        delta: signedDelta(type, sign),
        reason,
      }
      await sync.logPoint(entry)
      await refreshFromLocal()
    },
    [refreshFromLocal],
  )

  const removeLog = useCallback(
    async (id: string) => {
      await sync.deleteLog(id)
      await refreshFromLocal()
    },
    [refreshFromLocal],
  )

  const updateCategories = useCallback(
    async (updated: Category[]) => {
      setCategories(updated)
      await db.setCachedConfig(updated)
      if (authStatus === 'signedIn') {
        await sheets.updateConfig(updated)
      }
    },
    [authStatus],
  )

  const switchSheet = useCallback(
    async (idOrUrl: string) => {
      const id = extractSpreadsheetId(idOrUrl)
      await sheets.switchToSpreadsheet(id)
      setSheetUrl(sheets.getSpreadsheetUrl())
      await sync.pullRemote()
      await refreshFromLocal()
    },
    [refreshFromLocal],
  )

  const resetDatabase = useCallback(async () => {
    await db.clearAllLogs()
    setLogs([])
    if (authStatus === 'signedIn') {
      await sheets.clearLogs()
    }
  }, [authStatus])

  const value = useMemo<AppState>(
    () => ({
      authStatus,
      categories,
      logs,
      syncStatus,
      pendingCount,
      sheetUrl,
      signIn,
      continueAsGuest,
      signOut,
      addLog,
      removeLog,
      updateCategories,
      switchSheet,
      resetDatabase,
    }),
    [
      authStatus,
      categories,
      logs,
      syncStatus,
      pendingCount,
      sheetUrl,
      signIn,
      continueAsGuest,
      signOut,
      addLog,
      removeLog,
      updateCategories,
      switchSheet,
      resetDatabase,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
