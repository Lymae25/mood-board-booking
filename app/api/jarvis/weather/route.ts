import { NextRequest, NextResponse } from 'next/server'
import { initDB } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { fetchCopenhagenWeather } from '@/lib/jarvisWeather'

// Weather needs no API key (Open-Meteo is open), but still goes through an
// admin-gated route rather than being fetched directly from the browser -
// same "all data via existing server routes with an admin session" rule as
// every other panel on /admin/jarvis, and it keeps the page's CSP/connect
// surface limited to this app's own origin.
export async function GET(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const weather = await fetchCopenhagenWeather()
    return NextResponse.json(weather)
  } catch (error) {
    console.error('GET /api/jarvis/weather error:', error)
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}
