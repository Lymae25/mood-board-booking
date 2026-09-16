import { NextRequest, NextResponse } from 'next/server'
import { initDB, getJarvisActionLog } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'

// Del D: admin-only view of what's been done from the Jarvis HUD (chat
// turns, trend saves, draft approvals/rejections) - see logJarvisAction()
// in lib/db-postgres.ts, which every relevant route already calls.
export async function GET(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(limitParam || '100', 10) || 100, 1), 500)
    const entries = await getJarvisActionLog(limit)
    return NextResponse.json(entries)
  } catch (error) {
    console.error('GET /api/jarvis/log error:', error)
    return NextResponse.json({ error: 'Failed to fetch log' }, { status: 500 })
  }
}
