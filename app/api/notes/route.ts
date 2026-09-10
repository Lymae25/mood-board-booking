import { NextRequest, NextResponse } from 'next/server'
import { getSceneNotes, createSceneNote } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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
    const data = await request.json()
    const { sceneId, projectId, content } = data
    if (!sceneId || !projectId || !content) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    const note = await createSceneNote(sceneId, projectId, content)
    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('POST /api/notes error:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
