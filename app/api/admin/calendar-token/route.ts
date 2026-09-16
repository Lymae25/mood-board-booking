import { NextRequest, NextResponse } from 'next/server'
import { initDB } from '@/lib/db-postgres'
import { requireAdminSession, getOrCreateCalendarToken, regenerateCalendarToken } from '@/lib/adminAuth'

// Returns the private, tokenized subscribe URL for /api/calendar/feed.ics
// (see that route for why it needs a token instead of the session cookie).
export async function GET(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const token = await getOrCreateCalendarToken()
    if (!token) return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 })
    const url = `${request.nextUrl.origin}/api/calendar/feed.ics?token=${token}`
    return NextResponse.json({ url })
  } catch (error) {
    console.error('GET /api/admin/calendar-token error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// Invalidates the old link (e.g. if it ever leaked) and issues a new one.
export async function DELETE(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const token = await regenerateCalendarToken()
    if (!token) return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 })
    const url = `${request.nextUrl.origin}/api/calendar/feed.ics?token=${token}`
    return NextResponse.json({ url })
  } catch (error) {
    console.error('DELETE /api/admin/calendar-token error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
