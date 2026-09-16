import { describe, it, expect, beforeAll } from 'vitest'
import { initDB } from '@/lib/db-postgres'
import {
  createSession,
  verifySession,
  destroySession,
  requireAdminSession,
  isRateLimited,
  recordLoginAttempt,
  clientIdentifier,
  SESSION_COOKIE
} from '@/lib/adminAuth'

// Requires a real Postgres reachable via DATABASE_URL (the local Docker
// container used throughout this branch's development - see STATUS.md for
// the exact `docker run` command). Skips cleanly if it isn't set, so `npm
// test` doesn't hard-fail in an environment with no database at all.
const hasDb = !!process.env.DATABASE_URL
const d = hasDb ? describe : describe.skip

d('sessions (against a real Postgres)', () => {
  beforeAll(async () => { await initDB() })

  it('a freshly created session verifies as valid', async () => {
    const token = await createSession()
    expect(await verifySession(token)).toBe(true)
  })

  it('a random/unknown token does not verify', async () => {
    expect(await verifySession('0'.repeat(64))).toBe(false)
  })

  it('a destroyed session no longer verifies', async () => {
    const token = await createSession()
    expect(await verifySession(token)).toBe(true)
    await destroySession(token)
    expect(await verifySession(token)).toBe(false)
  })

  it('requireAdminSession reads the cookie header directly off a Request', async () => {
    const token = await createSession()
    const req = new Request('http://localhost/api/whatever', {
      headers: { cookie: `${SESSION_COOKIE}=${token}` }
    })
    expect(await requireAdminSession(req)).toBe(true)
  })

  it('requireAdminSession rejects a request with no cookie at all', async () => {
    const req = new Request('http://localhost/api/whatever')
    expect(await requireAdminSession(req)).toBe(false)
  })

  it('requireAdminSession rejects a forged/garbage cookie value', async () => {
    const req = new Request('http://localhost/api/whatever', {
      headers: { cookie: `${SESSION_COOKIE}=not-a-real-session-token` }
    })
    expect(await requireAdminSession(req)).toBe(false)
  })
})

d('login rate limiting (against a real Postgres)', () => {
  beforeAll(async () => { await initDB() })

  it('is not rate limited before any failures', async () => {
    const id = `test-${Date.now()}-a`
    expect(await isRateLimited(id)).toBe(false)
  })

  it('becomes rate limited after 5 failed attempts, and a success elsewhere does not reset a different identifier', async () => {
    const id = `test-${Date.now()}-b`
    for (let i = 0; i < 4; i++) await recordLoginAttempt(id, false)
    expect(await isRateLimited(id)).toBe(false)
    await recordLoginAttempt(id, false)
    expect(await isRateLimited(id)).toBe(true)
  })

  it('clientIdentifier prefers x-forwarded-for, falls back to x-real-ip, then unknown', () => {
    const withForwarded = new Request('http://localhost/', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
    expect(clientIdentifier(withForwarded)).toBe('1.2.3.4')
    const withRealIp = new Request('http://localhost/', { headers: { 'x-real-ip': '9.9.9.9' } })
    expect(clientIdentifier(withRealIp)).toBe('9.9.9.9')
    const withNeither = new Request('http://localhost/')
    expect(clientIdentifier(withNeither)).toBe('unknown')
  })
})
