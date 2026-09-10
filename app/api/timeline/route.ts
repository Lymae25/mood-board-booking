import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { initDB } from '@/lib/db-postgres'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const result = await sql`SELECT * FROM timeline WHERE projectId = ${projectId}`
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    const id = Date.now().toString()
    await sql`
      INSERT INTO timeline (id, projectId, title, description, dueDate, status, imageUrl, createdAt)
      VALUES (${id}, ${data.projectId}, ${data.title}, ${data.description || ''}, ${data.dueDate}, ${data.status}, ${data.imageUrl || ''}, ${new Date().toISOString()})
    `
    return NextResponse.json({ id, ...data, createdAt: new Date().toISOString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create timeline item' }, { status: 500 })
  }
}
