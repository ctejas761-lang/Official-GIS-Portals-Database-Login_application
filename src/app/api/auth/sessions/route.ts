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
      { ok: false, error: 'Not authenticated' },
      { status: 401 }
    )
  }

  const now = new Date()
  const sessions = await db.session.findMany({
    where: {
      accountId: sessionUser.id,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({
    ok: true,
    currentSessionId: sessionUser.sessionId,
    sessions: sessions.map((s) => ({
      id: s.id,
      isCurrent: s.id === sessionUser.sessionId,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      userAgent: s.userAgent,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  const token = extractBearerToken(req)
  const sessionUser = await validateSession(token)
  if (!sessionUser) {
    return NextResponse.json(
      { ok: false, error: 'Not authenticated' },
      { status: 401 }
    )
  }

  const url = new URL(req.url)
  const targetId = url.searchParams.get('id')

  if (targetId) {
    // revoke a specific session owned by this account
    await db.session
      .deleteMany({ where: { id: targetId, accountId: sessionUser.id } })
      .catch(() => {})
  } else {
    // revoke all other sessions
    await db.session
      .deleteMany({
        where: {
          accountId: sessionUser.id,
          NOT: { id: sessionUser.sessionId },
        },
      })
      .catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
