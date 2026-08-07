import { describe, expect, it } from 'vitest'
import { feedbackPdfImageCandidates } from './pdf-image'

describe('feedback PDF image candidates', () => {
  it('prefers preview and retains the original as fallback', () => {
    expect(feedbackPdfImageCandidates('feedback-1.jpg', {
      storageKey: 'feedback-1.jpg',
      storageDriver: 'aliyun-oss',
      mimeType: 'image/jpeg',
      previewUrl: 'https://bucket.example.com/feedback-preview-1.webp',
      thumbnailUrl: 'https://bucket.example.com/feedback-thumbnail-1.webp',
    })).toEqual([
      {
        storageKey: 'feedback-preview-1.webp',
        storageDriver: 'aliyun-oss',
        mimeType: 'image/webp',
      },
      {
        storageKey: 'feedback-thumbnail-1.webp',
        storageDriver: 'aliyun-oss',
        mimeType: 'image/webp',
      },
      {
        storageKey: 'feedback-1.jpg',
        storageDriver: 'aliyun-oss',
        mimeType: 'image/jpeg',
      },
    ])
  })

  it('supports a legacy feedback image without FileAsset', () => {
    expect(feedbackPdfImageCandidates('/api/uploads/feedback-legacy.png')).toEqual([
      {
        storageKey: 'feedback-legacy.png',
        storageDriver: undefined,
        mimeType: 'image/png',
      },
    ])
  })
})
