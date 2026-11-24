import { describe, expect, it } from 'vitest'
import { canUseUploadType, normalizeUploadType, ownerTypeForUpload, uploadRequiresImage } from './upload-policy'

describe('admin practice-reply uploads', () => {
  it('limits this protected image upload to management accounts', () => {
    expect(canUseUploadType('admin', 'admin-practice-reply')).toBe(true)
    expect(canUseUploadType('teacher', 'admin-practice-reply')).toBe(false)
    expect(canUseUploadType('parent', 'admin-practice-reply')).toBe(false)
  })

  it('stores the reply image under its scoped owner type and requires image content', () => {
    expect(normalizeUploadType('admin-practice-reply')).toBe('admin-practice-reply')
    expect(ownerTypeForUpload('admin-practice-reply', 'admin')).toBe('admin_practice_reply')
    expect(uploadRequiresImage('admin-practice-reply')).toBe(true)
  })
})
