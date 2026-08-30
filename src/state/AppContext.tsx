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
  signIn: () => Promise<void>
  continueAsGuest: () => void
  signOut: () => void
  addLog: (category: CategoryKey, type: MagnitudeType, sign: 1 | -1, reason: string) => Promise<void>
  removeLog: (id: string) => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [syncStatus, setSyncStatus] = useState<sync.SyncStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)

  const refreshFromLocal = useCallback(async () => {
    const [cachedLogs, cachedConfig] = await Promise.all([db.getAllLogs(), db.getCachedConfig()])
    setLogs(cachedLogs)
    if (cachedConfig?.length) setCategories(cachedConfig)
  }, [])

  useEffect(() => {
    const unsub = sync.onSyncChange((s) => {
      setSyncStatus(s.status)
      setPendingCount(s.pendingCount)
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
      const signedIn = await auth.trySilentSignIn()
      if (cancelled) return
      if (signedIn) {
        setAuthStatus('signedIn')
        await sheets.ensureStructure()
        await sync.pullRemote()
        await refreshFromLocal()
      } else {
        setAuthStatus('signedOut')
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [refreshFromLocal])

  useEffect(() => {
    if (authStatus !== 'signedIn') return
    const stop = sync.startBackgroundSync()
    return stop
  }, [authStatus])

  const signIn = useCallback(async () => {
    await auth.signIn(true)
    localStorage.removeItem(GUEST_FLAG)
    setAuthStatus('signedIn')
    await sheets.ensureStructure()
    await sync.pullRemote()
    await refreshFromLocal()
  }, [refreshFromLocal])

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

  const value = useMemo<AppState>(
    () => ({
      authStatus,
      categories,
      logs,
      syncStatus,
      pendingCount,
      signIn,
      continueAsGuest,
      signOut,
      addLog,
      removeLog,
    }),
    [authStatus, categories, logs, syncStatus, pendingCount, signIn, continueAsGuest, signOut, addLog, removeLog],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
