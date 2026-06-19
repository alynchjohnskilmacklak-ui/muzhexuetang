import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { uploadBuffer, safeFilename } from '@/lib/storage'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

/** 按 uploadType 限制文件大小 */
function getSizeLimit(uploadType: string | null): number {
  switch (uploadType) {
    case 'teacher-feedback': return 20 * 1024 * 1024  // 20MB
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

function isValidImageBuffer(buffer: Buffer): { ok: boolean; heic?: boolean } {
  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return { ok: true }
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return { ok: true }
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return { ok: true }
  // WebP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return { ok: true }
  // HEIC/HEIF/AVIF: ....ftyp + brand
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.subarray(8, 12).toString('ascii')
    if (['heic', 'heix', 'mif1', 'msf1', 'hevc', 'avif'].includes(brand)) return { ok: true, heic: true }
  }
  return { ok: false }
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

  const ownerType = getOwnerType(uploadType, user.role)
  const visibility = user.role === 'parent' ? 'PARENT_VISIBLE'
    : user.role === 'admin' ? 'ADMIN_ONLY'
    : 'TEACHER_VISIBLE'

  // Read buffer ONCE — validate + upload use the same buffer
  const buffer = Buffer.from(await file.arrayBuffer())

  // Validation: image magic bytes
  if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif|avif)$/i.test(file.name)) {
    const check = isValidImageBuffer(buffer)
    if (!check.ok) {
      return NextResponse.json({ error: '文件格式不合法，仅支持 JPG/PNG/GIF/WebP/HEIC' }, { status: 400 })
    }
  }

  try {
    const result = await uploadBuffer(buffer, { originalName: file.name, mimeType: file.type, prefix: ownerType })

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
    } catch { /* FileAsset table may not exist yet */ }

    return NextResponse.json({
      url: result.url,
      legacyUrl: result.url.replace('/api/uploads/', '/uploads/'),
      file: { storageKey: result.storageKey, filename: file.name, mimeType: file.type, size: file.size, visibility },
    })
  } catch (uploadErr) {
    console.error('[upload:fail]', { name: file.name, size: file.size, type: file.type, error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr) })
    return NextResponse.json({ error: '上传失败：服务器存储写入错误，请联系管理员' }, { status: 500 })
  }
})
