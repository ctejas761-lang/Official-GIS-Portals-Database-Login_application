import { NextRequest, NextResponse } from 'next/server'
import { destroySession, extractBearerToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const token = extractBearerToken(req)
  await destroySession(token)
  return NextResponse.json({ ok: true })
}
