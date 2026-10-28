import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { readStoredBuffer } from '@/lib/storage'
import { requireAdminUser } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

function safeDownloadName(value: string | null | undefined) {
  return (value || '课堂资料原图').replace(/[\r\n"\\/]/g, '_')
}

export const GET = apiHandler(async (req: NextRequest) => {
  const { prisma } = await requireAdminUser()
  const assetId = req.nextUrl.searchParams.get('assetId')?.trim()
  if (!assetId) return NextResponse.json({ error: '缺少图片参数' }, { status: 400 })

  const asset = await prisma.fileAsset.findFirst({
    where: { id: assetId, deletedAt: null },
    select: {
      originalName: true,
      mimeType: true,
      storageDriver: true,
      storageKey: true,
    },
  })
  if (!asset) return NextResponse.json({ error: '原图不存在' }, { status: 404 })

  try {
    const buffer = await readStoredBuffer(asset.storageKey, asset.storageDriver)
    const filename = safeDownloadName(asset.originalName)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': asset.mimeType || 'application/octet-stream',
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[feedback-image-download]', { assetId, error })
    return NextResponse.json({ error: '原图读取失败' }, { status: 502 })
  }
})
