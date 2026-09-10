import { sql } from '@vercel/postgres'

export async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        clientName TEXT,
        status TEXT,
        startDate TEXT,
        endDate TEXT,
        createdAt TEXT
      )
    `
    
    await sql`
      CREATE TABLE IF NOT EXISTS scenes (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        sceneNumber INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        imageUrl TEXT,
        createdAt TEXT
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS sceneNotes (
        id TEXT PRIMARY KEY,
        sceneId TEXT NOT NULL,
        projectId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS ideas (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        imageUrl TEXT,
        category TEXT,
        createdAt TEXT
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS timeline (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        dueDate TEXT,
        status TEXT,
        imageUrl TEXT,
        createdAt TEXT
      )
    `
  } catch (e) {
    console.error('DB init error:', e)
  }
}

export async function getScenes(projectId: string) {
  try {
    const result = await sql`SELECT * FROM scenes WHERE projectId = ${projectId} ORDER BY sceneNumber ASC`
    return result.rows
  } catch (e) {
    console.error('getScenes error:', e)
    return []
  }
}

export async function createScene(projectId: string, scene: any) {
  try {
    const id = Date.now().toString()
    await sql`
      INSERT INTO scenes (id, projectId, sceneNumber, title, description, imageUrl, createdAt)
      VALUES (${id}, ${projectId}, ${scene.sceneNumber}, ${scene.title}, ${scene.description}, ${scene.imageUrl || ''}, ${new Date().toISOString()})
    `
    return { id, projectId, ...scene, createdAt: new Date().toISOString() }
  } catch (e) {
    console.error('createScene error:', e)
    throw e
  }
}

export async function getSceneNotes(sceneId: string) {
  try {
    const result = await sql`SELECT * FROM sceneNotes WHERE sceneId = ${sceneId} ORDER BY createdAt DESC`
    return result.rows
  } catch (e) {
    console.error('getSceneNotes error:', e)
    return []
  }
}

export async function createSceneNote(sceneId: string, projectId: string, content: string) {
  try {
    const id = Date.now().toString()
    await sql`
      INSERT INTO sceneNotes (id, sceneId, projectId, content, createdAt)
      VALUES (${id}, ${sceneId}, ${projectId}, ${content}, ${new Date().toISOString()})
    `
    return { id, sceneId, projectId, content, createdAt: new Date().toISOString() }
  } catch (e) {
    console.error('createSceneNote error:', e)
    throw e
  }
}

export async function getIdeas(projectId: string) {
  try {
    const result = await sql`SELECT * FROM ideas WHERE projectId = ${projectId}`
    return result.rows
  } catch (e) {
    console.error('getIdeas error:', e)
    return []
  }
}

export async function createIdea(projectId: string, idea: any) {
  try {
    const id = Date.now().toString()
    await sql`
      INSERT INTO ideas (id, projectId, title, description, imageUrl, category, createdAt)
      VALUES (${id}, ${projectId}, ${idea.title}, ${idea.description}, ${idea.imageUrl || ''}, ${idea.category}, ${new Date().toISOString()})
    `
    return { id, projectId, ...idea, createdAt: new Date().toISOString() }
  } catch (e) {
    console.error('createIdea error:', e)
    throw e
  }
}

export async function getTimeline(projectId: string) {
  try {
    const result = await sql`SELECT * FROM timeline WHERE projectId = ${projectId}`
    return result.rows
  } catch (e) {
    console.error('getTimeline error:', e)
    return []
  }
}

export async function createTimelineItem(projectId: string, item: any) {
  try {
    const id = Date.now().toString()
    await sql`
      INSERT INTO timeline (id, projectId, title, description, dueDate, status, imageUrl, createdAt)
      VALUES (${id}, ${projectId}, ${item.title}, ${item.description}, ${item.dueDate}, ${item.status}, ${item.imageUrl || ''}, ${new Date().toISOString()})
    `
    return { id, projectId, ...item, createdAt: new Date().toISOString() }
  } catch (e) {
    console.error('createTimelineItem error:', e)
    throw e
  }
}
EOFcat > app/api/ideas/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { getIdeas, createIdea, initDB } from '@/lib/db-postgres'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const ideasData = await getIdeas(projectId)
    return NextResponse.json(ideasData)
  } catch (error) {
    console.error('GET /api/ideas error:', error)
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    const { projectId, ...ideaData } = data
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    const idea = await createIdea(projectId, ideaData)
    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    console.error('POST /api/ideas error:', error)
    return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 })
  }
}
