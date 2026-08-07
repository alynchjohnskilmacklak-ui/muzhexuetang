import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/guards'
import { deleteFile, uploadBuffer } from '@/lib/storage'
import { apiHandler } from '@/lib/api-handler'
import { generateImageVariants } from '@/lib/image-variants'
import {
  canUseUploadType,
  normalizeUploadType,
  ownerTypeForUpload,
  uploadAllowsDocument,
  uploadRequiresImage,
  validateUploadAssociations,
} from '@/lib/upload-access'

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

function isImageUpload(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif|avif)$/i.test(file.name)
}

function isAllowedDocument(file: File): boolean {
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/i.test(file.name)
}

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireAuthenticatedUser()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '请选择文件' }, { status: 400 })

  const rawUploadType = (formData.get('uploadType') as string) || null
  const uploadType = normalizeUploadType(rawUploadType)
  if (!uploadType) {
    return NextResponse.json({ error: '上传类型不合法' }, { status: 400 })
  }
  if (!canUseUploadType(user.role, uploadType)) {
    return NextResponse.json({ error: '无权使用该上传类型' }, { status: 403 })
  }
  const studentId = (formData.get('studentId') as string) || null
  const lessonId = (formData.get('lessonId') as string) || null
  const feedbackId = (formData.get('feedbackId') as string) || null
  const postId = (formData.get('postId') as string) || null

  await validateUploadAssociations(user, { studentId, lessonId, feedbackId, postId })

  // Size check
  const limit = getSizeLimit(uploadType)
  if (file.size > limit) {
    const limitMB = Math.round(limit / 1024 / 1024)
    return NextResponse.json({ error: `文件过大，最大支持 ${limitMB}MB` }, { status: 400 })
  }

  const ownerType = ownerTypeForUpload(uploadType, user.role)
  const visibility = user.role === 'parent' ? 'PARENT_VISIBLE'
    : user.role === 'admin' ? 'ADMIN_ONLY'
    : 'TEACHER_VISIBLE'

  // Read buffer ONCE — validate + upload use the same buffer
  const buffer = Buffer.from(await file.arrayBuffer())
  const isImage = isImageUpload(file)

  if (uploadRequiresImage(uploadType) && !isImage) {
    return NextResponse.json({ error: '该上传场景仅支持图片' }, { status: 400 })
  }
  if (!isImage && (!uploadAllowsDocument(uploadType) || !isAllowedDocument(file))) {
    return NextResponse.json({ error: '文件类型不在允许范围内' }, { status: 400 })
  }

  // Validation: image magic bytes
  if (isImage) {
    const check = isValidImageBuffer(buffer)
    if (!check.ok) {
      return NextResponse.json({ error: '文件格式不合法，仅支持 JPG/PNG/GIF/WebP/HEIC' }, { status: 400 })
    }
  }

  try {
    let preview: Awaited<ReturnType<typeof uploadBuffer>> | null = null
    let thumbnail: Awaited<ReturnType<typeof uploadBuffer>> | null = null
    let width: number | null = null
    let height: number | null = null
    const originalUpload = uploadBuffer(buffer, {
      originalName: file.name,
      mimeType: file.type,
      prefix: ownerType,
    })
    const generatedVariants = isImage
      ? generateImageVariants(buffer).catch((variantError) => {
          // HEIC support depends on the server libvips build. Keep the original usable.
          console.warn('[upload:variants]', file.name, variantError instanceof Error ? variantError.message : variantError)
          return null
        })
      : Promise.resolve(null)

    // Original persistence and Sharp processing are independent and can run in
    // parallel. The original remains mandatory; variants remain best-effort.
    const [result, generated] = await Promise.all([originalUpload, generatedVariants])
    if (generated) {
      width = generated.width
      height = generated.height
      const variantUploads = await Promise.allSettled([
        uploadBuffer(generated.previewBuffer, {
          originalName: `${file.name.replace(/\.[^.]+$/, '')}-preview.webp`,
          mimeType: 'image/webp',
          prefix: `${ownerType}-preview`,
        }),
        uploadBuffer(generated.thumbnailBuffer, {
          originalName: `${file.name.replace(/\.[^.]+$/, '')}-thumbnail.webp`,
          mimeType: 'image/webp',
          prefix: `${ownerType}-thumbnail`,
        }),
      ])
      if (variantUploads[0].status === 'fulfilled') {
        preview = variantUploads[0].value
      } else {
        console.warn('[upload:preview]', file.name, variantUploads[0].reason)
      }
      if (variantUploads[1].status === 'fulfilled') {
        thumbnail = variantUploads[1].value
      } else {
        console.warn('[upload:thumbnail]', file.name, variantUploads[1].reason)
      }
    }

    // The original file has already been persisted at this point. FileAsset is the
    // durable link that lets every client resolve preview/thumbnail variants after
    // a refresh, so a failure here must be observable instead of silently ignored.
    const prisma = user.prisma
    try {
      const fileAsset = (prisma as unknown as { fileAsset: { create(args: { data: Record<string, unknown> }): Promise<unknown> } }).fileAsset
      await fileAsset.create({ data: {
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
        previewUrl: preview?.url ?? null,
        thumbnailUrl: thumbnail?.url ?? null,
        width,
        height,
        fileSize: file.size,
      } })
    } catch (assetError) {
      console.error('[upload:file-asset-persist]', {
        storageKey: result.storageKey,
        originalName: file.name,
        ownerType,
        uploadedById: user.id,
        message: assetError instanceof Error ? assetError.message : String(assetError),
      })
      await Promise.allSettled(
        [result, preview, thumbnail]
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
          .map((entry) => deleteFile(entry.storageKey))
      )
      return NextResponse.json({ error: '文件记录保存失败，请重试' }, { status: 500 })
    }

    return NextResponse.json({
      url: result.url,
      previewUrl: preview?.url ?? null,
      thumbnailUrl: thumbnail?.url ?? null,
      assetPersisted: true,
      legacyUrl: result.url.replace('/api/uploads/', '/uploads/'),
      file: {
        storageKey: result.storageKey,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        width,
        height,
        previewUrl: preview?.url ?? null,
        previewStorageKey: preview?.storageKey ?? null,
        thumbnailUrl: thumbnail?.url ?? null,
        thumbnailStorageKey: thumbnail?.storageKey ?? null,
        visibility,
      },
    })
  } catch (uploadErr) {
    const code = (uploadErr as NodeJS.ErrnoException)?.code
    const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr)
    console.error('[upload:fail]', { name: file.name, size: file.size, code, msg })
    return NextResponse.json({ error: `上传失败：${msg || code || '未知错误'}` }, { status: 500 })
  }
})
