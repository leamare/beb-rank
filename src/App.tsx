import { AppProvider, useApp } from './state/AppContext'
import { AuthGate } from './components/AuthGate'
import { SyncStatusBadge } from './components/SyncStatusBadge'
import { MainTab } from './components/tabs/MainTab'
import { LogTab } from './components/tabs/LogTab'
import { DynamicsTab } from './components/tabs/DynamicsTab'
import { useHashRoute, type Tab } from './hooks/useHashRoute'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'main', label: 'Main', emoji: '🏠' },
  { key: 'log', label: 'Log', emoji: '📋' },
  { key: 'dynamics', label: 'Dynamics', emoji: '📈' },
]

function Shell() {
  const { authStatus, sheetUrl, signOut } = useApp()
  const [tab, navigate] = useHashRoute()

  if (authStatus === 'checking') {
    return <div className="flex min-h-dvh items-center justify-center text-muted">Loading…</div>
  }

  if (authStatus === 'signedOut') {
    return <AuthGate />
  }

  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-ink">🍼 Baby Management</h1>
        <div className="flex items-center gap-3">
          {sheetUrl && (
            <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-xs text-muted underline hover:text-ink-soft">
              Open Sheet
            </a>
          )}
          <SyncStatusBadge />
          <button onClick={signOut} className="text-xs text-muted underline hover:text-ink-soft">
            {authStatus === 'guest' ? 'Sign in' : 'Sign out'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-16">
        {tab === 'main' && <MainTab />}
        {tab === 'log' && <LogTab />}
        {tab === 'dynamics' && <DynamicsTab />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(t.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              tab === t.key ? 'text-accent' : 'text-muted hover:text-ink-soft'
            }`}
          >
            <span className="text-lg">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

export default App
