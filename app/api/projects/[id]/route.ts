import { NextRequest, NextResponse } from 'next/server'
import { deleteProject, initDB, getDb, getProjectById } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { requireOwnerOrAdmin } from '@/lib/customerAuth'

// A single project by id - the customer-facing ProjectDetail page uses this
// instead of fetching the entire unfiltered /api/projects list (which used
// to leak every customer's projects to any visitor's browser).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await initDB()
    const project = await getProjectById(id)
    if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (!(await requireOwnerOrAdmin(request, project.customerId))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json(project)
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

// Deleting a whole project is admin-only. PATCH (status/endDate) stays
// reachable by the owning customer too - see below.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { id } = await params
    await initDB()
    const success = await deleteProject(id)
    if (success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}

// Customers legitimately update their own project's status from their
// dashboard (StatusBadge.tsx) - but previously any id worked with no
// ownership check at all, so any visitor could change any customer's
// project status. Now it's that project's own customer, or an admin.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await initDB()
    const project = await getProjectById(id)
    if (!project || !(await requireOwnerOrAdmin(request, project.customerId))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const data = await request.json()
    const sql = getDb()
    if (data.status) {
      await sql`UPDATE projects SET "status" = ${data.status} WHERE "id" = ${id}`
    }
    if (data.endDate) {
      await sql`UPDATE projects SET "endDate" = ${data.endDate} WHERE "id" = ${id}`
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
