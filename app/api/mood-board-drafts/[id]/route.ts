import { NextRequest, NextResponse } from 'next/server'
import { initDB, approveMoodBoardDraft, rejectMoodBoardDraft, logJarvisAction } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'

// PATCH { action: 'approve' | 'reject' } - approving copies the draft into
// the existing customer-visible "ideas" table (see approveMoodBoardDraft),
// so no changes were needed to the customer PIN dashboard to display it.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { id } = await params
    const { action } = await request.json()
    if (action === 'approve') {
      const ok = await approveMoodBoardDraft(id)
      if (!ok) return NextResponse.json({ error: 'not_found_or_already_handled' }, { status: 404 })
      await logJarvisAction('approve_trend_draft', `id=${id}`)
      return NextResponse.json({ ok: true })
    }
    if (action === 'reject') {
      const ok = await rejectMoodBoardDraft(id)
      await logJarvisAction('reject_trend_draft', `id=${id}`)
      return NextResponse.json({ ok })
    }
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  } catch (error) {
    console.error('PATCH /api/mood-board-drafts/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
  }
}
