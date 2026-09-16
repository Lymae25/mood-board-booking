import { NextRequest, NextResponse } from 'next/server'
import { initDB } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'

// Cheap check the client can poll to know whether it's still logged in
// (e.g. to decide whether to show a "session expired" message instead of
// silently failing writes). Never used as the actual authorization check
// for a mutating route - each of those calls requireAdminSession itself.
export async function GET(request: NextRequest) {
  try {
    await initDB()
    const ok = await requireAdminSession(request)
    return NextResponse.json({ authenticated: ok })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
