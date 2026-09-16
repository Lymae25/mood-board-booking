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
    const { audio, demo } = await synthesizeSpeech(text)
    if (demo || !audio) {
      // No ElevenLabs credentials configured - tell the client to fall back
      // to the browser's own speechSynthesis instead of playing an <audio>.
      return NextResponse.json({ demo: true })
    }
    return new NextResponse(audio, { headers: { 'Content-Type': 'audio/mpeg' } })
  } catch (error) {
    console.error('POST /api/jarvis/speak error:', error)
    return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: 502 })
  }
}
