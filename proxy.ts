import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'

// Next.js 16 renamed middleware.js to proxy.js (same mechanism, defaults to
// the Node.js runtime now, so importing lib/adminAuth's Postgres-backed
// session check here works fine). This only gates the ADMIN PAGES so a
// logged-out visitor never even sees the shell before the API calls inside
// it fail - the authoritative check for every admin API route is still the
// requireAdminSession() call inside that route handler itself (defense in
// depth, not a replacement).
export async function proxy(request: NextRequest) {
  const authenticated = await requireAdminSession(request)
  if (!authenticated) {
    const url = new URL('/', request.url)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/jarvis']
}
