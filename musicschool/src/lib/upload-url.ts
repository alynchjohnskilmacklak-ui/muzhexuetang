export function normalizeUploadUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('/uploads/')) {
    return `/api/uploads/${encodeURIComponent(url.slice('/uploads/'.length))}`
  }
  return url
}
