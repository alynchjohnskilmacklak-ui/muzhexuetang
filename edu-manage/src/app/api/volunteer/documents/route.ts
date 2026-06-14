import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { getOrCreateVolunteerGuide } from '@/lib/volunteer'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  const guide = await getOrCreateVolunteerGuide()
  const documents = await prisma.guideDocument.findMany({ where: { guideId: guide.id }, orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ documents })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const guide = await getOrCreateVolunteerGuide()
  const form = await req.formData()
  const file = form.get('file') as File | null
  const name = String(form.get('name') || file?.name || '志愿填报附件')
  const type = String(form.get('type') || 'OTHER') as 'POLICY_DOC' | 'QUOTA_TABLE' | 'OTHER'
  if (!file) return NextResponse.json({ error: '请选择文件' }, { status: 400 })

  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.txt', '.csv']
  const ext = path.extname(file.name).toLowerCase()
  if (!allowedExts.includes(ext)) {
    return NextResponse.json({ error: '仅支持 PDF、图片、Office 文档、压缩包及文本文件' }, { status: 400 })
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: '文件大小不能超过 20MB' }, { status: 400 })
  }
  const prisma = await getRequestPrisma()

  const bytes = Buffer.from(await file.arrayBuffer())
  const safeName = `${Date.now()}-${file.name}`.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_')
  const uploadDir = path.join(process.cwd(), 'public', 'volunteer', 'docs')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, safeName), bytes)

  const count = await prisma.guideDocument.count({ where: { guideId: guide.id } })
  const document = await prisma.guideDocument.create({
    data: {
      guideId: guide.id,
      name,
      type: ['POLICY_DOC', 'QUOTA_TABLE', 'OTHER'].includes(type) ? type : 'OTHER',
      fileUrl: `/volunteer/docs/${safeName}`,
      fileSize: `${Math.round(file.size / 1024)} KB`,
      sortOrder: count + 1,
    },
  })
  revalidatePath('/volunteer')
  revalidatePath('/parent/volunteer')
  return NextResponse.json(document, { status: 201 })
})
