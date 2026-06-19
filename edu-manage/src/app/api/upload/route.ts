import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { uploadFile, safeFilename } from '@/lib/storage'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

/** 按 uploadType 限制文件大小 */
function getSizeLimit(uploadType: string | null): number {
  switch (uploadType) {
    case 'teacher-feedback': return 5 * 1024 * 1024   // 5MB
    case 'parent-upload':   return 10 * 1024 * 1024   // 10MB
    case 'admin-material':  return 50 * 1024 * 1024   // 50MB
    case 'avatar':          return 5 * 1024 * 1024    // 5MB
    default:                return 10 * 1024 * 1024   // 10MB
  }
}

function getOwnerType(uploadType: string | null, role: string): string {
  if (uploadType === 'teacher-feedback') return 'feedback'
  if (uploadType === 'parent-upload') return 'parent_upload'
  if (uploadType === 'admin-material') return 'admin_material'
  if (role === 'teacher') return 'teacher_upload'
  if (role === 'parent') return 'parent_upload'
  return 'admin_material'
}

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '请选择文件' }, { status: 400 })

  const uploadType = (formData.get('uploadType') as string) || null
  const studentId = (formData.get('studentId') as string) || null
  const lessonId = (formData.get('lessonId') as string) || null
  const feedbackId = (formData.get('feedbackId') as string) || null
  const postId = (formData.get('postId') as string) || null

  // Size check
  const limit = getSizeLimit(uploadType)
  if (file.size > limit) {
    const limitMB = Math.round(limit / 1024 / 1024)
    return NextResponse.json({ error: `文件过大，最大支持 ${limitMB}MB` }, { status: 400 })
  }

  // Validation: image magic bytes
  if (file.type.startsWith('image/')) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const magicBytes = [
      [0xFF, 0xD8, 0xFF],           // JPEG
      [0x89, 0x50, 0x4E, 0x47],     // PNG
      [0x47, 0x49, 0x46],           // GIF
    ]
    const isValid = magicBytes.some(bytes => bytes.every((b, i) => buffer[i] === b))
    if (!isValid) {
      return NextResponse.json({ error: '文件格式不合法，只支持 JPG/PNG/GIF/WebP' }, { status: 400 })
    }
  }

  const ownerType = getOwnerType(uploadType, user.role)
  const visibility = user.role === 'parent' ? 'PARENT_VISIBLE'
    : user.role === 'admin' ? 'ADMIN_ONLY'
    : 'TEACHER_VISIBLE'

  const result = await uploadFile(file, { prefix: ownerType })

  // Create FileAsset record if table exists
  const prisma = await getRequestPrisma()
  try {
    await (prisma as unknown as { fileAsset: { create: Function } }).fileAsset.create({
      data: {
        filename: result.storageKey,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        storageDriver: result.storageDriver,
        storageKey: result.storageKey,
        url: result.url,
        ownerType,
        studentId,
        lessonId,
        feedbackId,
        postId,
        visibility,
        uploadedById: user.id,
        uploadedByRole: user.role,
        tenant: user.division || null,
      },
    })
  } catch { /* FileAsset table may not exist yet — skip gracefully */ }

  return NextResponse.json({
    url: result.url,
    legacyUrl: result.url.replace('/api/uploads/', '/uploads/'),
    file: {
      storageKey: result.storageKey,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      visibility,
    },
  })
})
