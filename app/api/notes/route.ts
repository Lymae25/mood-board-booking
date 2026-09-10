import { NextRequest, NextResponse } from 'next/server'
import { initDB, getSceneNotes, createSceneNote } from '@/lib/db-postgres'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const sceneId = request.nextUrl.searchParams.get('sceneId')
    if (!sceneId) return NextResponse.json({ error: 'sceneId required' }, { status: 400 })
    const notes = await getSceneNotes(sceneId)
    return NextResponse.json(notes)
  } catch (error) {
    console.error('GET /api/notes error:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    const note = await createSceneNote(data.sceneId, data.projectId, data.content)
    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('POST /api/notes error:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
