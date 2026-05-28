import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { getCurrentUser } from '@/lib/get-user'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'NO_FILE' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: '只能上传图片' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: '图片不能超过10MB' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() || 'jpg'
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/api/uploads/${filename}`, legacyUrl: `/uploads/${filename}` })
}
