import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { apiHandler } from '@/lib/api-handler'
import { isOssEnabled, readStoredBuffer } from '@/lib/storage'
import { requireAuthenticatedUser } from '@/lib/auth/guards'
import { resolveTeacherForUser } from '@/lib/performance'
import { canAccessFeedbackImage } from '@/lib/classroom-feedback/access'

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
    process.env.UPLOAD_DIR,
    path.join(cwd, 'public', 'uploads'),
    path.join(cwd, '..', 'public', 'uploads'),
    path.join(cwd, '..', '..', 'public', 'uploads'),
  ].filter(Boolean) as string[]
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
  const user = await requireAuthenticatedUser()

  const { filename } = await params
  const relativePath = safeRelativePath(filename)
  if (!relativePath) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  const prisma = user.prisma
  let teacherId = user.teacherId
  if (String(user.role).toLowerCase() === 'teacher' && !teacherId) {
    teacherId = (await resolveTeacherForUser(user, prisma))?.id || null
  }
  const access = await canAccessFeedbackImage(
    prisma,
    { id: user.id, role: user.role, teacherId },
    [relativePath],
  )
  if (!access.get(relativePath)?.allowed) {
    console.warn('[uploads/read] denied feedback image', { key: relativePath, userId: user.id, role: user.role })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const filePath = await findUploadedFile(relativePath)
  if (!filePath) {
    if (!isOssEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    try {
      const body = await readStoredBuffer(relativePath, 'aliyun-oss')
      const ext = relativePath.split('.').pop()?.toLowerCase() || ''
      return new NextResponse(new Uint8Array(body), {
        headers: {
          'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
        },
      })
    } catch (error) {
      console.error('[uploads:oss-fallback]', {
        key: relativePath,
        message: error instanceof Error ? error.message : String(error),
      })
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

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
