import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHmac } from 'crypto'
import { promisify } from 'util'
import { getDb } from './db-postgres'

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

const SESSION_COOKIE = 'mbb_admin_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours, sliding
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export { SESSION_COOKIE, SESSION_TTL_MS }

// ---------- Schema ----------
// Called from db-postgres.ts's initDB() alongside the existing tables, so
// every code path that already ensures the schema exists also gets these.
export async function initAdminAuthSchema() {
  const sql = getDb()
  await sql`CREATE TABLE IF NOT EXISTS admin_auth (
    "id" TEXT PRIMARY KEY,
    "passwordHash" TEXT NOT NULL,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN DEFAULT FALSE,
    "createdAt" TEXT,
    "updatedAt" TEXT
  )`
  await sql`CREATE TABLE IF NOT EXISTS admin_sessions (
    "id" TEXT PRIMARY KEY,
    "createdAt" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL,
    "lastSeenAt" TEXT
  )`
  await sql`CREATE TABLE IF NOT EXISTS admin_login_attempts (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "attemptedAt" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL
  )`
}

// ---------- Password hashing (scrypt, no native/npm dependency needed) ----------
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, 64)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const derived = await scrypt(password, salt, expected.length)
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

// ---------- TOTP (RFC 6238, HMAC-SHA1, 30s step, 6 digits) ----------
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpSecret(): string {
  const bytes = randomBytes(20) // 160-bit secret, standard for TOTP
  let bits = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  let secret = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)]
  }
  return secret
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '')
  let bits = ''
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

function totpAt(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  return (code % 1_000_000).toString().padStart(6, '0')
}

// Accepts the current 30s window plus one step of clock drift each way.
export function verifyTotp(token: string, secret: string): boolean {
  if (!/^\d{6}$/.test(token)) return false
  const counter = Math.floor(Date.now() / 30000)
  for (let drift = -1; drift <= 1; drift++) {
    if (totpAt(secret, counter + drift) === token) return true
  }
  return false
}

export function totpProvisioningUri(secret: string, label = 'MoodBoardBooking:admin', issuer = 'MoodBoardBooking'): string {
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`
}

// ---------- Admin credential record (single row, id = 'singleton') ----------
export async function getAdminAuth() {
  const sql = getDb()
  const rows = await sql`SELECT * FROM admin_auth WHERE "id" = 'singleton'`
  return rows[0] || null
}

export async function setAdminPassword(password: string) {
  const sql = getDb()
  const hash = await hashPassword(password)
  const now = new Date().toISOString()
  const existing = await getAdminAuth()
  if (existing) {
    await sql`UPDATE admin_auth SET "passwordHash" = ${hash}, "updatedAt" = ${now} WHERE "id" = 'singleton'`
  } else {
    await sql`INSERT INTO admin_auth ("id", "passwordHash", "totpEnabled", "createdAt", "updatedAt") VALUES ('singleton', ${hash}, FALSE, ${now}, ${now})`
  }
}

export async function setAdminTotpSecret(secret: string | null, enabled: boolean) {
  const sql = getDb()
  const now = new Date().toISOString()
  await sql`UPDATE admin_auth SET "totpSecret" = ${secret}, "totpEnabled" = ${enabled}, "updatedAt" = ${now} WHERE "id" = 'singleton'`
}

// ---------- Rate limiting (DB-backed so it survives restarts/redeploys) ----------
export async function recordLoginAttempt(identifier: string, success: boolean) {
  const sql = getDb()
  const id = `${Date.now()}-${randomBytes(4).toString('hex')}`
  await sql`INSERT INTO admin_login_attempts ("id", "identifier", "attemptedAt", "success") VALUES (${id}, ${identifier}, ${new Date().toISOString()}, ${success})`
}

export async function isRateLimited(identifier: string): Promise<boolean> {
  const sql = getDb()
  const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MS).toISOString()
  const rows = await sql`SELECT COUNT(*) AS count FROM admin_login_attempts WHERE "identifier" = ${identifier} AND "success" = FALSE AND "attemptedAt" > ${since}`
  return Number(rows[0]?.count || 0) >= MAX_LOGIN_ATTEMPTS
}

export function clientIdentifier(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// ---------- Sessions ----------
export async function createSession(): Promise<string> {
  const sql = getDb()
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
  await sql`INSERT INTO admin_sessions ("id", "createdAt", "expiresAt", "lastSeenAt") VALUES (${token}, ${now.toISOString()}, ${expiresAt.toISOString()}, ${now.toISOString()})`
  return token
}

export async function destroySession(token: string) {
  const sql = getDb()
  await sql`DELETE FROM admin_sessions WHERE "id" = ${token}`
}

// Verifies the session token and slides its expiry forward. Also opportunistically
// sweeps expired sessions so the table doesn't grow unbounded (cheap, no separate cron needed).
export async function verifySession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const sql = getDb()
  const now = new Date()
  const rows = await sql`SELECT * FROM admin_sessions WHERE "id" = ${token} AND "expiresAt" > ${now.toISOString()}`
  if (rows.length === 0) return false
  const newExpiry = new Date(now.getTime() + SESSION_TTL_MS)
  await sql`UPDATE admin_sessions SET "lastSeenAt" = ${now.toISOString()}, "expiresAt" = ${newExpiry.toISOString()} WHERE "id" = ${token}`
  sql`DELETE FROM admin_sessions WHERE "expiresAt" <= ${now.toISOString()}`.catch(() => {})
  return true
}

export function getSessionTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return undefined
  const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(`${SESSION_COOKIE}=`))
  return match ? match.slice(SESSION_COOKIE.length + 1) : undefined
}

// Shared guard for API routes: returns true if the request carries a valid
// admin session cookie. Route handlers should call this first and return
// 401 immediately when it's false - see the routes retrofitted for this.
export async function requireAdminSession(request: Request): Promise<boolean> {
  const token = getSessionTokenFromRequest(request)
  return verifySession(token)
}
