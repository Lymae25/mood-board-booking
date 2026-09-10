import { NextRequest, NextResponse } from 'next/server'
import { getTimeline, createTimelineItem, initDB } from '@/lib/db-postgres'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const timelineData = await getTimeline(projectId)
    return NextResponse.json(timelineData)
  } catch (error) {
    console.error('GET /api/timeline error:', error)
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    const { projectId, ...itemData } = data
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const item = await createTimelineItem(projectId, itemData)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('POST /api/timeline error:', error)
    return NextResponse.json({ error: 'Failed to create timeline item' }, { status: 500 })
  }
}
