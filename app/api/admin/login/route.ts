import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { initDB } from '@/lib/db-postgres'
import {
  getAdminAuth,
  verifyPassword,
  verifyTotp,
  createSession,
  recordLoginAttempt,
  isRateLimited,
  clientIdentifier,
  SESSION_COOKIE,
  SESSION_TTL_MS
} from '@/lib/adminAuth'

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const identifier = clientIdentifier(request)

    if (await isRateLimited(identifier)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    const { password, totp } = await request.json()
    const auth = await getAdminAuth()

    if (!auth) {
      // No password set up yet - the setup script (scripts/set-admin-password.mjs)
      // must be run first. Never leak whether this is the actual reason to a
      // brute-forcer, but it is safe to say for a not-yet-configured install.
      await recordLoginAttempt(identifier, false)
      return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 })
    }

    const passwordOk = typeof password === 'string' && await verifyPassword(password, auth.passwordHash)
    if (!passwordOk) {
      await recordLoginAttempt(identifier, false)
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
    }

    if (auth.totpEnabled) {
      const totpOk = typeof totp === 'string' && auth.totpSecret && verifyTotp(totp, auth.totpSecret)
      if (!totpOk) {
        await recordLoginAttempt(identifier, false)
        return NextResponse.json({ error: 'invalid_totp' }, { status: 401 })
      }
    }

    await recordLoginAttempt(identifier, true)
    const token = await createSession()
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_TTL_MS / 1000)
    })

    return NextResponse.json({ ok: true, totpRequired: !!auth.totpEnabled })
  } catch (error) {
    console.error('POST /api/admin/login error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
