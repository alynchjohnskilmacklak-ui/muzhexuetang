import { describe, expect, it } from 'vitest'
import {
  canUseUploadType,
  normalizeUploadType,
  ownerTypeForUpload,
  uploadAllowsDocument,
  uploadRequiresImage,
} from '@/lib/upload-policy'

describe('upload policy', () => {
  it('rejects unknown upload types instead of trusting browser input', () => {
    expect(normalizeUploadType('admin-everything')).toBeNull()
    expect(normalizeUploadType('')).toBe('generic')
  })

  it('keeps role-specific upload boundaries', () => {
    expect(canUseUploadType('teacher', 'teacher-feedback')).toBe(true)
    expect(canUseUploadType('teacher', 'admin-material')).toBe(false)
    expect(canUseUploadType('parent', 'teacher-feedback')).toBe(false)
    expect(canUseUploadType('admin', 'admin-material')).toBe(true)
    expect(canUseUploadType('parent', 'parent-message')).toBe(true)
    expect(canUseUploadType('teacher', 'parent-message')).toBe(true)
    expect(canUseUploadType('admin', 'parent-message')).toBe(true)
    expect(canUseUploadType('other', 'parent-message')).toBe(false)
  })

  it('requires images for feedback and avatar uploads', () => {
    expect(uploadRequiresImage('teacher-feedback')).toBe(true)
    expect(uploadRequiresImage('avatar')).toBe(true)
    expect(uploadAllowsDocument('teacher-feedback')).toBe(false)
    expect(uploadAllowsDocument('admin-material')).toBe(true)
    expect(uploadRequiresImage('parent-message')).toBe(true)
    expect(uploadAllowsDocument('parent-message')).toBe(false)
  })

  it('derives ownership on the server', () => {
    expect(ownerTypeForUpload('teacher-feedback', 'teacher')).toBe('feedback')
    expect(ownerTypeForUpload('generic', 'parent')).toBe('parent_upload')
    expect(ownerTypeForUpload('parent-message', 'teacher')).toBe('parent_message')
  })
})

