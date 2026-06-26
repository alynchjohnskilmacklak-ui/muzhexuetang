import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { safeFilename, generateOssPostSignature, isOssEnabled } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
const MAX_SIZE = 200 * 1024 * 1024 // 200MB

export const GET = apiHandler(async () => {
  return NextResponse.json({ enabled: isOssEnabled() })
})

export const POST = apiHandler(async (req: NextRequest) => {
  if (!isOssEnabled()) {
    return NextResponse.json({ error: 'OSS 未启用' }, { status: 400 })
  }

  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || (role !== 'admin' && role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const fileName = (body.fileName as string) || ''
  const contentType = (body.contentType as string) || ''

  if (!fileName) {
    return NextResponse.json({ error: '缺少 fileName' }, { status: 400 })
  }

  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: '仅支持 PDF、Word、Excel、PPT 文档格式' }, { status: 400 })
  }

  const key = `materials/${safeFilename(fileName, 'material')}`
  const sig = await generateOssPostSignature(key, {
    maxSize: MAX_SIZE,
    expireSeconds: 300,
    contentType: contentType || undefined,
  })

  return NextResponse.json(sig)
})
