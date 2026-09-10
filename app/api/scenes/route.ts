import { NextRequest, NextResponse } from 'next/server'
import { getScenes, createScene } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const scenesData = await getScenes(projectId)
    return NextResponse.json(scenesData)
  } catch (error) {
    console.error('GET /api/scenes error:', error)
    return NextResponse.json({ error: 'Failed to fetch scenes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { projectId, ...sceneData } = data
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const scene = await createScene(projectId, sceneData)
    return NextResponse.json(scene, { status: 201 })
  } catch (error) {
    console.error('POST /api/scenes error:', error)
    return NextResponse.json({ error: 'Failed to create scene', details: String(error) }, { status: 500 })
  }
}
