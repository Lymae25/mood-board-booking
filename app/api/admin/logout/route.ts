import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { destroySession, SESSION_COOKIE } from '@/lib/adminAuth'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (token) await destroySession(token)
    cookieStore.delete(SESSION_COOKIE)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/admin/logout error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
