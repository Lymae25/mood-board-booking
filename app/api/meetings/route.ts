import { NextRequest, NextResponse } from 'next/server'
import { initDB, getMeetings, createMeeting } from '@/lib/db-postgres'
import { requireAdminSession } from '@/lib/adminAuth'

// Returns every customer's meetings unfiltered - no customer-facing surface
// calls this (confirmed by inspection), and there is no legitimate reason
// for a customer to see another customer's schedule, so this is admin-only.
export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    await initDB()
    const meetings = await getMeetings()
    return NextResponse.json(meetings)
  } catch (error) {
    console.error('GET /api/meetings error:', error)
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

// Scheduling a meeting is only ever done from the admin panel.
export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminSession(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
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
