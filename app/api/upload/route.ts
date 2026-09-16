import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'
import { initDB } from '@/lib/db-postgres'
import { requireAnyAuthenticatedSession } from '@/lib/customerAuth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Images and PDFs only - this used to also accept mp4/mov, but nothing in
// the app actually needs video upload (every caller is a logo/scene/idea
// image field or a chat attachment restricted to image/* in the browser),
// and every extra accepted type is extra attack surface for a public write
// endpoint. Existing already-uploaded videos, if any, still render fine -
// GET /api/uploads/[filename] is unchanged.
const ALLOWED_EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf'
}

// The extension and the browser-supplied Content-Type are both just labels
// the client chose - neither proves what the file actually is. Checking
// the file's own magic-byte signature stops someone renaming, say, an SVG
// with an embedded <script> to "logo.png" and having it served back with
// an image Content-Type that a browser might still sniff differently than
// intended, or a spoofed filename smuggling something else through the
// extension check entirely.
function matchesSignature(buffer: Buffer, ext: string): boolean {
  const bytes = (...vals: number[]) => vals.every((v, i) => buffer[i] === v)
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return bytes(0xff, 0xd8, 0xff)
    case 'png':
      return bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    case 'gif':
      return bytes(0x47, 0x49, 0x46, 0x38) // "GIF8"
    case 'webp':
      return bytes(0x52, 0x49, 0x46, 0x46) && buffer.slice(8, 12).toString('ascii') === 'WEBP' // "RIFF"...."WEBP"
    case 'pdf':
      return bytes(0x25, 0x50, 0x44, 0x46) // "%PDF"
    default:
      return false
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()

    // Only logged-in admins or a logged-in customer may upload - this used
    // to accept files from anyone, with no login at all.
    if (!(await requireAnyAuthenticatedSession(request))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'no_file' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
    }

    const ext = path.extname(file.name).slice(1).toLowerCase()
    const expectedMimeType = ALLOWED_EXTENSIONS[ext]
    if (!expectedMimeType) {
      return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!matchesSignature(buffer, ext)) {
      return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const uniqueName = `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`
    await writeFile(path.join(uploadsDir, uniqueName), buffer)

    return NextResponse.json({ url: `/api/uploads/${uniqueName}` }, { status: 201 })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
