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
    await sql`CREATE TABLE IF NOT EXISTS customers ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "logoUrl" TEXT, "pin" TEXT NOT NULL, "createdAt" TEXT)`
    await sql`CREATE TABLE IF NOT EXISTS projects ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT, "clientName" TEXT, "logoUrl" TEXT, "status" TEXT, "startDate" TEXT, "endDate" TEXT, "createdAt" TEXT)`
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS "customerId" TEXT`
    await sql`CREATE TABLE IF NOT EXISTS scenes ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "sceneNumber" INTEGER, "title" TEXT NOT NULL, "description" TEXT, "imageUrl" TEXT, "createdAt" TEXT)`
    await sql`CREATE TABLE IF NOT EXISTS sceneNotes ("id" TEXT PRIMARY KEY, "sceneId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "content" TEXT NOT NULL, "createdAt" TEXT)`
    await sql`CREATE TABLE IF NOT EXISTS ideas ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "imageUrl" TEXT, "category" TEXT, "createdAt" TEXT)`
    await sql`CREATE TABLE IF NOT EXISTS timeline ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "dueDate" TEXT, "status" TEXT, "imageUrl" TEXT, "createdAt" TEXT)`
    await sql`CREATE TABLE IF NOT EXISTS messages ("id" TEXT PRIMARY KEY, "customerId" TEXT NOT NULL, "sender" TEXT NOT NULL, "content" TEXT NOT NULL, "sceneRef" TEXT, "projectRef" TEXT, "readByAdmin" BOOLEAN DEFAULT FALSE, "readByCustomer" BOOLEAN DEFAULT FALSE, "createdAt" TEXT)`
  } catch (e) { console.error('DB init error:', e) }
}

export async function getCustomers() {
  try { const sql = getDb(); return await sql`SELECT "id", "name", "logoUrl" FROM customers ORDER BY "name" ASC` } catch (e) { return [] }
}

export async function getAllCustomers() {
  try { const sql = getDb(); return await sql`SELECT * FROM customers ORDER BY "name" ASC` } catch (e) { return [] }
}

export async function createCustomer(data: any) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO customers ("id", "name", "logoUrl", "pin", "createdAt") VALUES (${id}, ${data.name}, ${data.logoUrl || ''}, ${data.pin}, ${new Date().toISOString()})`
  return { id, ...data, createdAt: new Date().toISOString() }
}

export async function updateCustomerPin(customerId: string, newPin: string) {
  try {
    const sql = getDb()
    await sql`UPDATE customers SET "pin" = ${newPin} WHERE "id" = ${customerId}`
    return true
  } catch (e) { return false }
}

export async function deleteCustomer(customerId: string) {
  try {
    const sql = getDb()
    const projects = await sql`SELECT "id" FROM projects WHERE "customerId" = ${customerId}`
    for (const p of projects) {
      await sql`DELETE FROM scenes WHERE "projectId" = ${p.id}`
      await sql`DELETE FROM sceneNotes WHERE "projectId" = ${p.id}`
      await sql`DELETE FROM ideas WHERE "projectId" = ${p.id}`
      await sql`DELETE FROM timeline WHERE "projectId" = ${p.id}`
    }
    await sql`DELETE FROM projects WHERE "customerId" = ${customerId}`
    await sql`DELETE FROM customers WHERE "id" = ${customerId}`
    return true
  } catch (e) { console.error('deleteCustomer error:', e); return false }
}

export async function verifyPin(customerId: string, pin: string) {
  try {
    const sql = getDb()
    const result = await sql`SELECT * FROM customers WHERE "id" = ${customerId} AND "pin" = ${pin}`
    return result.length > 0
  } catch (e) { return false }
}

export async function getProjects() {
  try { const sql = getDb(); return await sql`SELECT * FROM projects ORDER BY "createdAt" DESC` } catch (e) { return [] }
}

export async function getProjectsByCustomer(customerId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM projects WHERE "customerId" = ${customerId} ORDER BY "createdAt" DESC` } catch (e) { return [] }
}

export async function createProject(data: any) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO projects ("id", "customerId", "name", "description", "clientName", "logoUrl", "status", "startDate", "endDate", "createdAt") VALUES (${id}, ${data.customerId || ''}, ${data.name}, ${data.description || ''}, ${data.clientName || ''}, ${data.logoUrl || ''}, ${data.status}, ${data.startDate || ''}, ${data.endDate || ''}, ${new Date().toISOString()})`
  return { id, ...data, createdAt: new Date().toISOString() }
}

export async function deleteProject(projectId: string) {
  try {
    const sql = getDb()
    await sql`DELETE FROM projects WHERE "id" = ${projectId}`
    await sql`DELETE FROM scenes WHERE "projectId" = ${projectId}`
    await sql`DELETE FROM sceneNotes WHERE "projectId" = ${projectId}`
    await sql`DELETE FROM ideas WHERE "projectId" = ${projectId}`
    await sql`DELETE FROM timeline WHERE "projectId" = ${projectId}`
    return true
  } catch (e) { console.error('deleteProject error:', e); return false }
}

export async function getScenes(projectId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM scenes WHERE "projectId" = ${projectId} ORDER BY "sceneNumber" ASC` } catch (e) { return [] }
}

export async function createScene(projectId: string, scene: any) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO scenes ("id", "projectId", "sceneNumber", "title", "description", "imageUrl", "createdAt") VALUES (${id}, ${projectId}, ${scene.sceneNumber}, ${scene.title}, ${scene.description}, ${scene.imageUrl || ''}, ${new Date().toISOString()})`
  return { id, projectId, ...scene, createdAt: new Date().toISOString() }
}

export async function getSceneNotes(sceneId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM sceneNotes WHERE "sceneId" = ${sceneId} ORDER BY "createdAt" DESC` } catch (e) { return [] }
}

export async function createSceneNote(sceneId: string, projectId: string, content: string) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO sceneNotes ("id", "sceneId", "projectId", "content", "createdAt") VALUES (${id}, ${sceneId}, ${projectId}, ${content}, ${new Date().toISOString()})`
  return { id, sceneId, projectId, content, createdAt: new Date().toISOString() }
}

export async function getIdeas(projectId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM ideas WHERE "projectId" = ${projectId}` } catch (e) { return [] }
}

export async function createIdea(projectId: string, idea: any) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO ideas ("id", "projectId", "title", "description", "imageUrl", "category", "createdAt") VALUES (${id}, ${projectId}, ${idea.title}, ${idea.description}, ${idea.imageUrl || ''}, ${idea.category}, ${new Date().toISOString()})`
  return { id, projectId, ...idea, createdAt: new Date().toISOString() }
}

export async function getTimeline(projectId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM timeline WHERE "projectId" = ${projectId}` } catch (e) { return [] }
}

export async function getAllTimelineItems() {
  try { const sql = getDb(); return await sql`SELECT * FROM timeline ORDER BY "dueDate" ASC` } catch (e) { return [] }
}

export async function createTimelineItem(projectId: string, item: any) {
  const sql = getDb()
  const id = Date.now().toString()
  await sql`INSERT INTO timeline ("id", "projectId", "title", "description", "dueDate", "status", "imageUrl", "createdAt") VALUES (${id}, ${projectId}, ${item.title}, ${item.description}, ${item.dueDate}, ${item.status}, ${item.imageUrl || ''}, ${new Date().toISOString()})`
  return { id, projectId, ...item, createdAt: new Date().toISOString() }
}

export async function getMessagesByCustomer(customerId: string) {
  try { const sql = getDb(); return await sql`SELECT * FROM messages WHERE "customerId" = ${customerId} ORDER BY "createdAt" ASC` } catch (e) { return [] }
}

export async function getAllMessages() {
  try { const sql = getDb(); return await sql`SELECT * FROM messages ORDER BY "createdAt" ASC` } catch (e) { return [] }
}

export async function createMessage(data: any) {
  const sql = getDb()
  const id = Date.now().toString()
  const sender = data.sender === 'admin' ? 'admin' : 'customer'
  const readByAdmin = sender === 'admin'
  const readByCustomer = sender === 'customer'
  const createdAt = new Date().toISOString()
  await sql`INSERT INTO messages ("id", "customerId", "sender", "content", "sceneRef", "projectRef", "readByAdmin", "readByCustomer", "createdAt") VALUES (${id}, ${data.customerId}, ${sender}, ${data.content}, ${data.sceneRef || null}, ${data.projectRef || null}, ${readByAdmin}, ${readByCustomer}, ${createdAt})`
  return { id, customerId: data.customerId, sender, content: data.content, sceneRef: data.sceneRef || null, projectRef: data.projectRef || null, readByAdmin, readByCustomer, createdAt }
}

export async function markMessagesRead(customerId: string, reader: 'admin' | 'customer') {
  try {
    const sql = getDb()
    if (reader === 'admin') {
      await sql`UPDATE messages SET "readByAdmin" = TRUE WHERE "customerId" = ${customerId} AND "sender" = 'customer'`
    } else {
      await sql`UPDATE messages SET "readByCustomer" = TRUE WHERE "customerId" = ${customerId} AND "sender" = 'admin'`
    }
    return true
  } catch (e) { console.error('markMessagesRead error:', e); return false }
}
