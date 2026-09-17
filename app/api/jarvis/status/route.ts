import { NextRequest, NextResponse } from 'next/server'
import { initDB, getAllCustomers, getProjects, getAllMessages } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkJarvisStatus } from '@/lib/jarvisClient'
import { getRequestHistory, getProcessUptimeSeconds } from '@/lib/requestMetrics'

// Admin-only status ping: is Jarvis reachable, and how fast, for the HUD's
// status panel line graph. Pings Jarvis's own documented /health path
// rather than running a real (expensive) chat turn.
//
// This is also the single source for every headline number the HUD shows
// (customer/project counts, unread messages, uptime, network activity) -
// each used to be fetched separately on the client and silently fell back
// to an empty array whenever its own request failed, which is why the
// customer/project panels could read 0 while a different panel (unread
// messages, fetched independently) still showed real data. Computing them
// all here, from the same DB call and the same admin check that already
// works, means they can no longer drift apart.
export async function GET(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const [status, customers, projects, messages] = await Promise.all([
      checkJarvisStatus(),
      getAllCustomers(),
      getProjects(),
      getAllMessages()
    ])
    const unreadMessages = (messages as { sender: string; readByAdmin: boolean }[])
      .filter(m => m.sender === 'customer' && !m.readByAdmin).length
    return NextResponse.json({
      ...status,
      customerCount: customers.length,
      projectCount: projects.length,
      unreadMessages,
      uptimeSeconds: getProcessUptimeSeconds(),
      networkHistory: getRequestHistory()
    })
  } catch (error) {
    console.error('GET /api/jarvis/status error:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
