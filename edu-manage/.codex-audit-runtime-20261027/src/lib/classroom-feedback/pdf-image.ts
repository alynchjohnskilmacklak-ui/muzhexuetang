import { extractUploadStorageKey } from '@/lib/upload-url'

export type FeedbackPdfImageAsset = {
  storageKey: string
  storageDriver: string
  mimeType: string
  previewUrl?: string | null
  thumbnailUrl?: string | null
}

export type FeedbackPdfImageCandidate = {
  storageKey: string
  storageDriver?: string
  mimeType: string
}

function mimeTypeFromKey(key: string) {
  const extension = key.split('.').pop()?.toLowerCase()
  if (extension === 'webp') return 'image/webp'
  if (extension === 'png') return 'image/png'
  if (extension === 'gif') return 'image/gif'
  if (extension === 'avif') return 'image/avif'
  if (extension === 'heic' || extension === 'heif') return 'image/heic'
  return 'image/jpeg'
}

/**
 * Prefer generated previews for PDF size and browser compatibility, while
 * retaining a controlled original fallback for legacy records.
 */
export function feedbackPdfImageCandidates(
  feedbackImageValue: string,
  asset?: FeedbackPdfImageAsset | null,
): FeedbackPdfImageCandidate[] {
  const candidates = asset
    ? [
        asset.previewUrl,
        asset.thumbnailUrl,
        asset.storageKey,
      ].map((value) => ({
        storageKey: extractUploadStorageKey(value),
        storageDriver: asset.storageDriver,
        mimeType: value === asset.storageKey ? asset.mimeType : 'image/webp',
      }))
    : [{
        storageKey: extractUploadStorageKey(feedbackImageValue),
        storageDriver: undefined,
        mimeType: mimeTypeFromKey(feedbackImageValue),
      }]

  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    if (!candidate.storageKey || seen.has(candidate.storageKey)) return false
    seen.add(candidate.storageKey)
    return true
  })
}
