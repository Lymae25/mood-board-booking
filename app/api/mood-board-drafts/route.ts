import { NextRequest, NextResponse } from 'next/server'
import { initDB, createMoodBoardDraft, getMoodBoardDrafts, getCustomerById, logJarvisAction } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'

// Drafts are never customer-visible (see lib/db-postgres.ts's comment on
// createMoodBoardDraft) - both routes here are admin-only, no exceptions.
export async function GET(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json(await getMoodBoardDrafts())
  } catch (error) {
    console.error('GET /api/mood-board-drafts error:', error)
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const data = await request.json()
    if (!data.customerId || !data.projectId || !data.title) {
      return NextResponse.json({ error: 'customerId, projectId and title required' }, { status: 400 })
    }
    const draft = await createMoodBoardDraft(data)
    // Plain-Danish activity log (Del A, punkt 6): store the customer's name,
    // not their id, so the admin log view can render "Trend gemt til
    // <kundenavn>" directly with no further lookup.
    const customer = await getCustomerById(data.customerId)
    await logJarvisAction('save_trend_to_customer', customer?.name || data.customerId)
    return NextResponse.json(draft, { status: 201 })
  } catch (error) {
    console.error('POST /api/mood-board-drafts error:', error)
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 })
  }
}
