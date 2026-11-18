import sharp from 'sharp'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'

const root = process.cwd()
const source = path.join(root, 'public', 'images', 'logo.jpg')
const outputDir = path.join(root, 'public', 'icons')

await mkdir(outputDir, { recursive: true })

for (const [file, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  const logo = await sharp(source)
    .resize({ width: Math.round(size * 0.8), fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: '#ffffff',
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(outputDir, file))
}
