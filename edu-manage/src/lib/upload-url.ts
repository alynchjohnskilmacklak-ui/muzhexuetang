export function normalizeUploadUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('/uploads/')) {
    return `/api/uploads/${encodeURIComponent(url.slice('/uploads/'.length))}`
  }
  return url
}

/** Normalize an already-decoded Next route param without decoding it twice. */
export function normalizeUploadRequestPath(raw: string) {
  const candidate = raw.replace(/\\/g, '/')
  if (!candidate || candidate.includes('\0')) return null

  const segments = candidate.split('/').filter((segment) => segment && segment !== '.')
  if (!segments.length || segments.some((segment) => segment === '..')) return null
  return segments.join('/')
}

export function extractUploadStorageKey(value?: string | null) {
  const raw = value?.trim() || ''
  if (!raw) return ''

  try {
    if (raw.startsWith('/api/uploads/')) {
      return decodeURIComponent(raw.slice('/api/uploads/'.length)).replace(/^\/+/, '')
    }
    if (raw.startsWith('/uploads/')) {
      return decodeURIComponent(raw.slice('/uploads/'.length)).replace(/^\/+/, '')
    }
    const url = new URL(raw)
    const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    if (pathname.startsWith('api/uploads/')) return pathname.slice('api/uploads/'.length)
    if (pathname.startsWith('uploads/')) return pathname.slice('uploads/'.length)
    return pathname
  } catch {
    return raw.replace(/^\/+/, '')
  }
}

/**
 * Private OSS URLs must never be used unsigned. If signing is temporarily
 * unavailable, stream the object through the authenticated upload endpoint.
 */
export function protectedUploadFallback(value?: string | null) {
  const raw = value?.trim() || ''
  if (!raw || raw.startsWith('blob:') || raw.startsWith('data:')) return raw
  const key = extractUploadStorageKey(raw)
  return key ? `/api/uploads/${encodeURIComponent(key)}` : normalizeUploadUrl(raw)
}

/** Teacher portraits may live in public/people or protected upload storage. */
export function normalizeAvatarUrl(value?: string | null) {
  const raw = value?.trim() || ''
  if (!raw || raw.startsWith('/people/') || raw.startsWith('/avatars/') || raw.startsWith('data:') || raw.startsWith('blob:')) return raw
  return protectedUploadFallback(raw)
}
