import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

// Extensions accepted by /api/upload - keep this in sync with that route.
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime'
}

// Only our own generated filenames (timestamp-hex.ext) are ever valid here -
// reject anything else outright, since this reads straight off disk by name.
const SAFE_FILENAME = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params

    if (!SAFE_FILENAME.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const ext = path.extname(filename).slice(1).toLowerCase()
    const contentType = CONTENT_TYPES[ext]
    if (!contentType) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const filePath = path.join(uploadsDir, filename)

    // Defense in depth: confirm the resolved path is still inside uploadsDir.
    if (path.dirname(filePath) !== uploadsDir) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const buffer = await readFile(filePath)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('GET /api/uploads/[filename] error:', error)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
