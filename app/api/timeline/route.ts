import { NextRequest, NextResponse } from 'next/server'
import { initDB, getTimeline, getAllTimelineItems, createTimelineItem, getProjectById } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { requireOwnerOrAdmin } from '@/lib/customerAuth'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    if (await requireAdminSession(request)) {
      const timeline = await getAllTimelineItems()
      return NextResponse.json(timeline)
    }
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const project = await getProjectById(projectId)
    if (!project || !(await requireOwnerOrAdmin(request, project.customerId))) {
      return NextResponse.json([], { status: 401 })
    }
    const timeline = await getTimeline(projectId)
    return NextResponse.json(timeline)
  } catch (error) {
    console.error('GET /api/timeline error:', error)
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
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
    const item = await createTimelineItem(data.projectId, data)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('POST /api/timeline error:', error)
    return NextResponse.json({ error: 'Failed to create timeline item' }, { status: 500 })
  }
}
