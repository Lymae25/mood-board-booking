import { NextRequest, NextResponse } from 'next/server'
import { initDB } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkJarvisStatus } from '@/lib/jarvisClient'

// Admin-only status ping: is Jarvis reachable, and how fast, for the HUD's
// status panel line graph. Pings Jarvis's own documented /health path
// rather than running a real (expensive) chat turn.
export async function GET(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const status = await checkJarvisStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('GET /api/jarvis/status error:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
