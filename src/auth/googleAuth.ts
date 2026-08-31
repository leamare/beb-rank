const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.appdata'
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
 * Must be called from a real user gesture (click) — Google's token popup/
 * iframe can be silently blocked by the browser otherwise, leaving the
 * returned promise pending forever with no callback ever firing.
 */
export async function signIn(): Promise<string> {
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
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

/**
 * No network/GIS call — just checks the persisted access token. There is no
 * way to auto-renew from cold storage: GIS's token client never hands out a
 * refresh token (those must stay on a confidential backend), so if the
 * ~1hr access token has already expired the only path back is signIn().
 * silentRenew() below covers the common case (renewing *before* it expires,
 * while the app is open) so this cold-expiry path is rarely hit in practice.
 */
export async function ensureFreshToken(): Promise<string> {
  if (isSignedIn()) return tokenState!.accessToken
  throw new Error('Not signed in')
}

export function msUntilExpiry(): number {
  return tokenState ? tokenState.expiresAt - Date.now() : -Infinity
}

let renewing: Promise<boolean> | null = null

/**
 * Renews the token before it expires, while the app is open — unlike a cold
 * boot, prompt: 'none' here is guaranteed non-interactive (silent hidden
 * iframe, fails fast) rather than potentially-interactive, so it can't hang
 * or flash a popup the way an automatic '' prompt could. Guarded by a
 * timeout as a last-resort safety net regardless.
 */
export async function silentRenew(): Promise<boolean> {
  if (renewing) return renewing
  renewing = (async () => {
    try {
      await ensureTokenClient()
      const result = await Promise.race([
        new Promise<boolean>((resolve) => {
          tokenClient = window.google!.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPE,
            callback: (resp) => {
              if (resp.error || !resp.access_token) {
                resolve(false)
                return
              }
              tokenState = {
                accessToken: resp.access_token,
                expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 - 30_000,
              }
              persistToken(tokenState)
              notify()
              resolve(true)
            },
          })
          tokenClient.requestAccessToken({ prompt: 'none' })
        }),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8_000)),
      ])
      return result
    } catch {
      return false
    }
  })()
  try {
    return await renewing
  } finally {
    renewing = null
  }
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
