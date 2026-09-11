import postgres from 'postgres'

let sql: any = null

export function getDb() {
  if (!sql) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL not set')
    sql = postgres(connectionString)
  }
  return sql
}

export async function initDB() {
  try {
    const sql = getDb()
    await sql`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, clientName TEXT, logoUrl TEXT, status TEXT, startDate TEXT, endDate TEXT, createdAt TEXT)`
    await sql`CREATE TABLE IF NOT EXISTS scenes (id TEXT PRIMARY KEY, projectId TEXT NOT NULL, sceneNumber INTEGER, title TEXT NOT NULL, description TEXT, imageUrl TEXT, createdAt TEXT)`
    await sql`CREATE TABLE IF NOT EXISTS sceneNotes (id TEXT PRIMARY KEY, sceneId TEXT NOT NULL, projectId TEXT NOT NULL, content TEXT NOT NULL, createdAt TEXT)`
    await sql`CREATE TABLE IF NOT EXISTS ideas (id TEXT PRIMARY KEY, projectId TEXT NOT NULL, title TEXT NOT NULL, description TEXT, imageUrl TEXT, category TEXT, createdAt TEXT)`
    await sql`CREATE TABLE IF NOT EXISTS timeline (id TEXT PRIMARY KEY, projectId TEXT NOT NULL, title TEXT NOT NULL, description TEXT, dueDate TEXT, status TEXT, imageUrl TEXT, createdAt TEXT)`
  } catch (e) { console.error('DB init error:', e) }
}

export async function getProjects() {
  try { const sql = getDb(); return await sql`SELECT * FROM projects ORDER BY createdAt DESC` } catch (e) { return [] }
}

export async function createProject(data: any) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO projects (id, name, description, clientName, logoUrl, status, startDate, endDate, createdAt) VALUES (${id}, ${data.name}, ${data.description || ''}, ${data.clientName || ''}, ${data.logoUrl || ''}, ${data.status}, ${data.startDate || ''}, ${data.endDate || ''}, ${new Date().toISOString()})`
  return { id, ...data, createdAt: new Date().toISOString() }
}

export async function deleteProject(projectId: string) {
  try {
    const sql = getDb()
    await sql`DELETE FROM projects WHERE id = ${projectId}`
    await sql`DELETE FROM scenes WHERE projectId = ${projectId}`
    await sql`DELETE FROM sceneNotes WHERE projectId = ${projectId}`
    await sql`DELETE FROM ideas WHERE projectId = ${projectId}`
    await sql`DELETE FROM timeline WHERE projectId = ${projectId}`
    return true
  } catch (e) { console.error('deleteProject error:', e); return false }
}

export async function getScenes(projectId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM scenes WHERE projectId = ${projectId} ORDER BY sceneNumber ASC` } catch (e) { return [] }
}

export async function createScene(projectId: string, scene: any) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO scenes (id, projectId, sceneNumber, title, description, imageUrl, createdAt) VALUES (${id}, ${projectId}, ${scene.sceneNumber}, ${scene.title}, ${scene.description}, ${scene.imageUrl || ''}, ${new Date().toISOString()})`
  return { id, projectId, ...scene, createdAt: new Date().toISOString() }
}

export async function getSceneNotes(sceneId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM sceneNotes WHERE sceneId = ${sceneId} ORDER BY createdAt DESC` } catch (e) { return [] }
}

export async function createSceneNote(sceneId: string, projectId: string, content: string) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO sceneNotes (id, sceneId, projectId, content, createdAt) VALUES (${id}, ${sceneId}, ${projectId}, ${content}, ${new Date().toISOString()})`
  return { id, sceneId, projectId, content, createdAt: new Date().toISOString() }
}

export async function getIdeas(projectId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM ideas WHERE projectId = ${projectId}` } catch (e) { return [] }
}

export async function createIdea(projectId: string, idea: any) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO ideas (id, projectId, title, description, imageUrl, category, createdAt) VALUES (${id}, ${projectId}, ${idea.title}, ${idea.description}, ${idea.imageUrl || ''}, ${idea.category}, ${new Date().toISOString()})`
  return { id, projectId, ...idea, createdAt: new Date().toISOString() }
}

export async function getTimeline(projectId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM timeline WHERE projectId = ${projectId}` } catch (e) { return [] }
}

export async function createTimelineItem(projectId: string, item: any) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO timeline (id, projectId, title, description, dueDate, status, imageUrl, createdAt) VALUES (${id}, ${projectId}, ${item.title}, ${item.description}, ${item.dueDate}, ${item.status}, ${item.imageUrl || ''}, ${new Date().toISOString()})`
  return { id, projectId, ...item, createdAt: new Date().toISOString() }
}
