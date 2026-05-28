import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const CONTENT_TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function uploadRoots() {
  const cwd = process.cwd()
  return [
    path.join(cwd, 'public', 'uploads'),
    path.join(cwd, '..', 'public', 'uploads'),
    path.join(cwd, '..', '..', 'public', 'uploads'),
  ]
}

async function findUploadedFile(filename: string) {
  const safeName = path.basename(filename)
  for (const root of uploadRoots()) {
    const filePath = path.join(root, safeName)
    try {
      const info = await stat(filePath)
      if (info.isFile()) return filePath
    } catch {
      // Try the next possible runtime root.
    }
  }
  return null
}

export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ filename: string }> }) => {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { filename } = await params
  const safeName = path.basename(decodeURIComponent(filename || ''))
  if (!safeName || safeName !== filename) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  const filePath = await findUploadedFile(safeName)
  if (!filePath) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fileInfo = await stat(filePath)
  const etag = `"${safeName}-${fileInfo.mtimeMs}"`
  const ifNoneMatch = req.headers.get('if-none-match')
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'private, max-age=86400, immutable',
      },
    })
  }

  const ext = safeName.split('.').pop()?.toLowerCase() || ''
  const body = await readFile(filePath)
  return new NextResponse(body, {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'private, max-age=86400, immutable',
      ETag: etag,
    },
  })
})
