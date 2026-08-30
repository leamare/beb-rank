import { useApp } from '../state/AppContext'

export function AuthGate() {
  const { signIn, continueAsGuest } = useApp()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#f9f9f7] px-6 text-center dark:bg-[#0d0d0d]">
      <div className="text-5xl">🍼</div>
      <div>
        <h1 className="text-xl font-semibold text-[#0b0b0b] dark:text-white">Baby Management Counter</h1>
        <p className="mt-1 text-sm text-[#52514e] dark:text-[#c3c2b7]">
          Sign in to sync your log with Google Sheets, or continue locally.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => void signIn()}
          className="rounded-xl bg-[#2a78d6] px-4 py-3 font-medium text-white active:opacity-80"
        >
          Sign in with Google
        </button>
        <button
          onClick={continueAsGuest}
          className="rounded-xl border border-[#c3c2b7] px-4 py-3 font-medium text-[#52514e] active:opacity-80 dark:text-[#c3c2b7]"
        >
          Continue without sync
        </button>
      </div>
    </div>
  )
}
