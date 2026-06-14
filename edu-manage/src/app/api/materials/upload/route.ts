import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { MaterialSource } from '@prisma/client'
import { normalizeMaterialAudience, normalizeMaterialStatus } from '@/lib/material-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const userId = (session.user as { id: string }).id

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const title = formData.get('title') as string | null
  const grade = formData.get('grade') as string | null
  const subject = formData.get('subject') as string | null
  const description = formData.get('description') as string | null
  const audience = normalizeMaterialAudience(formData.get('audience'))
  const status = normalizeMaterialStatus(formData.get('status'))
  const tags = String(formData.get('tags') || '')
    .split(/[，,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
  const isPinned = formData.get('isPinned') === 'true'

  if (!file || !title || !grade || !subject) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z']
  const ext = path.extname(file.name).toLowerCase()
  if (!allowedExts.includes(ext)) {
    return NextResponse.json({ error: '仅支持 PDF、Word、Excel、PPT、图片和压缩包格式' }, { status: 400 })
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: '文件大小不能超过 50MB' }, { status: 400 })
  }
  const prisma = await getRequestPrisma()

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'materials')
  await mkdir(uploadDir, { recursive: true })
  const filePath = path.join(uploadDir, fileName)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  const fileType = ext === '.pdf'
    ? 'pdf'
    : ['.doc', '.docx'].includes(ext)
    ? 'word'
    : ['.xls', '.xlsx'].includes(ext)
    ? 'excel'
    : ['.ppt', '.pptx'].includes(ext)
    ? 'ppt'
    : ['.zip', '.rar', '.7z'].includes(ext)
    ? 'archive'
    : ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
    ? 'image'
    : 'other'
  const fileUrl = `/uploads/materials/${fileName}`
  const material = await prisma.studyMaterial.create({
    data: {
      title,
      grade,
      subject,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType,
      description: description || null,
      uploadedBy: userId,
      audience,
      source: MaterialSource.ADMIN,
      status,
      tags,
      isPinned,
    },
  })

  return NextResponse.json(material, { status: 201 })
})
