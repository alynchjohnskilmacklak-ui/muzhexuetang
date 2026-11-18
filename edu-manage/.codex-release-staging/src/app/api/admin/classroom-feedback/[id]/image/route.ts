import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { AuthError, requireAdminUser } from '@/lib/auth/guards'
import { readStoredBuffer } from '@/lib/storage'
import { feedbackPdfImageCandidates } from '@/lib/classroom-feedback/pdf-image'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { prisma } = await requireAdminUser()
    const { id: feedbackId } = await params
    const rawImageIndex = request.nextUrl.searchParams.get('index')
    const imageIndex = rawImageIndex === null ? Number.NaN : Number(rawImageIndex)
    if (!Number.isInteger(imageIndex) || imageIndex < 0) {
      return NextResponse.json({ error: '图片序号无效' }, { status: 400 })
    }

    const feedback = await prisma.classroomFeedback.findUnique({
      where: { id: feedbackId },
      select: { imageUrls: true },
    })
    const feedbackImageValue = feedback?.imageUrls[imageIndex]
    if (!feedbackImageValue) {
      return NextResponse.json({ error: '反馈图片不存在' }, { status: 404 })
    }

    const asset = await prisma.fileAsset.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { storageKey: feedbackImageValue },
          { url: feedbackImageValue },
        ],
      },
      select: {
        storageKey: true,
        storageDriver: true,
        mimeType: true,
        previewUrl: true,
        thumbnailUrl: true,
      },
    })

    const candidates = feedbackPdfImageCandidates(feedbackImageValue, asset)
    for (const candidate of candidates) {
      try {
        const body = await readStoredBuffer(candidate.storageKey, candidate.storageDriver)
        return new NextResponse(new Uint8Array(body), {
          headers: {
            'Content-Type': candidate.mimeType,
            'Content-Length': String(body.byteLength),
            'Content-Disposition': 'inline',
            'Cache-Control': 'private, max-age=300',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      } catch {
        // Try the next safe variant, ending with the original object.
      }
    }

    console.error('[feedback-pdf-image] object unavailable', { feedbackId, imageIndex })
    return NextResponse.json({ error: '反馈图片读取失败' }, { status: 502 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
})
