import sharp from 'sharp'

export type GeneratedImageVariants = {
  width: number | null
  height: number | null
  previewBuffer: Buffer
  thumbnailBuffer: Buffer
}

export async function generateImageVariants(buffer: Buffer): Promise<GeneratedImageVariants> {
  const metadata = await sharp(buffer, { animated: false, failOn: 'none' }).metadata()
  const [previewBuffer, thumbnailBuffer] = await Promise.all([
    sharp(buffer, { animated: false, failOn: 'none' })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
    sharp(buffer, { animated: false, failOn: 'none' })
      .rotate()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer(),
  ])

  return {
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    previewBuffer,
    thumbnailBuffer,
  }
}
