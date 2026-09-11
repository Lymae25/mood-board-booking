import { NextRequest, NextResponse } from 'next/server'
import { initDB, getProjects, getAllCustomers, getAllTimelineItems } from '@/lib/db-postgres'

function statusLabel(status: string) {
  const map: Record<string, string> = {
    'new': 'New',
    'under-construction': 'Under Construction',
    'editing': 'Editing',
    'pending-verification': 'Pending Verification',
    'done': 'Done'
  }
  return map[status] || 'New'
}

// Escape text per RFC5545 (backslash first, then the rest)
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Fold a single logical line at 75 octets with a leading-space continuation
function foldLine(line: string): string {
  if (line.length <= 75) return line
  let result = ''
  let idx = 0
  let first = true
  while (idx < line.length) {
    const chunkSize = first ? 75 : 74
    result += (first ? '' : '\r\n ') + line.slice(idx, idx + chunkSize)
    idx += chunkSize
    first = false
  }
  return result
}

function toICSDate(dateStr: string): string {
  return dateStr.replace(/-/g, '').slice(0, 8)
}

function addDaysToICSDate(icsDate: string, days: number): string {
  const y = parseInt(icsDate.slice(0, 4), 10)
  const m = parseInt(icsDate.slice(4, 6), 10) - 1
  const d = parseInt(icsDate.slice(6, 8), 10)
  const date = new Date(Date.UTC(y, m, d))
  date.setUTCDate(date.getUTCDate() + days)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

function buildEventLines(opts: { uid: string, dateStr: string, summary: string, description: string, url: string, stamp: string }): string[] {
  const dtStart = toICSDate(opts.dateStr)
  const dtEnd = addDaysToICSDate(dtStart, 1)
  return [
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${opts.stamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeICSText(opts.summary)}`,
    `DESCRIPTION:${escapeICSText(opts.description)}`,
    `URL:${opts.url}`,
    'END:VEVENT'
  ]
}

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const [projects, customers, timeline] = await Promise.all([
      getProjects(),
      getAllCustomers(),
      getAllTimelineItems()
    ]) as [any[], any[], any[]]

    const origin = request.nextUrl.origin
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const eventLines: string[] = []

    for (const p of projects) {
      if (!p.endDate) continue
      const customer = customers.find(c => c.id === p.customerId)
      const customerName = customer?.name || 'Ukendt kunde'
      const url = `${origin}/project/${p.id}`
      eventLines.push(...buildEventLines({
        uid: `project-${p.id}@chromevaultstudios`,
        dateStr: p.endDate,
        summary: `${customerName} - ${p.name}`,
        description: `${p.description || ''}\nStatus: ${statusLabel(p.status)}`.trim(),
        url,
        stamp
      }))
    }

    for (const t of timeline) {
      if (!t.dueDate) continue
      const project = projects.find(p => p.id === t.projectId)
      const customer = project ? customers.find(c => c.id === project.customerId) : undefined
      const customerName = customer?.name || 'Ukendt kunde'
      const projectName = project?.name || 'Ukendt projekt'
      const url = project ? `${origin}/project/${project.id}` : origin
      eventLines.push(...buildEventLines({
        uid: `milestone-${t.id}@chromevaultstudios`,
        dateStr: t.dueDate,
        summary: `${customerName} - ${projectName}: ${t.title}`,
        description: `${t.description || ''}\nStatus: ${statusLabel(t.status)}`.trim(),
        url,
        stamp
      }))
    }

    const allLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Chrome Vault Studios//Mood Board Booking//DA',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Chrome Vault Studios',
      'X-WR-CALDESC:Deadlines og milestones fra Chrome Vault Studios',
      ...eventLines,
      'END:VCALENDAR'
    ]

    const ics = allLines.map(foldLine).join('\r\n') + '\r\n'

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Disposition': 'inline; filename="chrome-vault-studios.ics"'
      }
    })
  } catch (error) {
    console.error('GET /api/calendar/feed.ics error:', error)
    const fallback = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Chrome Vault Studios//Mood Board Booking//DA\r\nCALSCALE:GREGORIAN\r\nEND:VCALENDAR\r\n'
    return new NextResponse(fallback, {
      status: 500,
      headers: { 'Content-Type': 'text/calendar; charset=utf-8' }
    })
  }
}
