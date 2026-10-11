'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  Loader2,
  ShieldCheck,
  Fingerprint,
  ArrowRight,
  RefreshCw,
  TreePine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface AuthResult {
  token: string
  user: {
    id: string
    userId: string
    displayName: string
    email: string | null
    role: string
    avatarColor: string
    createdAt: string
  }
  expiresAt: string
}

interface LoginFormProps {
  onSuccess: (result: AuthResult) => void
  className?: string
}

export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userIdRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    userIdRef.current?.focus()
  }, [])

  function clearError() {
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setError(data?.error || 'Unable to continue. Please try again.')
        setLoading(false)
        return
      }
      onSuccess(data as AuthResult)
    } catch {
      setError('Network error. Check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      {/* ===== Card ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-15px_rgba(139,26,26,0.25)] ring-1 ring-black/5"
      >
        {/* top accent bar (maroon → teal) */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#8B1A1A] via-[#a02828] to-[#0D7377]" />

        <div className="px-7 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-8">
          {/* ===== Logo ===== */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 14 }}
              className="relative"
            >
              {/* soft ring behind logo */}
              <div className="absolute inset-0 -z-0 scale-110 rounded-full bg-gradient-to-br from-[#8B1A1A]/10 to-[#0D7377]/10 blur-md" />
              <div className="relative size-24 overflow-hidden rounded-full ring-4 ring-white shadow-lg sm:size-28">
                <img
                  src="/Maha_Logo.jpeg"
                  alt="Maharashtra Forest Department logo"
                  className="size-full object-cover"
                />
              </div>
            </motion.div>

            {/* ===== Heading ===== */}
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-center text-2xl font-bold tracking-tight text-[#8B1A1A] sm:text-3xl"
            >
              Gondia Forest Division
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
              className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#0D7377]"
            >
              <TreePine className="size-3.5" />
              <span>GIS Portal · Maharashtra Forest Department</span>
            </motion.div>
          </div>

          {/* ===== Form ===== */}
          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
            noValidate
          >
              {/* Username */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="auth-userid"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-700"
                >
                  Username
                </Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8B1A1A]" />
                  <Input
                    id="auth-userid"
                    ref={userIdRef}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="Enter your username"
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value)
                      clearError()
                    }}
                    className="h-12 rounded-full border-[#8B1A1A]/40 bg-white pl-11 pr-4 text-sm text-gray-800 placeholder:italic placeholder:text-gray-400 focus-visible:border-[#8B1A1A] focus-visible:ring-[#8B1A1A]/20"
                    maxLength={32}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="auth-password"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-700"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8B1A1A]" />
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      clearError()
                    }}
                    className="h-12 rounded-full border-[#8B1A1A]/40 bg-white pl-11 pr-12 text-sm text-gray-800 placeholder:italic placeholder:text-gray-400 focus-visible:border-[#8B1A1A] focus-visible:ring-[#8B1A1A]/20"
                    maxLength={256}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:text-[#8B1A1A]"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="alert"
                    className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
                  >
                    <span className="mt-0.5 shrink-0 font-bold">!</span>
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign in button — maroon → teal gradient */}
              <Button
                type="submit"
                disabled={loading || !userId || !password}
                className="group relative mt-1 h-12 w-full overflow-hidden rounded-full text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background:
                    'linear-gradient(90deg, #8B1A1A 0%, #9c2424 45%, #0D7377 100%)',
                }}
                size="lg"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-700 group-hover:translate-x-full" />
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
          </form>
        </div>
      </motion.div>

      {/* Trust footer (below card) */}
      <div className="mt-6 flex items-center justify-center gap-5 text-[11px] text-gray-400">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="size-3.5" /> scrypt hashed
        </span>
        <span className="inline-flex items-center gap-1">
          <Fingerprint className="size-3.5" /> tab-only session
        </span>
      </div>
    </div>
  )
}

function colorHex(name: string): string {
  switch (name) {
    case 'emerald':
      return '#10b981'
    case 'violet':
      return '#8b5cf6'
    case 'amber':
      return '#f59e0b'
    case 'rose':
      return '#f43f5e'
    case 'sky':
      return '#0ea5e9'
    case 'teal':
      return '#14b8a6'
    default:
      return '#64748b'
  }
}

export { colorHex }

// re-export for refresh button icon usage
export function ReloadHint() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <RefreshCw className="size-3.5" /> Reload after switching
    </span>
  )
}
