import { NextRequest, NextResponse } from 'next/server'
import { initDB, getIdeas, createIdea, getProjectById } from '@/lib/db-postgres'
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
    const project = data.projectId ? await getProjectById(data.projectId) : null
    if (!project || !(await requireOwnerOrAdmin(request, project.customerId))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const idea = await createIdea(data.projectId, data)
    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    console.error('POST /api/ideas error:', error)
    return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 })
  }
}
