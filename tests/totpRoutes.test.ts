import { describe, it, expect, beforeAll } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'
import { initDB } from '@/lib/db-postgres'
import { createSession, SESSION_COOKIE, setAdminTotpSecret } from '@/lib/adminAuth'
import * as totpRoute from '@/app/api/admin/totp/route'
import * as sessionRoute from '@/app/api/admin/session/route'

// Del B: admin UI for TOTP 2FA (app/components/TotpSettings.tsx) sits on
// top of the existing POST/PUT/DELETE /api/admin/totp routes and the
// totpEnabled flag GET /api/admin/session now reports. Those routes had no
// route-level test coverage before this - only the pure TOTP math
// (tests/adminAuth.test.ts). This exercises the actual enroll -> confirm ->
// disable flow end to end against a real Postgres, the same pattern as
// tests/adminAuthDb.test.ts.
const hasDb = !!process.env.DATABASE_URL
const d = hasDb ? describe : describe.skip

function req(url: string, init?: { method?: string; body?: string; cookie?: string }) {
  const headers = new Headers()
  if (init?.cookie) headers.set('cookie', init.cookie)
  headers.set('Content-Type', 'application/json')
  return new NextRequest(url, { method: init?.method, body: init?.body, headers })
}

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = input.toUpperCase().replace(/=+$/, '')
  let bits = ''
  for (const char of clean) bits += alphabet.indexOf(char).toString(2).padStart(5, '0')
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

// Same independent RFC 6238 reference implementation as tests/adminAuth.test.ts.
function currentTotpCode(secret: string): string {
  const counter = Math.floor(Date.now() / 1000 / 30)
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  return (code % 1_000_000).toString().padStart(6, '0')
}

d('TOTP 2FA routes (against a real Postgres)', () => {
  let token: string

  beforeAll(async () => {
    await initDB()
    token = await createSession()
    // Each of these tests mutates the singleton admin_auth row's TOTP
    // state - start from a known "disabled" baseline so they don't depend
    // on whatever a previous test run left behind.
    await setAdminTotpSecret(null, false)
  })

  it('every TOTP route requires an admin session', async () => {
    expect((await totpRoute.POST(req('http://localhost/api/admin/totp', { method: 'POST' }))).status).toBe(401)
    expect((await totpRoute.PUT(req('http://localhost/api/admin/totp', { method: 'PUT', body: JSON.stringify({ token: '000000' }) }))).status).toBe(401)
    expect((await totpRoute.DELETE(req('http://localhost/api/admin/totp', { method: 'DELETE' }))).status).toBe(401)
  })

  it('GET /api/admin/session reports totpEnabled: false before enrolling', async () => {
    const res = await sessionRoute.GET(req('http://localhost/api/admin/session', { cookie: `${SESSION_COOKIE}=${token}` }))
    const data = await res.json()
    expect(data.authenticated).toBe(true)
    expect(data.totpEnabled).toBe(false)
  })

  it('rejects confirming enrollment with a wrong code', async () => {
    const startRes = await totpRoute.POST(req('http://localhost/api/admin/totp', { method: 'POST', cookie: `${SESSION_COOKIE}=${token}` }))
    expect(startRes.status).toBe(200)
    const putRes = await totpRoute.PUT(req('http://localhost/api/admin/totp', {
      method: 'PUT', cookie: `${SESSION_COOKIE}=${token}`, body: JSON.stringify({ token: '000000' })
    }))
    expect(putRes.status).toBe(400)
  })

  it('enrolls, confirms with a valid code, and can be disabled again', async () => {
    const startRes = await totpRoute.POST(req('http://localhost/api/admin/totp', { method: 'POST', cookie: `${SESSION_COOKIE}=${token}` }))
    expect(startRes.status).toBe(200)
    const { secret, uri } = await startRes.json()
    expect(typeof secret).toBe('string')
    expect(uri).toMatch(/^otpauth:\/\/totp\//)

    const code = currentTotpCode(secret)
    const confirmRes = await totpRoute.PUT(req('http://localhost/api/admin/totp', {
      method: 'PUT', cookie: `${SESSION_COOKIE}=${token}`, body: JSON.stringify({ token: code })
    }))
    expect(confirmRes.status).toBe(200)

    const sessionRes = await sessionRoute.GET(req('http://localhost/api/admin/session', { cookie: `${SESSION_COOKIE}=${token}` }))
    expect((await sessionRes.json()).totpEnabled).toBe(true)

    const disableRes = await totpRoute.DELETE(req('http://localhost/api/admin/totp', { method: 'DELETE', cookie: `${SESSION_COOKIE}=${token}` }))
    expect(disableRes.status).toBe(200)

    const afterDisableRes = await sessionRoute.GET(req('http://localhost/api/admin/session', { cookie: `${SESSION_COOKIE}=${token}` }))
    expect((await afterDisableRes.json()).totpEnabled).toBe(false)
  })
})
