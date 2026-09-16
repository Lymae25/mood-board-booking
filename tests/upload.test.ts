import { describe, it, expect, beforeAll } from 'vitest'
import { initDB, createCustomer, deleteCustomer } from '@/lib/db-postgres'
import { createSession, SESSION_COOKIE as ADMIN_SESSION_COOKIE } from '@/lib/adminAuth'
import { createCustomerSession, SESSION_COOKIE as CUSTOMER_SESSION_COOKIE } from '@/lib/customerAuth'
import * as uploadRoute from '@/app/api/upload/route'
import { NextRequest } from 'next/server'

// Route handlers called directly, same pattern as the other route tests -
// see tests/accessControl.test.ts for why login/verify-pin themselves
// aren't covered this way.
const hasDb = !!process.env.DATABASE_URL
const d = hasDb ? describe : describe.skip

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const PDF_SIGNATURE = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'binary')

function uploadRequest(cookie: string | undefined, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  return new NextRequest('http://localhost/api/upload', { method: 'POST', body: formData, headers })
}

d('POST /api/upload', () => {
  let customerId = ''
  let customerSessionCookie = ''
  let adminSessionCookie = ''

  beforeAll(async () => {
    await initDB()
    const customer = await createCustomer({ name: 'Upload Test Customer', pin: '4321' })
    customerId = customer.id
    customerSessionCookie = `${CUSTOMER_SESSION_COOKIE}=${await createCustomerSession(customerId)}`
    adminSessionCookie = `${ADMIN_SESSION_COOKIE}=${await createSession()}`
  })

  it('rejects an unauthenticated request', async () => {
    const file = new File([PNG_SIGNATURE], 'logo.png', { type: 'image/png' })
    const res = await uploadRoute.POST(uploadRequest(undefined, file))
    expect(res.status).toBe(401)
  })

  it('rejects a forged/garbage session cookie', async () => {
    const file = new File([PNG_SIGNATURE], 'logo.png', { type: 'image/png' })
    const res = await uploadRoute.POST(uploadRequest(`${CUSTOMER_SESSION_COOKIE}=not-a-real-token`, file))
    expect(res.status).toBe(401)
  })

  it('a logged-in customer can upload a valid PNG', async () => {
    const file = new File([PNG_SIGNATURE], 'logo.png', { type: 'image/png' })
    const res = await uploadRoute.POST(uploadRequest(customerSessionCookie, file))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.url).toMatch(/^\/api\/uploads\/.+\.png$/)
  })

  it('a logged-in admin can upload a valid PDF', async () => {
    const file = new File([PDF_SIGNATURE], 'brief.pdf', { type: 'application/pdf' })
    const res = await uploadRoute.POST(uploadRequest(adminSessionCookie, file))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.url).toMatch(/^\/api\/uploads\/.+\.pdf$/)
  })

  it('rejects a disallowed extension (e.g. an old video upload)', async () => {
    const file = new File([Buffer.from('not a real video')], 'clip.mp4', { type: 'video/mp4' })
    const res = await uploadRoute.POST(uploadRequest(adminSessionCookie, file))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('invalid_type')
  })

  it('rejects a file whose content does not match its claimed extension (spoofed)', async () => {
    // Plain text bytes, renamed to look like a PNG - the extension check
    // alone would have let this through before the signature check existed.
    const file = new File([Buffer.from('<script>alert(1)</script>')], 'logo.png', { type: 'image/png' })
    const res = await uploadRoute.POST(uploadRequest(customerSessionCookie, file))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('invalid_type')
  })

  it('rejects a file over the size limit', async () => {
    const big = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(11 * 1024 * 1024)])
    const file = new File([big], 'huge.png', { type: 'image/png' })
    const res = await uploadRoute.POST(uploadRequest(adminSessionCookie, file))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('file_too_large')
  })

  it('deletes the test customer', async () => {
    await deleteCustomer(customerId)
  })
})
