import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  uploadBuffer: vi.fn(),
  deleteFile: vi.fn(),
  generateImageVariants: vi.fn(),
  fileAssetCreate: vi.fn(),
  validateUploadAssociations: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({ requireAuthenticatedUser: mocks.requireAuthenticatedUser }))
vi.mock('@/lib/storage', () => ({ uploadBuffer: mocks.uploadBuffer, deleteFile: mocks.deleteFile }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
vi.mock('@/lib/image-variants', () => ({ generateImageVariants: mocks.generateImageVariants }))
vi.mock('@/lib/upload-access', () => ({
  canUseUploadType: () => true,
  normalizeUploadType: (value: unknown) => value,
  ownerTypeForUpload: () => 'feedback',
  uploadAllowsDocument: () => true,
  uploadRequiresImage: (type: string) => type === 'teacher-feedback',
  validateUploadAssociations: mocks.validateUploadAssociations,
}))

import { POST } from './route'

describe('/api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuthenticatedUser.mockResolvedValue({
      id: 'teacher-user',
      role: 'teacher',
      division: 'JUNIOR',
      teacherId: 'teacher-a',
      prisma: { fileAsset: { create: mocks.fileAssetCreate } },
    })
    mocks.uploadBuffer.mockResolvedValue({
      url: '/api/uploads/feedback-photo.jpg',
      storageKey: 'feedback-photo.jpg',
      storageDriver: 'aliyun-oss',
    })
    mocks.generateImageVariants.mockResolvedValue(null)
    mocks.fileAssetCreate.mockResolvedValue({ id: 'asset-a' })
    mocks.validateUploadAssociations.mockResolvedValue(undefined)
  })

  it('stores teacher classroom feedback photos with a private OSS object ACL', async () => {
    const form = new FormData()
    form.set('uploadType', 'teacher-feedback')
    form.set('file', new File([Uint8Array.from([0xff, 0xd8, 0xff, 0x00])], 'lesson.jpg', { type: 'image/jpeg' }))

    const response = await POST(new NextRequest('http://localhost/api/upload', { method: 'POST', body: form }))

    expect(response.status).toBe(200)
    expect(mocks.uploadBuffer).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({
      originalName: 'lesson.jpg',
      privateObject: true,
    }))
  })
})
