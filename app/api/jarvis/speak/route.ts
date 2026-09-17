import { NextRequest, NextResponse } from 'next/server'
import { initDB } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'
import { synthesizeSpeech } from '@/lib/jarvisClient'

export async function POST(request: NextRequest) {
  try {
    await initDB()
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { text } = await request.json()
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }
    const result = await synthesizeSpeech(text)
    // Always JSON now (not raw audio bytes): the HUD needs the alignment
    // data alongside the audio to drive syllable-precise core pulses, and
    // decodes audioBase64 client-side via the Web Audio API either way.
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/jarvis/speak error:', error)
    return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: 502 })
  }
}
