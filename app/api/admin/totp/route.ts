import { NextRequest, NextResponse } from 'next/server'
import { initDB } from '@/lib/db-postgres'
import { requireAdminSession, generateTotpSecret, totpProvisioningUri, verifyTotp, setAdminTotpSecret, getAdminAuth } from '@/lib/adminAuth'

// Step 1: generate a pending secret and return its otpauth:// URI (render
// as a QR code client-side, e.g. via a data URI QR library, or let the
// admin type the secret manually into their authenticator app).
export async function POST(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const secret = generateTotpSecret()
    await setAdminTotpSecret(secret, false) // stored but not enabled until confirmed below
    return NextResponse.json({ secret, uri: totpProvisioningUri(secret) })
  } catch (error) {
    console.error('POST /api/admin/totp error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// Step 2: confirm the admin's authenticator app actually produces valid
// codes for the pending secret before turning enforcement on.
export async function PUT(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { token } = await request.json()
    const auth = await getAdminAuth()
    if (!auth?.totpSecret || typeof token !== 'string' || !verifyTotp(token, auth.totpSecret)) {
      return NextResponse.json({ error: 'invalid_totp' }, { status: 400 })
    }
    await setAdminTotpSecret(auth.totpSecret, true)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PUT /api/admin/totp error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// Disable 2FA (still requires a valid admin session, i.e. the password).
export async function DELETE(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    await setAdminTotpSecret(null, false)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
