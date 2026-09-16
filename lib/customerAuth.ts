import { randomBytes } from 'crypto'
import { getDb } from './db-postgres'
import { requireAdminSession, clientIdentifier } from './adminAuth'

// A lightweight session for the customer-facing side of the app, parallel
// to lib/adminAuth.ts's admin sessions. Before this existed, a customer's
// "identity" for every API call was just a plain id in the URL/body - any
// visitor who knew or guessed another customer's id could read or write
// their projects, scenes, ideas, notes, messages and even reset their PIN.
// Issued once, at /api/verify-pin, after the 4-digit PIN is confirmed.
const SESSION_COOKIE = 'mbb_customer_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days, sliding - customers log in rarely, unlike admin

export { SESSION_COOKIE, SESSION_TTL_MS }

export async function initCustomerAuthSchema() {
  const sql = getDb()
  await sql`CREATE TABLE IF NOT EXISTS customer_sessions (
    "id" TEXT PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL,
    "lastSeenAt" TEXT
  )`
  // Separate namespace from admin_login_attempts so a flood of PIN guesses
  // against one customer can't be confused with, or exhaust, admin
  // brute-force bookkeeping.
  await sql`CREATE TABLE IF NOT EXISTS pin_attempts (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "attemptedAt" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL
  )`
}

export async function createCustomerSession(customerId: string): Promise<string> {
  const sql = getDb()
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
  await sql`INSERT INTO customer_sessions ("id", "customerId", "createdAt", "expiresAt", "lastSeenAt") VALUES (${token}, ${customerId}, ${now.toISOString()}, ${expiresAt.toISOString()}, ${now.toISOString()})`
  return token
}

export async function destroyCustomerSession(token: string) {
  const sql = getDb()
  await sql`DELETE FROM customer_sessions WHERE "id" = ${token}`
}

// Verifies the session token, slides its expiry forward, and returns the
// customerId it belongs to (or null). Also opportunistically sweeps expired
// sessions, same pattern as adminAuth's verifySession.
export async function verifyCustomerSession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null
  const sql = getDb()
  const now = new Date()
  const rows = await sql`SELECT "customerId" FROM customer_sessions WHERE "id" = ${token} AND "expiresAt" > ${now.toISOString()}`
  if (rows.length === 0) return null
  const newExpiry = new Date(now.getTime() + SESSION_TTL_MS)
  await sql`UPDATE customer_sessions SET "lastSeenAt" = ${now.toISOString()}, "expiresAt" = ${newExpiry.toISOString()} WHERE "id" = ${token}`
  sql`DELETE FROM customer_sessions WHERE "expiresAt" <= ${now.toISOString()}`.catch(() => {})
  return rows[0].customerId
}

export function getCustomerSessionTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return undefined
  const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(`${SESSION_COOKIE}=`))
  return match ? match.slice(SESSION_COOKIE.length + 1) : undefined
}

// Shared guard for customer-scoped API routes: true if the request is
// either a logged-in admin (full access to everything) or the specific
// customer identified by `customerId`, proven by their own session cookie -
// never by a plain id the client just happens to send.
export async function requireOwnerOrAdmin(request: Request, customerId: string | null | undefined): Promise<boolean> {
  if (await requireAdminSession(request)) return true
  if (!customerId) return false
  const token = getCustomerSessionTokenFromRequest(request)
  const sessionCustomerId = await verifyCustomerSession(token)
  return sessionCustomerId === customerId
}

// Looser guard for routes that aren't scoped to one specific customerId at
// the point of the request itself (e.g. file upload, which just returns a
// URL - it's only "attached" to a customer's data by whatever protected
// route the client calls next with that URL). True for a logged-in admin,
// or ANY logged-in customer - false for an anonymous visitor.
export async function requireAnyAuthenticatedSession(request: Request): Promise<boolean> {
  if (await requireAdminSession(request)) return true
  const token = getCustomerSessionTokenFromRequest(request)
  const sessionCustomerId = await verifyCustomerSession(token)
  return sessionCustomerId !== null
}

// ---------- PIN brute-force protection ----------
// 4 digits is only 10,000 combinations - /api/verify-pin previously had no
// rate limiting at all. Same shape as adminAuth's login rate limiting.
const MAX_PIN_ATTEMPTS = 5
const PIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000

export async function recordPinAttempt(identifier: string, success: boolean) {
  const sql = getDb()
  const id = `${Date.now()}-${randomBytes(4).toString('hex')}`
  await sql`INSERT INTO pin_attempts ("id", "identifier", "attemptedAt", "success") VALUES (${id}, ${identifier}, ${new Date().toISOString()}, ${success})`
}

export async function isPinRateLimited(identifier: string): Promise<boolean> {
  const sql = getDb()
  const since = new Date(Date.now() - PIN_ATTEMPT_WINDOW_MS).toISOString()
  const rows = await sql`SELECT COUNT(*) AS count FROM pin_attempts WHERE "identifier" = ${identifier} AND "success" = FALSE AND "attemptedAt" > ${since}`
  return Number(rows[0]?.count || 0) >= MAX_PIN_ATTEMPTS
}

export { clientIdentifier }
