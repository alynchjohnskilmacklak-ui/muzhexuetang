import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'NO_FILE' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: '只能上传图片' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: '图片不能超过10MB' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const magicBytes: { bytes: number[]; offset?: number }[] = [
    { bytes: [0xFF, 0xD8, 0xFF] },
    { bytes: [0x89, 0x50, 0x4E, 0x47] },
    { bytes: [0x47, 0x49, 0x46] },
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
    { bytes: [0x00, 0x00, 0x00], offset: 0 },
  ]
  const isValidImage = magicBytes.some(({ bytes, offset = 0 }) =>
    bytes.every((byte, i) => buffer[offset + i] === byte)
  )
  if (!isValidImage) {
    return NextResponse.json({ error: '文件格式不合法，只支持 JPG/PNG/GIF/WebP' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/api/uploads/${filename}`, legacyUrl: `/uploads/${filename}` })
})
