import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { BrandBackgroundScene, type BrandBackgroundVariant } from '../src/components/BrandBackground'

const exports: Array<{ variant: BrandBackgroundVariant; width: number; height: number; file: string }> = [
  { variant: 'desktop', width: 1920, height: 1080, file: 'brand-background-1920x1080.png' },
  { variant: 'tablet', width: 1024, height: 1366, file: 'brand-background-1024x1366.png' },
  { variant: 'mobile', width: 750, height: 1624, file: 'brand-background-750x1624.png' },
]

const outputDirectory = path.resolve(process.cwd(), 'public/bg')

async function main() {
  await mkdir(outputDirectory, { recursive: true })

  for (const item of exports) {
    const scene = renderToStaticMarkup(createElement(BrandBackgroundScene, { variant: item.variant }))
      .replace('<svg ', `<svg width="${item.width}" height="${item.height}" `)
    const svgPath = path.join(outputDirectory, `.${item.file.replace('.png', '.svg')}`)
    const pngPath = path.join(outputDirectory, item.file)
    await writeFile(svgPath, scene, 'utf8')
    await sharp(Buffer.from(scene)).png().toFile(pngPath)
    await unlink(svgPath)
    process.stdout.write(`Created ${path.relative(process.cwd(), pngPath)}\n`)
  }
}

void main()
