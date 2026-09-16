import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { initDB, verifyPin } from '@/lib/db-postgres'
import {
  createCustomerSession,
  recordPinAttempt,
  isPinRateLimited,
  clientIdentifier,
  SESSION_COOKIE,
  SESSION_TTL_MS
} from '@/lib/customerAuth'

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const { customerId, pin } = await request.json()
    if (!customerId || typeof pin !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 })
    }

    // A 4-digit PIN is only 10,000 combinations - this used to have no
    // rate limiting at all. Scoped per customer+IP so guessing one
    // customer's PIN doesn't lock out or get confused with another's.
    const identifier = `${customerId}:${clientIdentifier(request)}`
    if (await isPinRateLimited(identifier)) {
      return NextResponse.json({ valid: false, error: 'rate_limited' }, { status: 429 })
    }

    const valid = await verifyPin(customerId, pin)
    await recordPinAttempt(identifier, valid)
    if (!valid) return NextResponse.json({ valid: false })

    // A correct PIN now issues a session cookie, the same way admin login
    // does - every subsequent customer-scoped API call authorizes off this,
    // not off a plain customerId the client happens to send.
    const token = await createCustomerSession(customerId)
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_TTL_MS / 1000)
    })

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('POST /api/verify-pin error:', error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
