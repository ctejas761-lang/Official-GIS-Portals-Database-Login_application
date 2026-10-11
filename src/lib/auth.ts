import crypto from 'crypto'
import { db } from './db'

/**
 * Auth library.
 *
 * Tab-specific login behaviour:
 *  - On successful login the server issues a random session token.
 *  - The client stores that token ONLY in `sessionStorage` (never localStorage
 *    and never a persistent cookie). `sessionStorage` is scoped to a single
 *    browser tab, so pasting the URL into a *new* tab yields an empty store
 *    and the app asks for login again — exactly the requested behaviour.
 *  - The server still validates the token against the `Session` table so the
 *    token cannot be forged and can expire/be revoked.
 */

const SCRYPT_KEYLEN = 64
const SESSION_TTL_MS = 1000 * 60 * 60 * 8 // 8 hours
const SESSION_CLEANUP_PROBABILITY = 0.15

/* -------------------------------------------------------------------------- */
/*  Password hashing (scrypt)                                                 */
/* -------------------------------------------------------------------------- */

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .scryptSync(password, salt, SCRYPT_KEYLEN)
    .toString('hex')
  return { hash, salt }
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string
): boolean {
  const candidate = crypto
    .scryptSync(password, salt, SCRYPT_KEYLEN)
    .toString('hex')
  // timing-safe compare
  const a = Buffer.from(candidate, 'hex')
  const b = Buffer.from(hash, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/* -------------------------------------------------------------------------- */
/*  Session tokens                                                            */
/* -------------------------------------------------------------------------- */

export function generateToken(): string {
  // 32 bytes of randomness -> 64 hex chars
  return crypto.randomBytes(32).toString('hex')
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

export interface SessionUser {
  id: string
  userId: string
  displayName: string
  email: string | null
  role: string
  avatarColor: string
  createdAt: string
  sessionId: string
  expiresAt: string
}

/** Lazily prune a fraction of expired sessions to keep the table tidy. */
async function maybeCleanupExpiredSessions() {
  if (Math.random() > SESSION_CLEANUP_PROBABILITY) return
  try {
    await db.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
  } catch {
    // ignore cleanup failures
  }
}

export async function createSession(opts: {
  accountId: string
  userAgent?: string | null
  ip?: string | null
}): Promise<{ token: string; expiresAt: Date }> {
  await maybeCleanupExpiredSessions()
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({
    data: {
      token,
      accountId: opts.accountId,
      expiresAt,
      userAgent: opts.userAgent?.slice(0, 500) ?? null,
      ipHash: hashIp(opts.ip ?? null),
    },
  })
  return { token, expiresAt }
}

export async function validateSession(
  token: string | undefined | null
): Promise<SessionUser | null> {
  if (!token || token.length < 16) return null
  const session = await db.session.findUnique({
    where: { token },
    include: { account: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return {
    id: session.account.id,
    userId: session.account.userId,
    displayName: session.account.displayName,
    email: session.account.email,
    role: session.account.role,
    avatarColor: session.account.avatarColor,
    createdAt: session.account.createdAt.toISOString(),
    sessionId: session.id,
    expiresAt: session.expiresAt.toISOString(),
  }
}

export async function destroySession(
  token: string | undefined | null
): Promise<void> {
  if (!token) return
  await db.session.deleteMany({ where: { token } }).catch(() => {})
}

/* -------------------------------------------------------------------------- */
/*  Bearer token extraction                                                   */
/* -------------------------------------------------------------------------- */

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  // Also accept a custom header used by the client for convenience.
  const custom = req.headers.get('x-session-token')
  if (custom) return custom.trim()
  return null
}

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return null
}

/* -------------------------------------------------------------------------- */
/*  Seeding demo accounts                                                     */
/* -------------------------------------------------------------------------- */

function getSeedAccounts() {
  const userPassword = process.env.SEED_USER_PASSWORD
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (!userPassword || !adminPassword) {
    throw new Error(
      'SEED_USER_PASSWORD and SEED_ADMIN_PASSWORD must be configured to seed accounts.'
    )
  }

  return [
    {
      userId: 'geoinfo_gondia',
      password: userPassword,
      displayName: 'Gondia User',
      email: 'geoinfo_gondia@gondiaforest.in',
      role: 'member',
      avatarColor: 'emerald',
    },
    {
      userId: 'geoinfo_admin',
      password: adminPassword,
      displayName: 'Gondia Admin',
      email: 'geoinfo_admin@gondiaforest.in',
      role: 'admin',
      avatarColor: 'violet',
    },
  ] satisfies Array<{
    userId: string
    password: string
    displayName: string
    email: string
    role: string
    avatarColor: string
  }>
}

let seedPromise: Promise<void> | null = null

export function ensureSeedAccounts(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      for (const acc of getSeedAccounts()) {
        const { hash, salt } = hashPassword(acc.password)
        // upsert: create if missing, otherwise update the password so the
        // latest seed credentials always take effect.
        await db.account.upsert({
          where: { userId: acc.userId },
          update: {
            passwordHash: hash,
            passwordSalt: salt,
            displayName: acc.displayName,
            email: acc.email,
            role: acc.role,
            avatarColor: acc.avatarColor,
          },
          create: {
            userId: acc.userId,
            passwordHash: hash,
            passwordSalt: salt,
            displayName: acc.displayName,
            email: acc.email,
            role: acc.role,
            avatarColor: acc.avatarColor,
          },
        })
      }
    })()
  }
  return seedPromise
}
