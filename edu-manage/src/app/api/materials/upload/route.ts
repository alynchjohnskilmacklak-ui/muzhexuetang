import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { MaterialSource } from '@prisma/client'
import { normalizeMaterialAudience, normalizeMaterialStatus } from '@/lib/material-visibility'
import { apiHandler } from '@/lib/api-handler'
import {
  getStoredObjectMetadata,
  isOssEnabled,
  readStoredPrefix,
  StorageConfigurationError,
  uploadBuffer,
} from '@/lib/storage'
import { detectMaterialFileType, hasValidMaterialFileSignature, isAllowedMaterialExtension } from '@/lib/material-file'

export const dynamic = 'force-dynamic'

function requireAdmin(session: { user?: { role?: string; id?: string } } | null): string | null {
  const role = (session?.user as { role?: string } | undefined)?.role
  const id = (session?.user as { id?: string } | undefined)?.id
  if (!session?.user || role !== 'admin') return null
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
  if (!isAllowedMaterialExtension(ext)) {
    return NextResponse.json({ error: '仅支持 PDF、Word、Excel、PPT、图片和压缩包格式' }, { status: 400 })
  }

  const maxSize = isOssEnabled() ? 200 * 1024 * 1024 : 50 * 1024 * 1024
  if (file.size > maxSize) {
    const limitMB = Math.round(maxSize / 1024 / 1024)
    return NextResponse.json({ error: `文件大小不能超过 ${limitMB}MB` }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!hasValidMaterialFileSignature(buffer, ext)) {
    return NextResponse.json({ error: '文件内容与扩展名不匹配，请检查文件后重试' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  let result
  try {
    result = await uploadBuffer(buffer, {
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
      fileType: detectMaterialFileType(ext),
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
  const { key, fileName, fileSize, title, grade, subject, description, audience: audienceRaw, status: statusRaw, tags: tagsStr, isPinned } = body as Record<string, unknown>

  if (!key || !fileName || !fileSize || !title || !grade || !subject) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const ext = path.extname(String(fileName)).toLowerCase()
  if (!isAllowedMaterialExtension(ext)) {
    return NextResponse.json({ error: '仅支持 PDF、Word、Excel、PPT、图片和压缩包格式' }, { status: 400 })
  }

  if (typeof fileSize !== 'number' || !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > 200 * 1024 * 1024) {
    return NextResponse.json({ error: '文件大小不能超过 200MB' }, { status: 400 })
  }

  const storageKey = String(key)
  const keyExt = path.extname(storageKey).toLowerCase()
  if (!/^materials\/material-\d+-[0-9a-f-]+\.[a-z0-9]+$/i.test(storageKey) || keyExt !== ext) {
    return NextResponse.json({ error: '上传对象路径无效，请重新选择文件上传' }, { status: 400 })
  }

  try {
    const [metadata, prefix] = await Promise.all([
      getStoredObjectMetadata(storageKey, 'aliyun-oss'),
      readStoredPrefix(storageKey, 16, 'aliyun-oss'),
    ])
    if (metadata.size !== fileSize || metadata.size <= 0 || metadata.size > 200 * 1024 * 1024) {
      return NextResponse.json({ error: 'OSS 文件大小校验失败，请重新上传' }, { status: 400 })
    }
    if (!hasValidMaterialFileSignature(prefix, ext)) {
      return NextResponse.json({ error: '文件内容与扩展名不匹配，请检查文件后重试' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }

  const prisma = await getRequestPrisma()
  const material = await prisma.studyMaterial.create({
    data: {
      title: String(title),
      grade: String(grade),
      subject: String(subject),
      fileUrl: storageKey,
      fileName: String(fileName),
      fileSize: fileSize as number,
      fileType: detectMaterialFileType(ext),
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
