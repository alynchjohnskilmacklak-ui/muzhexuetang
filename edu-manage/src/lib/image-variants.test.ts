import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { randomBytes } from 'node:crypto'
import { generateImageVariants } from './image-variants'

describe('generateImageVariants', () => {
  it('creates WebP preview and thumbnail within the configured longest edges', async () => {
    const original = await sharp(randomBytes(3000 * 2000 * 3), {
      raw: { width: 3000, height: 2000, channels: 3 },
    }).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer()

    const generated = await generateImageVariants(original)
    const preview = await sharp(generated.previewBuffer).metadata()
    const thumbnail = await sharp(generated.thumbnailBuffer).metadata()

    expect(generated.width).toBe(3000)
    expect(generated.height).toBe(2000)
    expect(original.byteLength).toBeGreaterThan(5 * 1024 * 1024)
    expect(original.byteLength).toBeLessThan(20 * 1024 * 1024)
    expect(preview.format).toBe('webp')
    expect(Math.max(preview.width || 0, preview.height || 0)).toBeLessThanOrEqual(1200)
    expect(thumbnail.format).toBe('webp')
    expect(Math.max(thumbnail.width || 0, thumbnail.height || 0)).toBeLessThanOrEqual(400)
  })
})
