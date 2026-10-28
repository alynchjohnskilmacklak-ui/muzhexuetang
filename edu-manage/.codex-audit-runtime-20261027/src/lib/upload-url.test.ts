import { describe, expect, it } from 'vitest'
import {
  extractUploadStorageKey,
  normalizeAvatarUrl,
  protectedUploadFallback,
} from './upload-url'

describe('protected upload URLs', () => {
  it('extracts the object key from private OSS and protected local URLs', () => {
    expect(extractUploadStorageKey('https://bucket.oss-cn-hangzhou.aliyuncs.com/feedback-preview-1.webp'))
      .toBe('feedback-preview-1.webp')
    expect(extractUploadStorageKey('/api/uploads/feedback-thumbnail-1.webp'))
      .toBe('feedback-thumbnail-1.webp')
  })

  it('never falls back to an unsigned private OSS URL', () => {
    expect(protectedUploadFallback('https://bucket.oss-cn-hangzhou.aliyuncs.com/feedback-preview-1.webp'))
      .toBe('/api/uploads/feedback-preview-1.webp')
  })

  it('keeps bundled portraits public and proxies uploaded portraits', () => {
    expect(normalizeAvatarUrl('/people/teacher.jpg')).toBe('/people/teacher.jpg')
    expect(normalizeAvatarUrl('https://bucket.oss-cn-hangzhou.aliyuncs.com/avatar-1.jpg'))
      .toBe('/api/uploads/avatar-1.jpg')
  })
})
