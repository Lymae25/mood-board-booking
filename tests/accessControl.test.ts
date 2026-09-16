import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initDB, createCustomer, createProject, deleteCustomer } from '@/lib/db-postgres'
import { createSession, SESSION_COOKIE } from '@/lib/adminAuth'
import * as customersRoute from '@/app/api/customers/route'
import * as customerByIdRoute from '@/app/api/customers/[id]/route'
import * as draftsRoute from '@/app/api/mood-board-drafts/route'
import * as draftByIdRoute from '@/app/api/mood-board-drafts/[id]/route'
import * as ideasRoute from '@/app/api/ideas/route'
import { NextRequest } from 'next/server'

// These call the actual Next.js Route Handler functions directly (no
// running server needed - they're just async functions that take a
// Request and return a Response, which Next.js's dev/prod server also
// just calls under the hood). Routes that use next/headers' cookies()
// (login/logout) need a live Next request context and are NOT covered
// here - see STATUS.md for how those were verified manually instead.
const hasDb = !!process.env.DATABASE_URL
const d = hasDb ? describe : describe.skip

function req(url: string, init?: { method?: string; body?: string; cookie?: string }) {
  const headers = new Headers()
  if (init?.cookie) headers.set('cookie', init.cookie)
  // NextRequest, not a plain Request - routes that read query params via
  // request.nextUrl.searchParams (e.g. GET /api/ideas) need that extension.
  return new NextRequest(url, { method: init?.method, body: init?.body, headers })
}

interface IdeaRecord { title: string }

d('admin-only routes reject requests with no valid session', () => {
  beforeAll(async () => { await initDB() })

  it('POST /api/customers requires admin', async () => {
    const res = await customersRoute.POST(req('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'x', pin: '0000' })
    }))
    expect(res.status).toBe(401)
  })

  it('DELETE /api/customers/[id] requires admin', async () => {
    const res = await customerByIdRoute.DELETE(
      req('http://localhost/api/customers/whatever', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'whatever' }) }
    )
    expect(res.status).toBe(401)
  })

  it('GET /api/mood-board-drafts requires admin', async () => {
    const res = await draftsRoute.GET(req('http://localhost/api/mood-board-drafts'))
    expect(res.status).toBe(401)
  })

  it('POST /api/mood-board-drafts requires admin', async () => {
    const res = await draftsRoute.POST(req('http://localhost/api/mood-board-drafts', {
      method: 'POST',
      body: JSON.stringify({ customerId: 'a', projectId: 'b', title: 'c' })
    }))
    expect(res.status).toBe(401)
  })

  it('PATCH /api/mood-board-drafts/[id] requires admin', async () => {
    const res = await draftByIdRoute.PATCH(
      req('http://localhost/api/mood-board-drafts/whatever', { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) }),
      { params: Promise.resolve({ id: 'whatever' }) }
    )
    expect(res.status).toBe(401)
  })
})

d('a valid admin session can reach admin-only routes', () => {
  beforeAll(async () => { await initDB() })

  it('GET /api/mood-board-drafts succeeds with a real session cookie', async () => {
    const token = await createSession()
    const res = await draftsRoute.GET(req('http://localhost/api/mood-board-drafts', { cookie: `${SESSION_COOKIE}=${token}` }))
    expect(res.status).toBe(200)
  })
})

d('customer-facing routes never expose draft mood board ideas', () => {
  let customerId = ''
  let projectId = ''

  beforeAll(async () => {
    await initDB()
    const customer = await createCustomer({ name: 'Access Control Test Customer', pin: '9999' })
    customerId = customer.id
    const project = await createProject({ customerId, name: 'Access Control Test Project', status: 'new' })
    projectId = project.id
  })

  afterAll(async () => {
    await deleteCustomer(customerId)
  })

  it('a saved draft never appears in the customer-facing /api/ideas list until approved', async () => {
    const token = await createSession()
    const createRes = await draftsRoute.POST(req('http://localhost/api/mood-board-drafts', {
      method: 'POST',
      cookie: `${SESSION_COOKIE}=${token}`,
      body: JSON.stringify({ customerId, projectId, title: 'Should stay hidden until approved' })
    }))
    expect(createRes.status).toBe(201)
    const draft = await createRes.json()

    // This is exactly the request a customer's PIN-gated dashboard makes -
    // no admin cookie, just their own project's ideas.
    const ideasRes = await ideasRoute.GET(req(`http://localhost/api/ideas?projectId=${projectId}`))
    const ideas = await ideasRes.json()
    expect(ideas.find((i: IdeaRecord) => i.title === 'Should stay hidden until approved')).toBeUndefined()

    // And the drafts endpoint itself must still be unreachable without a
    // session - it never doubles as a customer-readable list either.
    const noAuthDraftsRes = await draftsRoute.GET(req('http://localhost/api/mood-board-drafts'))
    expect(noAuthDraftsRes.status).toBe(401)

    // Approve it, then the same customer-facing call must now show it.
    const approveRes = await draftByIdRoute.PATCH(
      req(`http://localhost/api/mood-board-drafts/${draft.id}`, { method: 'PATCH', cookie: `${SESSION_COOKIE}=${token}`, body: JSON.stringify({ action: 'approve' }) }),
      { params: Promise.resolve({ id: draft.id }) }
    )
    expect(approveRes.status).toBe(200)

    const ideasAfterRes = await ideasRoute.GET(req(`http://localhost/api/ideas?projectId=${projectId}`))
    const ideasAfter = await ideasAfterRes.json()
    expect(ideasAfter.find((i: IdeaRecord) => i.title === 'Should stay hidden until approved')).toBeDefined()
  })
})
