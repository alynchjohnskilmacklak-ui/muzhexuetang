import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = path.join(root, 'public', 'UI_picture', 'logo.png')
const outputDir = path.join(root, 'public', 'brand')
const logoPath = path.join(outputDir, 'export-logo.png')
const watermarkPath = path.join(outputDir, 'export-watermark.png')

await fs.mkdir(outputDir, { recursive: true })

const logo = await sharp(source)
  .resize({ width: 720, withoutEnlargement: true })
  .png()
  .toBuffer()
const metadata = await sharp(logo).metadata()
const width = metadata.width ?? 720
const height = metadata.height ?? 161

await fs.writeFile(logoPath, logo)

const tileWidth = 800
const tileHeight = 520
const watermarkLogo = await sharp(logo).resize({ width: 430 }).png().toBuffer()
const watermarkLogoMeta = await sharp(watermarkLogo).metadata()
const watermarkWidth = watermarkLogoMeta.width ?? 430
const watermarkHeight = watermarkLogoMeta.height ?? 96
const watermarkCanvas = await sharp({
  create: { width: tileWidth, height: tileHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } },
})
  .composite([{ input: watermarkLogo, left: Math.round((tileWidth - watermarkWidth) / 2), top: Math.round((tileHeight - watermarkHeight) / 2) }])
  .png()
  .toBuffer()
const opacityMask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}"><rect width="100%" height="100%" fill="#fff" fill-opacity="0.055"/></svg>`,
)
const watermark = await sharp(watermarkCanvas)
  .composite([{ input: opacityMask, blend: 'dest-in' }])
  .png()
  .toBuffer()

await fs.writeFile(watermarkPath, watermark)
console.log(`Generated ${path.relative(root, logoPath)} (${width}x${height}) and ${path.relative(root, watermarkPath)} (${tileWidth}x${tileHeight}, 5.5% opacity).`)
