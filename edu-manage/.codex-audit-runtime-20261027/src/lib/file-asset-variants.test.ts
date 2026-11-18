import { describe, expect, it, vi } from 'vitest'
import { resolveFeedbackImages } from './file-asset-variants'

describe('resolveFeedbackImages', () => {
  it('restores thumbnail and preview URLs from FileAsset after feedback reload', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{
        id: 'asset-1',
        url: 'https://oss.example/original.jpg',
        storageKey: 'feedback/original.jpg',
        previewUrl: 'feedback-preview/preview.webp',
        thumbnailUrl: 'feedback-thumbnail/thumbnail.webp',
      }]),
    }

    await expect(resolveFeedbackImages(prisma, ['feedback/original.jpg'])).resolves.toEqual([{
      assetId: 'asset-1',
      originalUrl: 'feedback/original.jpg',
      previewUrl: 'feedback-preview/preview.webp',
      thumbnailUrl: 'feedback-thumbnail/thumbnail.webp',
    }])
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })
})
