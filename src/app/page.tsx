'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Fingerprint,
  ShieldCheck,
  ExternalLink,
  Loader2,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  WifiOff,
} from 'lucide-react'
import { LoginForm, type AuthResult, colorHex } from '@/components/auth/login-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSessionGuard } from '@/hooks/use-session-guard'
import { type SafeUser } from '@/lib/session-store'

/**
 * External dashboard you have already built. It is EMBEDDED inside our app
 * (in an iframe) behind the login, so login + dashboard are connected on the
 * same URL / same flow.
 *
 * Route protection + session management:
 *   - ANY load of our `/` URL first runs the session guard, which IMMEDIATELY
 *     verifies the stored token against the backend API (`/api/auth/me`).
 *   - Nothing protected is shown until the backend confirms the session.
 *   - The session is re-verified periodically (3 min) and whenever the tab
 *     regains focus, so a revoked/expired session is kicked out.
 *   - Token lives in sessionStorage (tab-scoped) → new tab = empty store =
 *     login required again.
 */
const DASHBOARD_URL = 'https://gondiaforestdivisiongisdashboard.vercel.app/'

export default function Home() {
  const guard = useSessionGuard()

  if (guard.status === 'authed' && guard.user) {
    return (
      <EmbeddedDashboard
        user={guard.user}
        onLogout={guard.logout}
        onRevalidate={guard.revalidate}
        lastVerifiedAt={guard.lastVerifiedAt}
        reason={guard.reason}
      />
    )
  }

  if (guard.status === 'checking') {
    return <VerifyingScreen reason={guard.reason} />
  }

  return <LoginScreen onLoginSuccess={guard.login} reason={guard.reason} />
}

/* -------------------------------------------------------------------------- */
/*  Embedded dashboard — your external dashboard shown inside our app,        */
/*  behind the login. Login + dashboard are now one connected flow.           */
/* -------------------------------------------------------------------------- */

function EmbeddedDashboard({
  user,
  onLogout,
  onRevalidate,
  lastVerifiedAt,
  reason,
}: {
  user: SafeUser
  onLogout: () => void
  onRevalidate: () => void
  lastVerifiedAt: number | null
  reason: string | null
}) {
  const [iframeState, setIframeState] = useState<'loading' | 'loaded' | 'blocked'>('loading')
  const [barVisible, setBarVisible] = useState(true)

  // Detect if the iframe refuses to load (X-Frame-Options / CSP) — after a
  // timeout we surface a friendly fallback with an "Open in new tab" button.
  useEffect(() => {
    if (iframeState !== 'loading') return
    const t = setTimeout(() => {
      setIframeState((s) => (s === 'loading' ? 'blocked' : s))
    }, 8000)
    return () => clearTimeout(t)
  }, [iframeState])

  const initials =
    user.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || user.userId.slice(0, 2).toUpperCase()

  const offline = reason?.startsWith('Offline')

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top auth bar — connects the login to the dashboard */}
      <header
        className={cnBar(
          'z-50 flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-foreground px-3 text-background transition-all sm:px-4',
          barVisible ? 'h-12' : 'h-0 overflow-hidden border-0 py-0'
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500">
            <Fingerprint className="size-4 text-white" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-semibold sm:text-sm">
              Sentinel · Gondia GIS Dashboard
            </div>
            <div className="hidden truncate text-[10px] text-background/70 sm:block">
              Signed in as {user.displayName} · tab-scoped session
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Protected + verified indicator */}
          <Badge
            className={cnBar(
              'hidden items-center gap-1.5 border-background/20 bg-background/10 text-background md:inline-flex',
              offline && 'border-amber-400/40 bg-amber-500/15 text-amber-200'
            )}
            title={
              lastVerifiedAt
                ? `Session verified ${timeAgo(lastVerifiedAt)}`
                : 'Session verified'
            }
          >
            {offline ? (
              <>
                <WifiOff className="size-3" /> Offline mode
              </>
            ) : (
              <>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                Protected · verified
              </>
            )}
          </Badge>
          <button
            onClick={onRevalidate}
            aria-label="Re-verify session"
            title="Re-verify session now"
            className="hidden size-7 items-center justify-center rounded-md text-background/80 transition-colors hover:bg-background/10 hover:text-background sm:inline-flex"
          >
            <RefreshCw className="size-3.5" />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-background/20 bg-background/10 py-1 pl-1 pr-2.5">
            <span
              className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: colorHex(user.avatarColor) }}
            >
              {initials}
            </span>
            <span className="hidden text-xs font-medium sm:inline">@{user.userId}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="h-8 gap-1.5 text-background hover:bg-background/15"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
          <button
            onClick={() => setBarVisible(false)}
            aria-label="Hide bar"
            className="hidden size-8 items-center justify-center rounded-md text-background/70 transition-colors hover:bg-background/10 hover:text-background lg:inline-flex"
          >
            <EyeOff className="size-4" />
          </button>
        </div>
      </header>

      {/* If the bar is hidden, show a small floating "show" button */}
      {!barVisible && (
        <button
          onClick={() => setBarVisible(true)}
          aria-label="Show bar"
          className="fixed right-3 top-3 z-50 inline-flex size-9 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105"
        >
          <Eye className="size-4" />
        </button>
      )}

      {/* Dashboard area */}
      <div className="relative min-h-0 flex-1 bg-muted">
        {iframeState === 'loading' && <IframeLoading />}
        {iframeState === 'blocked' && (
          <IframeBlocked onRetry={() => setIframeState('loading')} />
        )}

        <iframe
          src={DASHBOARD_URL}
          title="Gondia Forest Division GIS Dashboard"
          className={cnBar(
            'absolute inset-0 size-full border-0 transition-opacity duration-300',
            iframeState === 'loaded' ? 'opacity-100' : 'opacity-0',
            iframeState === 'blocked' && 'hidden'
          )}
          onLoad={() => setIframeState('loaded')}
          referrerPolicy="no-referrer-when-downgrade"
          allow="fullscreen; geolocation"
        />
      </div>

      {/* Sticky footer */}
      <footer className="z-50 flex shrink-0 items-center justify-between gap-2 border-t border-border/60 bg-background px-4 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-600" /> Route protected · session
          {lastVerifiedAt ? ` verified ${timeAgo(lastVerifiedAt)}` : ' verified'}
        </span>
        <span className="hidden sm:inline">
          New tab with this URL → login again (tab-scoped)
        </span>
      </footer>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Verifying screen — shown while the backend confirms the session.          */
/*  This is the "immediate check on paste" gate.                              */
/* -------------------------------------------------------------------------- */

function VerifyingScreen({ reason }: { reason: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-emerald-500/5 px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-8 text-center shadow-xl"
      >
        <div className="relative mx-auto flex size-14 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-2xl bg-emerald-500/15"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <ShieldAlert className="size-7 text-emerald-600" />
        </div>
        <h1 className="mt-5 text-lg font-semibold tracking-tight">
          Verifying your session
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Checking your login against the backend before opening the dashboard…
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          <span className="font-mono">GET /api/auth/me</span>
        </div>
        {reason && (
          <p className="mt-4 rounded-lg border border-border/60 bg-muted/50 p-2 text-[11px] text-muted-foreground">
            {reason}
          </p>
        )}
      </motion.div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Iframe helpers                                                             */
/* -------------------------------------------------------------------------- */

function IframeLoading() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-muted">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="relative flex size-12 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-2xl bg-emerald-500/15"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Loader2 className="size-6 animate-spin text-emerald-600" />
        </div>
        <div className="text-sm font-medium text-foreground">Loading dashboard…</div>
        <div className="max-w-xs text-center text-xs text-muted-foreground">
          Connecting your verified session to the Gondia Forest Division GIS Dashboard.
        </div>
      </motion.div>
    </div>
  )
}

function IframeBlocked({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-xl"
      >
        <div className="mb-3 flex items-center gap-2 text-amber-600">
          <AlertTriangle className="size-5" />
          <span className="text-sm font-semibold">Embedded view unavailable</span>
        </div>
        <p className="text-sm text-muted-foreground">
          The dashboard site does not allow being embedded in an iframe
          (it sends an <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">X-Frame-Options</code>{' '}
          or CSP header). You can still open it in a new tab — your login
          session stays valid in this tab.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm" className="gap-1.5">
            <a href={DASHBOARD_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Open dashboard in new tab
            </a>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onRetry}>
            <RefreshCw className="size-4" /> Try embedding again
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Login screen (split layout)                                               */
/* -------------------------------------------------------------------------- */

function LoginScreen({
  onLoginSuccess,
  reason,
}: {
  onLoginSuccess: (result: AuthResult) => void
  reason: string | null
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F0F2F5] px-5 py-10">
      {/* subtle decorative blobs */}
      <div className="pointer-events-none absolute -left-20 top-10 size-64 rounded-full bg-[#8B1A1A]/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 size-72 rounded-full bg-[#0D7377]/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {reason && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm"
            role="status"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>{reason}</span>
          </motion.div>
        )}
        <LoginForm onSuccess={onLoginSuccess} />
      </div>

      {/* footer */}
      <footer className="relative z-10 mt-8 text-center text-xs text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <Fingerprint className="size-3.5" /> Sentinel · Tab-scoped authentication
        </span>
      </footer>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  helpers                                                                   */
/* -------------------------------------------------------------------------- */

function cnBar(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function timeAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms)
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}
