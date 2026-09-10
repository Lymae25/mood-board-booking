import { NextRequest, NextResponse } from 'next/server'
import { initDB, getProjects, createProject as dbCreateProject, deleteProject } from '@/lib/db-postgres'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const projects = await getProjects()
    return NextResponse.json(projects)
  } catch (error) {
    console.error('GET /api/projects error:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    const newProject = await dbCreateProject(data)
    return NextResponse.json(newProject, { status: 201 })
  } catch (error) {
    console.error('POST /api/projects error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
