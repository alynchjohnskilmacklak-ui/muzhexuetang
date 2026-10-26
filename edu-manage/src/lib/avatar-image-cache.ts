const MAX_AVATAR_CACHE_ENTRIES = 128
const MAX_AVATAR_CACHE_BYTES = 24 * 1024 * 1024
const IMAGE_COMPRESSION_THRESHOLD = 120 * 1024
const MAX_AVATAR_DIMENSION = 512

type CachedAvatar = { objectUrl: string; bytes: number }

const avatarCache = new Map<string, CachedAvatar>()
const pendingImages = new Map<string, Promise<string>>()
let cachedBytes = 0
let cacheVersion = 0

function cacheKey(src: string) {
  if (typeof window === 'undefined') return src
  try {
    return new URL(src, window.location.href).href
  } catch {
    return src
  }
}

function touchCache(key: string, entry: CachedAvatar) {
  avatarCache.delete(key)
  avatarCache.set(key, entry)
}

async function compactAvatar(blob: Blob): Promise<Blob> {
  if (blob.size < IMAGE_COMPRESSION_THRESHOLD || typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return blob
  }

  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && blob.type === 'image/webp') return blob

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return blob
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const optimized = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.88)
    })
    return optimized && optimized.size < blob.size ? optimized : blob
  } catch {
    return blob
  } finally {
    bitmap?.close()
  }
}

async function copyLoadedAvatar(image: HTMLImageElement): Promise<Blob | null> {
  if (!image.naturalWidth || !image.naturalHeight || typeof document === 'undefined') return null
  const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88))
}

function evictOldestAvatar() {
  const oldest = avatarCache.entries().next().value as [string, CachedAvatar] | undefined
  if (!oldest) return false
  const [key, value] = oldest
  avatarCache.delete(key)
  cachedBytes -= value.bytes
  URL.revokeObjectURL(value.objectUrl)
  return true
}

/** Returns the session-memory copy when this image has already been seen. */
export function peekCachedAvatarObjectUrl(src: string): string | undefined {
  const key = cacheKey(src)
  const cached = avatarCache.get(key)
  if (!cached) return undefined
  touchCache(key, cached)
  return cached.objectUrl
}

/**
 * Copies an already displayed avatar into a bounded in-memory cache. The image
 * bytes never go to localStorage or IndexedDB and are cleared at logout.
 */
export function cacheAvatarObjectUrl(src: string, loadedImage?: HTMLImageElement): Promise<string> {
  if (!src || src.startsWith('blob:') || src.startsWith('data:') || typeof window === 'undefined') {
    return Promise.reject(new Error('Avatar source is not cacheable'))
  }

  const key = cacheKey(src)
  const cached = avatarCache.get(key)
  if (cached) {
    touchCache(key, cached)
    return Promise.resolve(cached.objectUrl)
  }

  const pending = pendingImages.get(key)
  if (pending) return pending
  const requestVersion = cacheVersion

  const request = (async () => {
    // Re-encode the image element that just finished rendering. This avoids a
    // second download solely to seed the cache. Canvas can be tainted for
    // cross-origin images, so fall back to a normal same-origin-aware fetch.
    const renderedCopy = loadedImage ? await copyLoadedAvatar(loadedImage).catch(() => null) : null
    let compacted: Blob
    if (renderedCopy) {
      compacted = renderedCopy
    } else {
      const response = await fetch(src, { credentials: 'same-origin', cache: 'force-cache' })
      if (!response.ok) throw new Error(`Avatar request failed (${response.status})`)
      const blob = await response.blob()
      if (!blob.type.startsWith('image/')) throw new Error('Avatar response is not an image')
      compacted = await compactAvatar(blob)
    }
    if (requestVersion !== cacheVersion) throw new Error('Avatar cache was cleared')
    if (compacted.size > MAX_AVATAR_CACHE_BYTES) throw new Error('Avatar is too large for the session cache')

    const objectUrl = URL.createObjectURL(compacted)
    avatarCache.set(key, { objectUrl, bytes: compacted.size })
    cachedBytes += compacted.size
    while (avatarCache.size > MAX_AVATAR_CACHE_ENTRIES || cachedBytes > MAX_AVATAR_CACHE_BYTES) {
      if (!evictOldestAvatar()) break
    }
    return objectUrl
  })()

  pendingImages.set(key, request)
  void request.finally(() => {
    if (pendingImages.get(key) === request) pendingImages.delete(key)
  }).catch(() => undefined)
  return request
}

/** Clear portraits when the authenticated user signs out on a shared device. */
export function clearCachedAvatarImages() {
  cacheVersion += 1
  for (const cached of avatarCache.values()) URL.revokeObjectURL(cached.objectUrl)
  avatarCache.clear()
  pendingImages.clear()
  cachedBytes = 0
}
