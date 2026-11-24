import { describe, expect, it } from 'vitest'
import { normalizeUploadRequestPath, protectedUploadFallback } from './upload-url'

describe('protected upload paths', () => {
  it('keeps newly returned OSS objects behind the authenticated upload route', () => {
    expect(protectedUploadFallback('feedback/lesson/photo 1.jpg'))
      .toBe('/api/uploads/feedback%2Flesson%2Fphoto%201.jpg')
  })

  it('normalizes route params without decoding literal percent characters twice', () => {
    expect(normalizeUploadRequestPath('feedback\\lesson\\photo%')).toBe('feedback/lesson/photo%')
  })

  it('rejects traversal and empty upload paths', () => {
    expect(normalizeUploadRequestPath('../secret')).toBeNull()
    expect(normalizeUploadRequestPath('a/../secret')).toBeNull()
    expect(normalizeUploadRequestPath('')).toBeNull()
  })
})
