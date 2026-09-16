import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initDB, createCustomer, createProject, deleteCustomer, getIdeas } from '@/lib/db-postgres'
import { createSession, SESSION_COOKIE as ADMIN_SESSION_COOKIE } from '@/lib/adminAuth'
import { createCustomerSession, SESSION_COOKIE as CUSTOMER_SESSION_COOKIE } from '@/lib/customerAuth'
import * as chatRoute from '@/app/api/jarvis/chat/route'
import * as speakRoute from '@/app/api/jarvis/speak/route'
import * as trendsRoute from '@/app/api/jarvis/trends/route'
import * as draftsRoute from '@/app/api/mood-board-drafts/route'
import * as draftByIdRoute from '@/app/api/mood-board-drafts/[id]/route'
import { NextRequest } from 'next/server'

// Same pattern as tests/accessControl.test.ts - calls the route handlers
// directly against a real (throwaway, local) Postgres. JARVIS_API_URL/
// JARVIS_TRENDS_URL are intentionally left unset here, so chat/trends/speak
// exercise their demo-mode fallback - no network calls, no real credentials
// needed to run this suite.
const hasDb = !!process.env.DATABASE_URL
const d = hasDb ? describe : describe.skip

function req(url: string, init?: { method?: string; body?: string; cookie?: string }) {
  const headers = new Headers()
  if (init?.cookie) headers.set('cookie', init.cookie)
  headers.set('Content-Type', 'application/json')
  return new NextRequest(url, { method: init?.method, body: init?.body, headers })
}

d('every Jarvis route requires an admin session', () => {
  beforeAll(async () => { await initDB() })

  it('POST /api/jarvis/chat requires admin', async () => {
    const res = await chatRoute.POST(req('http://localhost/api/jarvis/chat', {
      method: 'POST', body: JSON.stringify({ message: 'hej' })
    }))
    expect(res.status).toBe(401)
  })

  it('POST /api/jarvis/speak requires admin', async () => {
    const res = await speakRoute.POST(req('http://localhost/api/jarvis/speak', {
      method: 'POST', body: JSON.stringify({ text: 'hej' })
    }))
    expect(res.status).toBe(401)
  })

  it('GET /api/jarvis/trends requires admin', async () => {
    const res = await trendsRoute.GET(req('http://localhost/api/jarvis/trends'))
    expect(res.status).toBe(401)
  })

  it('GET /api/mood-board-drafts requires admin', async () => {
    const res = await draftsRoute.GET(req('http://localhost/api/mood-board-drafts'))
    expect(res.status).toBe(401)
  })

  it('POST /api/mood-board-drafts requires admin', async () => {
    const res = await draftsRoute.POST(req('http://localhost/api/mood-board-drafts', {
      method: 'POST', body: JSON.stringify({ customerId: 'x', projectId: 'y', title: 'z' })
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

d('a valid admin session can reach every Jarvis route (demo mode, no real Jarvis configured)', () => {
  let token = ''
  beforeAll(async () => {
    await initDB()
    token = await createSession()
  })

  it('POST /api/jarvis/chat returns a demo reply', async () => {
    const res = await chatRoute.POST(req('http://localhost/api/jarvis/chat', {
      method: 'POST', cookie: `${ADMIN_SESSION_COOKIE}=${token}`, body: JSON.stringify({ message: 'hej' })
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.demo).toBe(true)
    expect(typeof data.reply).toBe('string')
  })

  it('POST /api/jarvis/speak returns demo (no ElevenLabs configured)', async () => {
    const res = await speakRoute.POST(req('http://localhost/api/jarvis/speak', {
      method: 'POST', cookie: `${ADMIN_SESSION_COOKIE}=${token}`, body: JSON.stringify({ text: 'hej' })
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.demo).toBe(true)
  })

  it('GET /api/jarvis/trends returns demo trends matching the real schema', async () => {
    const res = await trendsRoute.GET(req('http://localhost/api/jarvis/trends', { cookie: `${ADMIN_SESSION_COOKIE}=${token}` }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.demo).toBe(true)
    const trend = body.data.trends[0]
    // The fields Del C's task explicitly names, per the real trend-scout
    // schema in ~/jarvis/skills/social-media/trend-scout/SKILL.md.
    expect(trend).toHaveProperty('suggested_client')
    expect(trend).toHaveProperty('usage_idea')
    const video = trend.videos[0]
    for (const field of ['url', 'platform', 'title', 'author', 'thumbnail_url', 'embed_type', 'posted_at', 'verified_at']) {
      expect(video).toHaveProperty(field)
    }
  })
})

d('mood board drafts: save-to-customer and approve/reject', () => {
  let customerId = ''
  let projectId = ''
  let adminToken = ''
  let customerToken = ''
  let draftId = ''

  beforeAll(async () => {
    await initDB()
    const c = await createCustomer({ name: 'Jarvis Draft Test Customer', pin: '4321' })
    customerId = c.id
    const p = await createProject({ customerId, name: 'Jarvis Draft Test Project', status: 'new' })
    projectId = p.id
    adminToken = await createSession()
    customerToken = await createCustomerSession(customerId)
  })

  afterAll(async () => {
    await deleteCustomer(customerId)
  })

  it('customers can never see drafts, even their own', async () => {
    const res = await draftsRoute.GET(req('http://localhost/api/mood-board-drafts', { cookie: `${CUSTOMER_SESSION_COOKIE}=${customerToken}` }))
    expect(res.status).toBe(401)
  })

  it('admin can save a trend to a customer as a draft', async () => {
    const res = await draftsRoute.POST(req('http://localhost/api/mood-board-drafts', {
      method: 'POST',
      cookie: `${ADMIN_SESSION_COOKIE}=${adminToken}`,
      body: JSON.stringify({
        customerId, projectId,
        title: 'Neon-lys walk-in intro',
        description: 'Test-beskrivelse',
        sourceUrl: 'https://www.tiktok.com/@test/video/123',
        thumbnailUrl: '',
        category: 'Trend'
      })
    }))
    expect(res.status).toBe(201)
    const draft = await res.json()
    expect(draft.status).toBe('draft')
    draftId = draft.id
  })

  it('the saved draft shows up for admin, scoped to its project', async () => {
    const res = await draftsRoute.GET(req('http://localhost/api/mood-board-drafts', { cookie: `${ADMIN_SESSION_COOKIE}=${adminToken}` }))
    expect(res.status).toBe(200)
    const drafts = await res.json()
    expect(drafts.some((d: { id: string; projectId: string }) => d.id === draftId && d.projectId === projectId)).toBe(true)
  })

  it('a customer cannot approve or reject a draft', async () => {
    const res = await draftByIdRoute.PATCH(
      req(`http://localhost/api/mood-board-drafts/${draftId}`, { method: 'PATCH', cookie: `${CUSTOMER_SESSION_COOKIE}=${customerToken}`, body: JSON.stringify({ action: 'approve' }) }),
      { params: Promise.resolve({ id: draftId }) }
    )
    expect(res.status).toBe(401)
  })

  it('admin approving a draft copies it into the customer-visible ideas list', async () => {
    const res = await draftByIdRoute.PATCH(
      req(`http://localhost/api/mood-board-drafts/${draftId}`, { method: 'PATCH', cookie: `${ADMIN_SESSION_COOKIE}=${adminToken}`, body: JSON.stringify({ action: 'approve' }) }),
      { params: Promise.resolve({ id: draftId }) }
    )
    expect(res.status).toBe(200)

    const ideas = await getIdeas(projectId)
    expect(ideas.some((i: { title: string }) => i.title === 'Neon-lys walk-in intro')).toBe(true)

    // Approved drafts drop out of the pending list.
    const pending = await draftsRoute.GET(req('http://localhost/api/mood-board-drafts', { cookie: `${ADMIN_SESSION_COOKIE}=${adminToken}` }))
    const pendingDrafts = await pending.json()
    expect(pendingDrafts.some((d: { id: string }) => d.id === draftId)).toBe(false)
  })

  it('admin rejecting a draft removes it from the pending list without creating an idea', async () => {
    const created = await draftsRoute.POST(req('http://localhost/api/mood-board-drafts', {
      method: 'POST',
      cookie: `${ADMIN_SESSION_COOKIE}=${adminToken}`,
      body: JSON.stringify({ customerId, projectId, title: 'Rejected trend' })
    }))
    const { id: rejectId } = await created.json()

    const res = await draftByIdRoute.PATCH(
      req(`http://localhost/api/mood-board-drafts/${rejectId}`, { method: 'PATCH', cookie: `${ADMIN_SESSION_COOKIE}=${adminToken}`, body: JSON.stringify({ action: 'reject' }) }),
      { params: Promise.resolve({ id: rejectId }) }
    )
    expect(res.status).toBe(200)

    const ideas = await getIdeas(projectId)
    expect(ideas.some((i: { title: string }) => i.title === 'Rejected trend')).toBe(false)

    const pending = await draftsRoute.GET(req('http://localhost/api/mood-board-drafts', { cookie: `${ADMIN_SESSION_COOKIE}=${adminToken}` }))
    const pendingDrafts = await pending.json()
    expect(pendingDrafts.some((d: { id: string }) => d.id === rejectId)).toBe(false)
  })
})
