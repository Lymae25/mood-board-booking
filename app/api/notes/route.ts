import { NextRequest, NextResponse } from 'next/server'
import { initDB, getSceneNotes, createSceneNote, getSceneById, getProjectById } from '@/lib/db-postgres'
import { requireOwnerOrAdmin } from '@/lib/customerAuth'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const sceneId = request.nextUrl.searchParams.get('sceneId')
    if (!sceneId) return NextResponse.json({ error: 'sceneId required' }, { status: 400 })
    const scene = await getSceneById(sceneId)
    const project = scene ? await getProjectById(scene.projectId) : null
    if (!project || !(await requireOwnerOrAdmin(request, project.customerId))) {
      return NextResponse.json([], { status: 401 })
    }
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
    const scene = data.sceneId ? await getSceneById(data.sceneId) : null
    const project = scene ? await getProjectById(scene.projectId) : null
    if (!project || !(await requireOwnerOrAdmin(request, project.customerId))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    // File the note under the scene's own projectId, not whatever the
    // client claimed, so it can never end up attached to a different
    // project than the scene it's actually a note on.
    const note = await createSceneNote(data.sceneId, scene.projectId, data.content)
    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('POST /api/notes error:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
