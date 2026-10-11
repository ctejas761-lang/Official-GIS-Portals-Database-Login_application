import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  ensureSeedAccounts,
  verifyPassword,
  createSession,
  getClientIp,
} from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Make sure demo accounts exist on first run.
    await ensureSeedAccounts()

    const body = await req.json().catch(() => null)
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!userId || !password) {
      return NextResponse.json(
        { ok: false, error: 'Please provide both your ID and password.' },
        { status: 400 }
      )
    }
    if (userId.length > 64 || password.length > 256) {
      return NextResponse.json(
        { ok: false, error: 'Input too long.' },
        { status: 400 }
      )
    }

    const account = await db.account.findUnique({
      where: { userId: userId.toLowerCase() },
    })

    // Generic error to avoid user enumeration.
    if (!account) {
      return NextResponse.json(
        { ok: false, error: 'Invalid ID or password.' },
        { status: 401 }
      )
    }

    const valid = verifyPassword(
      password,
      account.passwordHash,
      account.passwordSalt
    )
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: 'Invalid ID or password.' },
        { status: 401 }
      )
    }

    const { token, expiresAt } = await createSession({
      accountId: account.id,
      userAgent: req.headers.get('user-agent'),
      ip: getClientIp(req),
    })

    return NextResponse.json({
      ok: true,
      token,
      user: {
        id: account.id,
        userId: account.userId,
        displayName: account.displayName,
        email: account.email,
        role: account.role,
        avatarColor: account.avatarColor,
        createdAt: account.createdAt.toISOString(),
      },
      expiresAt: expiresAt.toISOString(),
    })
  } catch (err) {
    console.error('[auth/login] error', err)
    return NextResponse.json(
      { ok: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// Convenience: GET seeds the demo accounts without exposing data.
export async function GET() {
  await ensureSeedAccounts()
  return NextResponse.json({ ok: true, seeded: true })
}
