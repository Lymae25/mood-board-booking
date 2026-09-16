import { NextRequest, NextResponse } from 'next/server'
import { deleteProject, initDB, getDb } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'

// Deleting a whole project is admin-only. PATCH (status/endDate) stays open -
// customers legitimately update their own project's status from their
// dashboard (see StatusBadge.tsx, used un-gated in CustomerDashboard.tsx).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { id } = await params
    await initDB()
    const success = await deleteProject(id)
    if (success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await request.json()
    await initDB()
    const sql = getDb()
    if (data.status) {
      await sql`UPDATE projects SET "status" = ${data.status} WHERE "id" = ${id}`
    }
    if (data.endDate) {
      await sql`UPDATE projects SET "endDate" = ${data.endDate} WHERE "id" = ${id}`
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
