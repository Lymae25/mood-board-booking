import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initDB, createCustomer, createProject, deleteCustomer } from '@/lib/db-postgres'
import { createSession, SESSION_COOKIE as ADMIN_SESSION_COOKIE } from '@/lib/adminAuth'
import { createCustomerSession, SESSION_COOKIE as CUSTOMER_SESSION_COOKIE } from '@/lib/customerAuth'
import * as customersRoute from '@/app/api/customers/route'
import * as customerByIdRoute from '@/app/api/customers/[id]/route'
import * as projectsRoute from '@/app/api/projects/route'
import * as projectByIdRoute from '@/app/api/projects/[id]/route'
import * as scenesRoute from '@/app/api/scenes/route'
import * as ideasRoute from '@/app/api/ideas/route'
import * as timelineRoute from '@/app/api/timeline/route'
import * as messagesRoute from '@/app/api/messages/route'
import * as calendarFeedRoute from '@/app/api/calendar/feed.ics/route'
import { NextRequest } from 'next/server'

// These call the actual Next.js Route Handler functions directly (no
// running server needed - they're just async functions that take a
// Request and return a Response, which Next.js's dev/prod server also
// just calls under the hood). Routes that use next/headers' cookies()
// (login/logout, verify-pin) need a live Next request context and are NOT
// covered here - see STATUS.md for how those were verified manually
// instead.
const hasDb = !!process.env.DATABASE_URL
const d = hasDb ? describe : describe.skip

function req(url: string, init?: { method?: string; body?: string; cookie?: string }) {
  const headers = new Headers()
  if (init?.cookie) headers.set('cookie', init.cookie)
  // NextRequest, not a plain Request - routes that read query params via
  // request.nextUrl.searchParams need that extension.
  return new NextRequest(url, { method: init?.method, body: init?.body, headers })
}

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

  it('DELETE /api/projects/[id] requires admin', async () => {
    const res = await projectByIdRoute.DELETE(
      req('http://localhost/api/projects/whatever', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'whatever' }) }
    )
    expect(res.status).toBe(401)
  })

  it('GET /api/calendar/feed.ics requires admin or a valid token', async () => {
    const res = await calendarFeedRoute.GET(req('http://localhost/api/calendar/feed.ics'))
    expect(res.status).toBe(401)
  })
})

d('a valid admin session can reach admin-only routes', () => {
  beforeAll(async () => { await initDB() })

  it('GET /api/customers?admin data still works with a real session cookie', async () => {
    const token = await createSession()
    const res = await customersRoute.GET(req('http://localhost/api/customers', { cookie: `${ADMIN_SESSION_COOKIE}=${token}` }))
    expect(res.status).toBe(200)
  })
})

d('customers cannot see or change another customer\'s data', () => {
  let customerAId = ''
  let customerBId = ''
  let projectAId = ''
  let projectBId = ''
  let sessionA = ''
  let sessionB = ''

  beforeAll(async () => {
    await initDB()
    const a = await createCustomer({ name: 'Access Control Customer A', pin: '1111' })
    const b = await createCustomer({ name: 'Access Control Customer B', pin: '2222' })
    customerAId = a.id
    customerBId = b.id
    const pa = await createProject({ customerId: customerAId, name: 'A Project', status: 'new' })
    const pb = await createProject({ customerId: customerBId, name: 'B Project', status: 'new' })
    projectAId = pa.id
    projectBId = pb.id
    sessionA = await createCustomerSession(customerAId)
    sessionB = await createCustomerSession(customerBId)
  })

  afterAll(async () => {
    await deleteCustomer(customerAId)
    await deleteCustomer(customerBId)
  })

  it('customer A can read their own project, but not customer B\'s', async () => {
    const own = await projectByIdRoute.GET(
      req(`http://localhost/api/projects/${projectAId}`, { cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}` }),
      { params: Promise.resolve({ id: projectAId }) }
    )
    expect(own.status).toBe(200)

    const other = await projectByIdRoute.GET(
      req(`http://localhost/api/projects/${projectBId}`, { cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}` }),
      { params: Promise.resolve({ id: projectBId }) }
    )
    expect(other.status).toBe(401)

    // And symmetrically: B's session works for B's own project, not A's.
    const bOwn = await projectByIdRoute.GET(
      req(`http://localhost/api/projects/${projectBId}`, { cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionB}` }),
      { params: Promise.resolve({ id: projectBId }) }
    )
    expect(bOwn.status).toBe(200)

    const bOnA = await projectByIdRoute.GET(
      req(`http://localhost/api/projects/${projectAId}`, { cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionB}` }),
      { params: Promise.resolve({ id: projectAId }) }
    )
    expect(bOnA.status).toBe(401)
  })

  it('customer A cannot list customer B\'s projects via ?customerId=', async () => {
    const res = await projectsRoute.GET(req(`http://localhost/api/projects?customerId=${customerBId}`, { cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}` }))
    expect(res.status).toBe(401)
  })

  it('customer A cannot change customer B\'s project status', async () => {
    const res = await projectByIdRoute.PATCH(
      req(`http://localhost/api/projects/${projectBId}`, { method: 'PATCH', cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}`, body: JSON.stringify({ status: 'done' }) }),
      { params: Promise.resolve({ id: projectBId }) }
    )
    expect(res.status).toBe(401)
  })

  it('customer A cannot read or write scenes/ideas/timeline on customer B\'s project', async () => {
    const getScenes = await scenesRoute.GET(req(`http://localhost/api/scenes?projectId=${projectBId}`, { cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}` }))
    expect(getScenes.status).toBe(401)

    const postIdea = await ideasRoute.POST(req('http://localhost/api/ideas', {
      method: 'POST',
      cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}`,
      body: JSON.stringify({ projectId: projectBId, title: 'Smuggled idea', category: 'link' })
    }))
    expect(postIdea.status).toBe(401)

    const postTimeline = await timelineRoute.POST(req('http://localhost/api/timeline', {
      method: 'POST',
      cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}`,
      body: JSON.stringify({ projectId: projectBId, title: 'Smuggled milestone', status: 'pending' })
    }))
    expect(postTimeline.status).toBe(401)
  })

  it('customer A cannot read customer B\'s messages or send messages as customer B', async () => {
    const getMessages = await messagesRoute.GET(req(`http://localhost/api/messages?customerId=${customerBId}`, { cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}` }))
    expect(getMessages.status).toBe(401)

    const postMessage = await messagesRoute.POST(req('http://localhost/api/messages', {
      method: 'POST',
      cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}`,
      body: JSON.stringify({ customerId: customerBId, content: 'hi from an intruder' })
    }))
    expect(postMessage.status).toBe(401)
  })

  it('customer A can read and write their own scenes/ideas/timeline/messages', async () => {
    const getScenes = await scenesRoute.GET(req(`http://localhost/api/scenes?projectId=${projectAId}`, { cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}` }))
    expect(getScenes.status).toBe(200)

    const postMessage = await messagesRoute.POST(req('http://localhost/api/messages', {
      method: 'POST',
      cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}`,
      body: JSON.stringify({ customerId: customerAId, content: 'hello' })
    }))
    expect(postMessage.status).toBe(201)
  })

  it('customer A cannot reset customer B\'s PIN, but can reset their own', async () => {
    const stealB = await customerByIdRoute.PATCH(
      req(`http://localhost/api/customers/${customerBId}`, { method: 'PATCH', cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}`, body: JSON.stringify({ pin: '9999' }) }),
      { params: Promise.resolve({ id: customerBId }) }
    )
    expect(stealB.status).toBe(401)

    const ownA = await customerByIdRoute.PATCH(
      req(`http://localhost/api/customers/${customerAId}`, { method: 'PATCH', cookie: `${CUSTOMER_SESSION_COOKIE}=${sessionA}`, body: JSON.stringify({ pin: '3333' }) }),
      { params: Promise.resolve({ id: customerAId }) }
    )
    expect(ownA.status).toBe(200)
  })

  it('an anonymous visitor (no session at all) cannot read or write either customer\'s data', async () => {
    const res = await projectByIdRoute.GET(
      req(`http://localhost/api/projects/${projectAId}`),
      { params: Promise.resolve({ id: projectAId }) }
    )
    expect(res.status).toBe(401)
  })
})
