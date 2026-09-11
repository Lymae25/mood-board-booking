import { NextRequest, NextResponse } from 'next/server'
import { initDB, getMeetings, createMeeting } from '@/lib/db-postgres'

export async function GET() {
  try {
    await initDB()
    const meetings = await getMeetings()
    return NextResponse.json(meetings)
  } catch (error) {
    console.error('GET /api/meetings error:', error)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const data = await request.json()
    if (!data.customerId || !data.title || !data.meetingDate || !data.meetingTime) {
      return NextResponse.json({ error: 'customerId, title, meetingDate and meetingTime required' }, { status: 400 })
    }
    const meeting = await createMeeting(data)
    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error('POST /api/meetings error:', error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}
