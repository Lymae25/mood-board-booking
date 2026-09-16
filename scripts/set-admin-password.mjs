#!/usr/bin/env node
// Sets (or resets) the single admin account's password without ever
// printing it to the terminal or a log.
//
// Usage:
//   DATABASE_URL=... node scripts/set-admin-password.mjs
//   (or just `node scripts/set-admin-password.mjs` if .env.local / the
//   shell environment already has DATABASE_URL set)
//
// The password is read from a masked terminal prompt (input is hidden,
// asterisks are not even echoed - just silence while typing, then a
// confirmation prompt to catch typos). It is never written to argv, an
// env var dump, or any log line - only its scrypt hash goes to the
// database, in the same "salt:hash" hex format lib/adminAuth.ts's
// hashPassword()/verifyPassword() use. Keep these two implementations in
// sync if the hashing scheme ever changes.

import { createInterface } from 'node:readline'
import { randomBytes, scrypt as scryptCb } from 'node:crypto'
import { promisify } from 'node:util'
import postgres from 'postgres'

const scrypt = promisify(scryptCb)

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, 64)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

// Piped/non-TTY stdin (a heredoc, a test harness) delivers all its lines
// before this script even starts reading, and readline's question()
// called a second time from an async continuation can miss a line that
// already arrived (a known readline pitfall with multi-line piped input
// consumed across await boundaries) - so for that case, read the whole
// stream up front and hand out lines from a queue instead of re-asking.
let pipedLines = null
async function readAllPipedLines() {
  if (pipedLines) return pipedLines
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  pipedLines = Buffer.concat(chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c))).toString('utf8').split('\n')
  return pipedLines
}

let rl = null

function promptHidden(question) {
  if (!process.stdin.isTTY) {
    return readAllPipedLines().then((lines) => {
      process.stdout.write(question)
      const line = lines.shift() ?? ''
      process.stdout.write('\n')
      return line
    })
  }

  if (!rl) rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    const output = process.stdout
    const originalWrite = output.write.bind(output)
    let masked = false
    rl.question(question, (answer) => {
      output.write = originalWrite
      output.write('\n')
      resolve(answer)
    })
    masked = true
    rl._writeToOutput = (str) => {
      if (masked && str !== question) return
      originalWrite(str)
    }
  })
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Set it in your shell or .env.local before running this script.')
    process.exit(1)
  }

  const password = await promptHidden('New admin password (input hidden): ')
  if (!password || password.length < 12) {
    console.error('Password must be at least 12 characters.')
    if (rl) rl.close()
    process.exit(1)
  }
  const confirm = await promptHidden('Confirm password: ')
  if (password !== confirm) {
    console.error('Passwords did not match. Nothing was changed.')
    if (rl) rl.close()
    process.exit(1)
  }

  const sql = postgres(connectionString)
  try {
    await sql`CREATE TABLE IF NOT EXISTS admin_auth (
      "id" TEXT PRIMARY KEY,
      "passwordHash" TEXT NOT NULL,
      "totpSecret" TEXT,
      "totpEnabled" BOOLEAN DEFAULT FALSE,
      "createdAt" TEXT,
      "updatedAt" TEXT
    )`
    const hash = await hashPassword(password)
    const now = new Date().toISOString()
    const existing = await sql`SELECT "id" FROM admin_auth WHERE "id" = 'singleton'`
    if (existing.length > 0) {
      await sql`UPDATE admin_auth SET "passwordHash" = ${hash}, "updatedAt" = ${now} WHERE "id" = 'singleton'`
      console.log('Admin password updated.')
    } else {
      await sql`INSERT INTO admin_auth ("id", "passwordHash", "totpEnabled", "createdAt", "updatedAt") VALUES ('singleton', ${hash}, FALSE, ${now}, ${now})`
      console.log('Admin password set.')
    }
  } finally {
    await sql.end()
    if (rl) rl.close()
  }
}

main().catch((err) => {
  console.error('Failed to set admin password:', err.message)
  if (rl) rl.close()
  process.exit(1)
})
