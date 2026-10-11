/**
 * Tab-scoped session token storage.
 *
 * We deliberately use `sessionStorage` (NOT localStorage and NOT cookies):
 *  - `sessionStorage` is scoped to a single browser tab.
 *  - Opening a brand-new tab and pasting the URL produces an EMPTY store,
 *    so the app asks the user to log in again — exactly the requested
 *    behaviour ("copy the URL and paste in new tab then also ask for login").
 *
 * Note: duplicating a tab (browser "duplicate" action) does copy sessionStorage
 * by spec, which is expected — the duplicate continues the same session.
 */

const TOKEN_KEY = 'zai_session_token'
const USER_KEY = 'zai_session_user'
const SETTLED_KEY = 'zai_session_settled_at'

export type SafeUser = {
  id: string
  userId: string
  displayName: string
  email: string | null
  role: string
  avatarColor: string
  createdAt: string
}

function ss(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return ss()?.getItem(TOKEN_KEY) ?? null
}

export function setSession(token: string, user: SafeUser): void {
  const store = ss()
  if (!store) return
  store.setItem(TOKEN_KEY, token)
  store.setItem(USER_KEY, JSON.stringify(user))
  store.setItem(SETTLED_KEY, String(Date.now()))
  // Notify same-tab listeners (e.g. if login happens in a modal).
  window.dispatchEvent(new Event('zai-session-change'))
}

export function clearSession(): void {
  const store = ss()
  if (!store) return
  store.removeItem(TOKEN_KEY)
  store.removeItem(USER_KEY)
  store.removeItem(SETTLED_KEY)
  window.dispatchEvent(new Event('zai-session-change'))
}

export function getCachedUser(): SafeUser | null {
  const store = ss()
  if (!store) return null
  const raw = store.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SafeUser
  } catch {
    return null
  }
}

export function authHeader(token: string | null): HeadersInit {
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/** Small helper to build an absolute API URL from a relative path. */
export function apiUrl(path: string): string {
  return path
}
