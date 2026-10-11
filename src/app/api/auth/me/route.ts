import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeedAccounts, validateSession, extractBearerToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await ensureSeedAccounts()
  const token = extractBearerToken(req)
  const sessionUser = await validateSession(token)

  if (!sessionUser) {
    return NextResponse.json(
      { ok: false, authenticated: false },
      { status: 401 }
    )
  }

  // Count other active sessions for this account (for the dashboard widget).
  const activeSessions = await db.session.count({
    where: {
      accountId: sessionUser.id,
      expiresAt: { gt: new Date() },
    },
  })

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: sessionUser,
    activeSessions,
  })
}
