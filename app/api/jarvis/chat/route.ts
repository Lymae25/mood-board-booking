import { NextRequest, NextResponse } from 'next/server'
import { initDB, logJarvisAction } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { chatWithJarvis } from '@/lib/jarvisClient'

export async function POST(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { message, mode } = await request.json()
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }
    const result = await chatWithJarvis(message, mode)
    // Plain-Danish activity log (Del A, punkt 6): the detail is just the
    // message itself - the admin log view renders "Chat: <besked>" from it.
    await logJarvisAction('chat', message.slice(0, 200))
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/jarvis/chat error:', error)
    return NextResponse.json({ error: 'Failed to reach Jarvis' }, { status: 502 })
  }
}
