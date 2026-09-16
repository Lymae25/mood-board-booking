import { NextRequest, NextResponse } from 'next/server'
import { initDB } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { fetchLatestTrends } from '@/lib/jarvisClient'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const result = await fetchLatestTrends()
    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/jarvis/trends error:', error)
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 502 })
  }
}
