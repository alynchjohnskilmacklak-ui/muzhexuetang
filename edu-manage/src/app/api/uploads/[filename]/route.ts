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
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
}

function uploadRoots() {
  const cwd = process.cwd()
  return [
    path.join(cwd, 'public', 'uploads'),
    path.join(cwd, '..', 'public', 'uploads'),
    path.join(cwd, '..', '..', 'public', 'uploads'),
  ]
}

function safeRelativePath(raw: string) {
  const decoded = decodeURIComponent(raw || '').replace(/\\/g, '/')
  const normalized = path.posix.normalize(decoded).replace(/^\/+/, '')
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return null
  return normalized
}

async function findUploadedFile(relativePath: string) {
  for (const root of uploadRoots()) {
    const rootPath = path.resolve(root)
    const filePath = path.resolve(rootPath, relativePath)
    if (!filePath.startsWith(rootPath + path.sep) && filePath !== rootPath) continue
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
  const relativePath = safeRelativePath(filename)
  if (!relativePath) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  const filePath = await findUploadedFile(relativePath)
  if (!filePath) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fileInfo = await stat(filePath)
  const etag = `"${relativePath}-${fileInfo.mtimeMs}"`
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

  const ext = relativePath.split('.').pop()?.toLowerCase() || ''
  const body = await readFile(filePath)
  return new NextResponse(body, {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'private, max-age=86400, immutable',
      ETag: etag,
    },
  })
})