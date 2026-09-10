import { NextRequest, NextResponse } from 'next/server'
import { initDB, getIdeas, createIdea } from '@/lib/db-postgres'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const ideas = await getIdeas(projectId)
    return NextResponse.json(ideas)
  } catch (error) {
    console.error('GET /api/ideas error:', error)
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    const idea = await createIdea(data.projectId, data)
    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    console.error('POST /api/ideas error:', error)
    return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 })
  }
}
