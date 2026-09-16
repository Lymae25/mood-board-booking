import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, generateTotpSecret, verifyTotp, totpProvisioningUri } from '@/lib/adminAuth'
import { createHmac } from 'crypto'

// Pure-logic tests: no database needed. These cover the two most
// security-critical primitives - password hashing and TOTP - in isolation.

describe('password hashing', () => {
  it('round-trips a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword('wrong password', hash)).toBe(false)
  })

  it('produces a different hash each time (random salt)', async () => {
    const a = await hashPassword('same password')
    const b = await hashPassword('same password')
    expect(a).not.toBe(b)
    expect(await verifyPassword('same password', a)).toBe(true)
    expect(await verifyPassword('same password', b)).toBe(true)
  })

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-valid-hash')).toBe(false)
  })
})

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = input.toUpperCase().replace(/=+$/, '')
  let bits = ''
  for (const char of clean) bits += alphabet.indexOf(char).toString(2).padStart(5, '0')
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

// Independent reference implementation of RFC 6238, used only to compute an
// expected code and confirm lib/adminAuth's verifyTotp agrees with it -
// this catches a bug in the real implementation that a test calling only
// generateTotpSecret + verifyTotp against each other could never catch.
function referenceTotp(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  return (code % 1_000_000).toString().padStart(6, '0')
}

describe('TOTP', () => {
  it('accepts a code computed by an independent reference implementation', () => {
    const secret = generateTotpSecret()
    const counter = Math.floor(Date.now() / 30000)
    const code = referenceTotp(secret, counter)
    expect(verifyTotp(code, secret)).toBe(true)
  })

  it('rejects a code for a different secret', () => {
    const secretA = generateTotpSecret()
    const secretB = generateTotpSecret()
    const counter = Math.floor(Date.now() / 30000)
    const codeForB = referenceTotp(secretB, counter)
    expect(verifyTotp(codeForB, secretA)).toBe(false)
  })

  it('rejects a malformed (non-6-digit) token', () => {
    const secret = generateTotpSecret()
    expect(verifyTotp('abc', secret)).toBe(false)
    expect(verifyTotp('12345', secret)).toBe(false)
  })

  it('rejects a code far outside the allowed clock drift window', () => {
    const secret = generateTotpSecret()
    const farFuture = Math.floor(Date.now() / 30000) + 100
    const code = referenceTotp(secret, farFuture)
    expect(verifyTotp(code, secret)).toBe(false)
  })

  it('produces a valid otpauth:// provisioning URI', () => {
    const secret = generateTotpSecret()
    const uri = totpProvisioningUri(secret)
    expect(uri).toMatch(/^otpauth:\/\/totp\//)
    expect(uri).toContain(`secret=${secret}`)
  })
})
