import { useApp } from '../state/AppContext'

export function AuthGate() {
  const { signIn, continueAsGuest } = useApp()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-app px-6 text-center">
      <div className="text-5xl">🍼</div>
      <div>
        <h1 className="text-xl font-semibold text-ink">Baby Management Counter</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Sign in to sync your log with Google Sheets, or continue locally.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => void signIn()}
          className="rounded-xl bg-accent px-4 py-3 font-medium text-white transition-colors hover:bg-accent-soft active:opacity-80"
        >
          Sign in with Google
        </button>
        <button
          onClick={continueAsGuest}
          className="rounded-xl border border-border px-4 py-3 font-medium text-ink-soft transition-colors hover:bg-surface active:opacity-80"
        >
          Continue without sync
        </button>
      </div>
    </div>
  )
}
