const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const STORAGE_KEY = 'bmc_token'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void
          }): { requestAccessToken: (opts?: { prompt?: string }) => void }
          revoke: (token: string, done: () => void) => void
        }
      }
    }
  }
}

interface TokenState {
  accessToken: string
  expiresAt: number
}

function loadPersistedToken(): TokenState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TokenState
    return parsed.expiresAt > Date.now() ? parsed : null
  } catch {
    return null
  }
}

function persistToken(state: TokenState | null): void {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  else localStorage.removeItem(STORAGE_KEY)
}

let tokenState: TokenState | null = loadPersistedToken()
let tokenClient: ReturnType<NonNullable<Window['google']>['accounts']['oauth2']['initTokenClient']> | null = null
let gisLoadPromise: Promise<void> | null = null

const listeners = new Set<(signedIn: boolean) => void>()

export function onAuthChange(cb: (signedIn: boolean) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function notify() {
  for (const cb of listeners) cb(isSignedIn())
}

function loadGis(): Promise<void> {
  if (gisLoadPromise) return gisLoadPromise
  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
  return gisLoadPromise
}

async function ensureTokenClient() {
  await loadGis()
  if (!tokenClient) {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: () => {},
    })
  }
  return tokenClient
}

export function isSignedIn(): boolean {
  return !!tokenState && tokenState.expiresAt > Date.now()
}

export function getAccessToken(): string | null {
  return isSignedIn() ? tokenState!.accessToken : null
}

/**
 * interactive=true may show Google UI if a session/consent isn't already
 * present (prompt: ''); interactive=false never shows UI and just fails if
 * a silent refresh isn't possible (prompt: 'none').
 */
export async function signIn(interactive = true): Promise<string> {
  await ensureTokenClient()
  return new Promise((resolve, reject) => {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? 'sign-in failed'))
          return
        }
        tokenState = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 - 30_000,
        }
        persistToken(tokenState)
        notify()
        resolve(resp.access_token)
      },
    })
    tokenClient.requestAccessToken({ prompt: interactive ? '' : 'none' })
  })
}

export async function trySilentSignIn(): Promise<boolean> {
  if (isSignedIn()) return true
  try {
    await signIn(false)
    return true
  } catch {
    return false
  }
}

export async function ensureFreshToken(): Promise<string> {
  if (isSignedIn()) return tokenState!.accessToken
  return signIn(false)
}

export function signOut(): void {
  const token = tokenState?.accessToken
  tokenState = null
  persistToken(null)
  notify()
  if (token && window.google) {
    window.google.accounts.oauth2.revoke(token, () => {})
  }
}
