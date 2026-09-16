import { NextRequest, NextResponse } from 'next/server'
import { initDB, getProjects, getProjectsByCustomer, createProject as dbCreateProject } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { requireOwnerOrAdmin } from '@/lib/customerAuth'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const customerId = request.nextUrl.searchParams.get('customerId')
    if (customerId) {
      if (!(await requireOwnerOrAdmin(request, customerId))) return NextResponse.json([], { status: 401 })
      const projects = await getProjectsByCustomer(customerId)
      return NextResponse.json(projects)
    }
    // No customerId filter means "every customer's projects at once" -
    // admin only (used to return this to any unauthenticated caller).
    if (!(await requireAdminSession(request))) return NextResponse.json([], { status: 401 })
    const projects = await getProjects()
    return NextResponse.json(projects)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// Creating a project used to accept any customerId in the body with no
// check - now it's only that customer themselves (own dashboard's "new
// project" button) or an admin creating one on a customer's behalf.
export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    if (!(await requireOwnerOrAdmin(request, data.customerId))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const newProject = await dbCreateProject(data)
    return NextResponse.json(newProject, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
