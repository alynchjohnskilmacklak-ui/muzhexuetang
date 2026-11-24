import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'
import { readStoredBuffer } from '@/lib/storage'
import { extractUploadStorageKey } from '@/lib/upload-url'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { verifyPublicTeacherPortraitToken } from '@/lib/public-teacher-showcase-token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function shouldMosaicPortrait(sourceUrl: string) {
  // Bundled avatar-library images are the approved illustrated/stylized
  // portraits. Any portrait uploaded or linked by a teacher is treated as a
  // real person's photo and pixelated before it reaches the public homepage.
  return !sourceUrl.trim().toLowerCase().startsWith('/avatars/')
}

async function readPortrait(value: string) {
  if (value.startsWith('data:image/')) {
    const match = value.match(/^data:image\/(?:png|jpe?g|webp|avif);base64,([a-z\d+/=]+)$/i)
    if (!match) throw new Error('Unsupported portrait data')
    const buffer = Buffer.from(match[1], 'base64')
    if (buffer.length > 8 * 1024 * 1024) throw new Error('Portrait is too large')
    return buffer
  }

  if (value.startsWith('/avatars/') || value.startsWith('/people/')) {
    const publicRoot = path.resolve(process.cwd(), 'public')
    const filePath = path.resolve(publicRoot, value.replace(/^\/+/, ''))
    if (!filePath.startsWith(`${publicRoot}${path.sep}`)) throw new Error('Invalid portrait path')
    return readFile(filePath)
  }

  const key = extractUploadStorageKey(value)
  if (!key || key.includes('..') || key.startsWith('\\')) throw new Error('Invalid portrait key')
  return readStoredBuffer(key)
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const identity = verifyPublicTeacherPortraitToken(token)

  if (!identity) {
    return NextResponse.json({ error: 'Portrait link is invalid or expired' }, { status: 403 })
  }

  try {
    const db = isDualDbEnabled() ? getPrismaForDivision(identity.division) : prisma
    const teacher = await db.teacher.findFirst({
      where: {
        id: identity.teacherId,
        status: 'ACTIVE',
        ...(isDualDbEnabled() ? { division: identity.division } : {}),
      },
      select: { id: true, name: true, gender: true, avatar: true },
    })
    if (!teacher) return new NextResponse(null, { status: 404 })

    const sourceUrl = teacher.avatar || getTeacherAvatarUrl(null, teacher.gender, teacher.id)
    const mosaicPortrait = shouldMosaicPortrait(sourceUrl)
    const source = await readPortrait(sourceUrl)
    const pipeline = sharp(source, { animated: false, failOn: 'none' })
      .rotate()
      .resize(320, 320, { fit: 'cover', position: 'attention' })

    const output = mosaicPortrait
      ? await pipeline
        .resize(22, 22, { fit: 'cover' })
        .resize(320, 320, { fit: 'fill', kernel: sharp.kernel.nearest })
        .webp({ quality: 50, effort: 3 })
        .toBuffer()
      : await pipeline.webp({ quality: 78 }).toBuffer()

    return new NextResponse(new Uint8Array(output), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.warn('[public-teacher-showcase:portrait]', error)
    return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } })
  }
}
