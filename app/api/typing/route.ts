import { NextRequest, NextResponse } from 'next/server'

const TYPING_WINDOW_MS = 3000
const STALE_ENTRY_MS = 60000

interface TypingEntry {
  customerTypingAt: number
  adminTypingAt: number
}

// In-memory only, per the spec - fine for a single long-running Node
// process. Not shared across multiple server instances.
const typingState = new Map<string, TypingEntry>()

function pruneStaleEntries() {
  const now = Date.now()
  for (const [customerId, entry] of typingState) {
    if (now - entry.customerTypingAt > STALE_ENTRY_MS && now - entry.adminTypingAt > STALE_ENTRY_MS) {
      typingState.delete(customerId)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { customerId, sender } = data
    if (!customerId || (sender !== 'customer' && sender !== 'admin')) {
      return NextResponse.json({ error: 'customerId and sender ("customer" or "admin") required' }, { status: 400 })
    }

    const now = Date.now()
    const entry = typingState.get(customerId) || { customerTypingAt: 0, adminTypingAt: 0 }
    if (sender === 'customer') entry.customerTypingAt = now
    else entry.adminTypingAt = now
    typingState.set(customerId, entry)

    pruneStaleEntries()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/typing error:', error)
    return NextResponse.json({ error: 'Failed to update typing state' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId')
    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })

    const entry = typingState.get(customerId)
    const now = Date.now()
    const customerTyping = !!entry && now - entry.customerTypingAt < TYPING_WINDOW_MS
    const adminTyping = !!entry && now - entry.adminTypingAt < TYPING_WINDOW_MS

    return NextResponse.json({ customerTyping, adminTyping })
  } catch (error) {
    console.error('GET /api/typing error:', error)
    return NextResponse.json({ error: 'Failed to read typing state' }, { status: 500 })
  }
}
