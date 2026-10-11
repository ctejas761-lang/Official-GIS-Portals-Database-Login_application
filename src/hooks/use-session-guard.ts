'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getToken,
  setSession,
  clearSession,
  getCachedUser,
  type SafeUser,
} from '@/lib/session-store'
import { type AuthResult } from '@/components/auth/login-form'

/**
 * Session guard.
 *
 * Route protection + session management:
 *  - On every mount / paste, IMMEDIATELY verify the stored token against the
 *    backend API (`/api/auth/me`). Nothing protected is shown until the
 *    backend confirms the session is valid.
 *  - Re-validate periodically (default 3 min) to catch revoked/expired
 *    sessions.
 *  - Re-validate when the tab regains focus (user pasted, switched back, etc.).
 *  - If the backend says 401 / invalid → clear the token and force the
 *    login screen.
 *
 * The token lives in `sessionStorage` (tab-scoped) so a brand-new tab still
 * has an empty store and must log in again — combined with server-side
 * validation this gives both route protection AND per-tab isolation.
 */

export type GuardStatus = 'checking' | 'authed' | 'unauthed'

export interface GuardState {
  status: GuardStatus
  user: SafeUser | null
  expiresAt: string | null
  /** human-readable reason for the last unauth state, if any */
  reason: string | null
  /** timestamp (ms) of the last successful backend verification */
  lastVerifiedAt: number | null
  revalidate: () => void
  login: (result: AuthResult) => void
  logout: () => Promise<void>
}

const REVALIDATE_INTERVAL_MS = 1000 * 60 * 3 // 3 minutes
const FOCUS_DEBOUNCE_MS = 1500

export function useSessionGuard(): GuardState {
  const [status, setStatus] = useState<GuardStatus>('checking')
  const [user, setUser] = useState<SafeUser | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [lastVerifiedAt, setLastVerifiedAt] = useState<number | null>(null)

  const inFlightRef = useRef(false)
  const lastFocusCheckRef = useRef(0)

  const verify = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true

    const token = getToken()
    if (!token) {
      clearSession()
      setUser(null)
      setExpiresAt(null)
      setReason('No session token in this tab. Please sign in.')
      setStatus('unauthed')
      inFlightRef.current = false
      return
    }

    // Optimistically mark "checking" if we previously were authed (so a
    // re-validation shows a subtle verifying state instead of flashing).
    setStatus((prev) => (prev === 'authed' ? 'authed' : 'checking'))

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.ok && data.authenticated && data.user) {
        const u = data.user as SafeUser
        // refresh the cached user + keep the same token
        setSession(token, u)
        setUser(u)
        setExpiresAt(data.user.expiresAt ?? null)
        setReason(null)
        setLastVerifiedAt(Date.now())
        setStatus('authed')
      } else {
        clearSession()
        setUser(null)
        setExpiresAt(null)
        setReason('Your session is invalid or has expired. Please sign in again.')
        setStatus('unauthed')
      }
    } catch {
      // Network failure: if we have a cached user, keep them in (best-effort)
      // so a transient outage doesn't lock users out. Otherwise require login.
      const cached = getCachedUser()
      if (cached) {
        setUser(cached)
        setReason('Offline: showing last known session. Will re-verify when online.')
        setStatus('authed')
      } else {
        setUser(null)
        setExpiresAt(null)
        setReason('Unable to reach the server. Please try again.')
        setStatus('unauthed')
      }
    } finally {
      inFlightRef.current = false
    }
  }, [])

  const revalidate = useCallback(() => {
    verify()
  }, [verify])

  const login = useCallback((result: AuthResult) => {
    setSession(result.token, result.user)
    setUser(result.user)
    setExpiresAt(result.expiresAt)
    setReason(null)
    setLastVerifiedAt(Date.now())
    setStatus('authed')
  }, [])

  const logout = useCallback(async () => {
    const token = getToken()
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      /* ignore network errors on logout */
    } finally {
      clearSession()
      setUser(null)
      setExpiresAt(null)
      setReason('You have been signed out.')
      setStatus('unauthed')
    }
  }, [])

  // Initial verification on mount (and on tab focus / periodically below).
  useEffect(() => {
    verify()
  }, [verify])

  // Periodic re-validation — catches revoked/expired sessions.
  useEffect(() => {
    const t = setInterval(() => {
      verify()
    }, REVALIDATE_INTERVAL_MS)
    return () => clearInterval(t)
  }, [verify])

  // Re-validate when the tab becomes visible / regains focus.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        if (now - lastFocusCheckRef.current > FOCUS_DEBOUNCE_MS) {
          lastFocusCheckRef.current = now
          verify()
        }
      }
    }
    function onFocus() {
      const now = Date.now()
      if (now - lastFocusCheckRef.current > FOCUS_DEBOUNCE_MS) {
        lastFocusCheckRef.current = now
        verify()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [verify])

  // Cross-tab: if another tab clears/sets the session, re-verify.
  useEffect(() => {
    function onChange() {
      verify()
    }
    window.addEventListener('zai-session-change', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('zai-session-change', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [verify])

  return {
    status,
    user,
    expiresAt,
    reason,
    lastVerifiedAt,
    revalidate,
    login,
    logout,
  }
}
