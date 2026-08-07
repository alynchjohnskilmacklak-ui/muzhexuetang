import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAuthenticatedUser } from '@/lib/auth/guards'
import { getPrismaForDivision } from '@/lib/prisma'
import { resolveTeacherForUser } from '@/lib/performance'
import { canAccessFeedbackImage } from '@/lib/classroom-feedback/access'
import { readStoredBuffer } from '@/lib/storage'
import { verifyFeedbackExportImageToken } from '@/lib/classroom-feedback/export-image-url'
import { extractUploadStorageKey } from '@/lib/upload-url'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const id = request.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: '缺少文件ID' }, { status: 400 })
  const hasValidExportToken = verifyFeedbackExportImageToken(
    id,
    request.nextUrl.searchParams.get('division'),
    request.nextUrl.searchParams.get('expires'),
    request.nextUrl.searchParams.get('token'),
  )
  const user = hasValidExportToken ? null : await requireAuthenticatedUser()

  const signedDivision = request.nextUrl.searchParams.get('division')
  const prisma = hasValidExportToken
    ? getPrismaForDivision(signedDivision === 'SENIOR' ? 'SENIOR' : 'JUNIOR')
    : user!.prisma
  const asset = await prisma.fileAsset.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      mimeType: true,
      storageDriver: true,
      storageKey: true,
      previewUrl: true,
      thumbnailUrl: true,
      feedbackId: true,
    },
  })
  if (!asset) return NextResponse.json({ error: '反馈图片不存在' }, { status: 404 })

  if (!hasValidExportToken && user) {
    let teacherId = user.teacherId
    if (String(user.role).toLowerCase() === 'teacher' && !teacherId) {
      teacherId = (await resolveTeacherForUser(user, prisma))?.id || null
    }
    const access = await canAccessFeedbackImage(
      prisma,
      { id: user.id, role: user.role, teacherId },
      [asset.storageKey],
    )
    if (!access.get(asset.storageKey)?.allowed) {
      return NextResponse.json({ error: '无权访问该反馈图片' }, { status: 403 })
    }
  }

  const preferredKey = extractUploadStorageKey(asset.previewUrl || asset.thumbnailUrl || asset.storageKey)
  let body: Buffer
  let mimeType = preferredKey === asset.storageKey ? asset.mimeType : 'image/webp'
  try {
    body = await readStoredBuffer(preferredKey, asset.storageDriver)
  } catch {
    body = await readStoredBuffer(asset.storageKey, asset.storageDriver)
    mimeType = asset.mimeType
  }
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': 'inline',
      'Cache-Control': hasValidExportToken ? 'private, max-age=3600' : 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
})
