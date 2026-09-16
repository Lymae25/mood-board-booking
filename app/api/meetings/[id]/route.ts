import { NextRequest, NextResponse } from 'next/server'
import { initDB, deleteMeeting } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { id } = await params
    await initDB()
    const success = await deleteMeeting(id)
    if (success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  } catch (error) {
    console.error('DELETE /api/meetings/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 })
  }
}
