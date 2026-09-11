import { NextRequest, NextResponse } from 'next/server'
import { initDB, deleteMeeting } from '@/lib/db-postgres'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
