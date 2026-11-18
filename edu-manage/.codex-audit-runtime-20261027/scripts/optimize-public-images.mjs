import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const sourceDir = path.resolve('public/about-images')
const files = (await readdir(sourceDir)).filter((file) => file.toLowerCase().endsWith('.png'))

let originalBytes = 0
let optimizedBytes = 0
let thumbnailBytes = 0

for (const file of files) {
  const source = path.join(sourceDir, file)
  const base = file.slice(0, -4)
  const optimized = path.join(sourceDir, `${base}.webp`)
  const thumbnail = path.join(sourceDir, `${base}-thumb.webp`)

  await sharp(source)
    .webp({ quality: 80, effort: 6, smartSubsample: true })
    .toFile(optimized)

  await sharp(source)
    .resize({ width: 320, withoutEnlargement: true })
    .webp({ quality: 72, effort: 6, smartSubsample: true })
    .toFile(thumbnail)

  originalBytes += (await stat(source)).size
  optimizedBytes += (await stat(optimized)).size
  thumbnailBytes += (await stat(thumbnail)).size
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`
const savedPercent = originalBytes === 0 ? 0 : Math.round((1 - optimizedBytes / originalBytes) * 100)

console.log(`Optimized ${files.length} homepage images.`)
console.log(`Original PNG total: ${mb(originalBytes)}`)
console.log(`Full WebP total:    ${mb(optimizedBytes)} (${savedPercent}% smaller)`)
console.log(`Thumbnail total:    ${mb(thumbnailBytes)}`)
