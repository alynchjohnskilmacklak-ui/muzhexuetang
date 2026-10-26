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

const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function compressFeedbackImage(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<ClientImageCompressionResult> {
  const maxDimension = options.maxDimension ?? 2560
  const quality = options.quality ?? 0.88
  if (!COMPRESSIBLE_TYPES.has(file.type) || file.size < 1_200_000) {
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
    if (!blob || blob.size >= file.size * 0.94) {
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
