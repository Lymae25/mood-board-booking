import { NextRequest, NextResponse } from 'next/server'
import { initDB, getScenes, createScene, getProjectById } from '@/lib/db-postgres'
import { requireOwnerOrAdmin } from '@/lib/customerAuth'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const project = await getProjectById(projectId)
    if (!project || !(await requireOwnerOrAdmin(request, project.customerId))) {
      return NextResponse.json([], { status: 401 })
    }
    const scenes = await getScenes(projectId)
    return NextResponse.json(scenes)
  } catch (error) {
    console.error('GET /api/scenes error:', error)
    return NextResponse.json({ error: 'Failed to fetch scenes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    const project = data.projectId ? await getProjectById(data.projectId) : null
    if (!project || !(await requireOwnerOrAdmin(request, project.customerId))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const scene = await createScene(data.projectId, data)
    return NextResponse.json(scene, { status: 201 })
  } catch (error) {
    console.error('POST /api/scenes error:', error)
    return NextResponse.json({ error: 'Failed to create scene' }, { status: 500 })
  }
}
