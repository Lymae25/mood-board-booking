import { NextRequest, NextResponse } from 'next/server'
import { initDB, getProjects, getProjectsByCustomer, createProject as dbCreateProject } from '@/lib/db-postgres'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const customerId = request.nextUrl.searchParams.get('customerId')
    const projects = customerId ? await getProjectsByCustomer(customerId) : await getProjects()
    return NextResponse.json(projects)
  } catch (error) {
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
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
