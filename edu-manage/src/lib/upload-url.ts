export function normalizeUploadUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('/uploads/')) {
    return `/api/uploads/${encodeURIComponent(url.slice('/uploads/'.length))}`
  }
  return url
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
    return decodeURIComponent(url.pathname).replace(/^\/+/, '')
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
