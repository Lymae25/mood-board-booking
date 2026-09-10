import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { initDB } from '@/lib/db-postgres'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const result = await sql`SELECT * FROM projects ORDER BY createdAt DESC`
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/projects error:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    const id = Date.now().toString()
    await sql`
      INSERT INTO projects (id, name, description, clientName, status, startDate, endDate, createdAt)
      VALUES (${id}, ${data.name}, ${data.description || ''}, ${data.clientName || ''}, ${data.status}, ${data.startDate || ''}, ${data.endDate || ''}, ${new Date().toISOString()})
    `
    return NextResponse.json({ id, ...data, createdAt: new Date().toISOString() }, { status: 201 })
  } catch (error) {
    console.error('POST /api/projects error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
