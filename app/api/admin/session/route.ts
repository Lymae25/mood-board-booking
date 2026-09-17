import { NextRequest, NextResponse } from 'next/server'
import { initDB } from '@/lib/db-postgres'
import { requireAdminSession, getAdminAuth } from '@/lib/adminAuth'

// Cheap check the client can poll to know whether it's still logged in
// (e.g. to decide whether to show a "session expired" message instead of
// silently failing writes). Never used as the actual authorization check
// for a mutating route - each of those calls requireAdminSession itself.
// Also reports whether TOTP 2FA is currently enabled, so the admin
// settings UI knows which state to render without a separate round-trip.
export async function GET(request: NextRequest) {
  try {
    await initDB()
    const ok = await requireAdminSession(request)
    if (!ok) return NextResponse.json({ authenticated: false })
    const auth = await getAdminAuth()
    return NextResponse.json({ authenticated: true, totpEnabled: !!auth?.totpEnabled })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
