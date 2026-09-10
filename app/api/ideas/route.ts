import { NextRequest, NextResponse } from 'next/server'
import { getIdeas, createIdea } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }
    const ideas = await getIdeas(projectId)
    return NextResponse.json(ideas)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { projectId, ...ideaData } = data
    const idea = await createIdea(projectId, ideaData)
    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 })
  }
}
