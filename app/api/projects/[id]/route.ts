import { NextRequest, NextResponse } from 'next/server'
import { deleteProject, initDB } from '@/lib/db-postgres'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await initDB()
    const success = await deleteProject(params.id)
    if (success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
