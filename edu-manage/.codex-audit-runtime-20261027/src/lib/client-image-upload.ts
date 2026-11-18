export type ImageUploadResponse = {
  url?: string
  previewUrl?: string | null
  thumbnailUrl?: string | null
  assetPersisted?: boolean
  file?: { storageKey?: string }
  error?: string
}

export type ClientImageCompressionResult = {
  file: File
  compressed: boolean
  originalSize: number
}

export async function uploadMessageImage(file: File, studentId: string): Promise<string> {
  if (!studentId) throw new Error('当前会话未关联学生，无法上传图片')
  const isHeic = /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)
  const compression = await compressFeedbackImage(file, {
    maxDimension: 2048,
    quality: 0.82,
    convertUnsupportedImage: isHeic,
  })
  const uploadFile = compression.file
  const maxBytes = 10 * 1024 * 1024
  if (isHeic && !compression.compressed) {
    throw new Error('当前浏览器无法转换 HEIC 图片，请先将照片另存为 JPG 或 PNG 后再上传')
  }
  if (uploadFile.size > maxBytes) {
    throw new Error('照片仍超过 10 MB，请缩小图片后再上传')
  }

  const formData = new FormData()
  formData.append('file', uploadFile)
  formData.append('uploadType', 'parent-message')
  formData.append('studentId', studentId)

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 45_000)
  let response: Response
  try {
    response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('照片上传超时，请检查网络后重试')
    }
    throw new Error('网络连接中断，照片尚未上传，请检查网络后重试')
  } finally {
    window.clearTimeout(timeoutId)
  }
  const payload = await response.json().catch(() => null) as ImageUploadResponse | null

  if (!response.ok) {
    const reason = payload?.error
    if (response.status >= 500 && reason?.startsWith('上传失败：')) {
      throw new Error('服务器暂时无法保存图片，请稍后重试')
    }
    throw new Error(reason || ('图片上传失败（' + response.status + '）'))
  }

  const url = payload?.url
  if (typeof url !== 'string' || !url) {
    throw new Error('上传完成，但服务器没有返回图片地址，请重试')
  }

  return url
}

const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function compressFeedbackImage(
  file: File,
  options: { maxDimension?: number; quality?: number; convertUnsupportedImage?: boolean } = {},
): Promise<ClientImageCompressionResult> {
  const maxDimension = options.maxDimension ?? 2560
  const quality = options.quality ?? 0.88
  const canAttemptDecode = COMPRESSIBLE_TYPES.has(file.type) || (
    options.convertUnsupportedImage && file.type.startsWith('image/')
  )
  if (!canAttemptDecode || (file.size < 1_200_000 && !options.convertUnsupportedImage)) {
    return { file, compressed: false, originalSize: file.size }
  }

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return { file, compressed: false, originalSize: file.size }
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })
    if (!blob || (blob.size >= file.size * 0.94 && !options.convertUnsupportedImage)) {
      return { file, compressed: false, originalSize: file.size }
    }
    const compressedFile = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, '') + '.jpg',
      { type: 'image/jpeg', lastModified: file.lastModified },
    )
    return { file: compressedFile, compressed: true, originalSize: file.size }
  } catch {
    return { file, compressed: false, originalSize: file.size }
  } finally {
    bitmap?.close()
  }
}

export function uploadFeedbackImage(
  file: File,
  onProgress: (percent: number) => void,
): Promise<ImageUploadResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/upload')
    request.responseType = 'json'
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100))
    }
    request.onerror = () => reject(new Error('网络连接中断，请点击重试'))
    request.ontimeout = () => reject(new Error('上传超时，请点击重试'))
    request.onload = () => {
      const response = (request.response || {}) as ImageUploadResponse
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(response.error || `上传失败（${request.status}）`))
        return
      }
      resolve(response)
    }
    request.timeout = 120_000
    const formData = new FormData()
    formData.append('file', file)
    formData.append('uploadType', 'teacher-feedback')
    request.send(formData)
  })
}
