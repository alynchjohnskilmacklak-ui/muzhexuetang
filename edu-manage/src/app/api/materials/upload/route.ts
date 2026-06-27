import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { MaterialSource } from '@prisma/client'
import { normalizeMaterialAudience, normalizeMaterialStatus } from '@/lib/material-visibility'
import { apiHandler } from '@/lib/api-handler'
import { uploadBuffer, safeFilename, isOssEnabled, StorageConfigurationError } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z']

function detectFileType(ext: string) {
  if (ext === '.pdf') return 'pdf'
  if ('.doc.docx'.includes(ext)) return 'word'
  if ('.xls.xlsx'.includes(ext)) return 'excel'
  if ('.ppt.pptx'.includes(ext)) return 'ppt'
  if ('.zip.rar.7z'.includes(ext)) return 'archive'
  if ('.jpg.jpeg.png.gif.webp'.includes(ext)) return 'image'
  return 'other'
}

function requireAdmin(session: { user?: { role?: string; id?: string } } | null): string | null {
  const role = (session?.user as { role?: string } | undefined)?.role
  const id = (session?.user as { id?: string } | undefined)?.id
  if (!session?.user || (role !== 'admin' && role !== 'teacher')) return null
  return id || null
}

/** 传统 FormData 上传：文件在请求体中，经 ECS 中转写入存储 */
export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const userId = requireAdmin(session)
  if (!userId) return NextResponse.json({ error: '无权限' }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: '上传请求格式错误，请使用 multipart/form-data', code: 'INVALID_FORM_DATA' },
      { status: 400 }
    )
  }
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

  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: '仅支持 PDF、Word、Excel、PPT、图片和压缩包格式' }, { status: 400 })
  }

  const maxSize = isOssEnabled() ? 200 * 1024 * 1024 : 50 * 1024 * 1024
  if (file.size > maxSize) {
    const limitMB = Math.round(maxSize / 1024 / 1024)
    return NextResponse.json({ error: `文件大小不能超过 ${limitMB}MB` }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  let result
  try {
    result = await uploadBuffer(Buffer.from(await file.arrayBuffer()), {
      originalName: file.name,
      mimeType: file.type,
      prefix: 'materials',
    })
  } catch (err) {
    if (err instanceof StorageConfigurationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      )
    }
    throw err
  }

  const material = await prisma.studyMaterial.create({
    data: {
      title,
      grade,
      subject,
      fileUrl: result.storageKey,
      fileName: file.name,
      fileSize: file.size,
      fileType: detectFileType(ext),
      storageDriver: result.storageDriver,
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

/** OSS 直传后轻量写入：前端已把文件 POST 到 OSS，这里只存元数据 */
export const PUT = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const userId = requireAdmin(session)
  if (!userId) return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { key, fileName, fileSize, contentType, title, grade, subject, description, audience: audienceRaw, status: statusRaw, tags: tagsStr, isPinned } = body as Record<string, unknown>

  if (!key || !fileName || !fileSize || !title || !grade || !subject) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const ext = path.extname(String(fileName)).toLowerCase()
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: '仅支持 PDF、Word、Excel、PPT、图片和压缩包格式' }, { status: 400 })
  }

  if (typeof fileSize !== 'number' || fileSize > 200 * 1024 * 1024) {
    return NextResponse.json({ error: '文件大小不能超过 200MB' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  const material = await prisma.studyMaterial.create({
    data: {
      title: String(title),
      grade: String(grade),
      subject: String(subject),
      fileUrl: String(key),
      fileName: String(fileName),
      fileSize: fileSize as number,
      fileType: detectFileType(ext),
      storageDriver: 'aliyun-oss',
      description: description ? String(description) : null,
      uploadedBy: userId,
      audience: normalizeMaterialAudience(audienceRaw),
      source: MaterialSource.ADMIN,
      status: normalizeMaterialStatus(statusRaw),
      tags: String(tagsStr || '')
        .split(/[，,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      isPinned: Boolean(isPinned),
    },
  })

  return NextResponse.json(material, { status: 201 })
})
