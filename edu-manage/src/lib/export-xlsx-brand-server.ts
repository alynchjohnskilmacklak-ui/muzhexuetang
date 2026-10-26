import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { brandXlsxBuffer, type XlsxBrandAssets } from './export-xlsx-brand'

let assetsPromise: Promise<XlsxBrandAssets> | undefined

function loadBrandAssets(): Promise<XlsxBrandAssets> {
  assetsPromise ??= Promise.all([
    readFile(path.join(process.cwd(), 'public', 'brand', 'export-logo.png')),
    readFile(path.join(process.cwd(), 'public', 'brand', 'export-watermark.png')),
  ]).then(([logo, watermark]) => ({
    logoPng: new Uint8Array(logo),
    watermarkPng: new Uint8Array(watermark),
  }))
  return assetsPromise
}

export async function brandXlsxBufferOnServer(buffer: Uint8Array): Promise<Uint8Array> {
  return brandXlsxBuffer(buffer, await loadBrandAssets())
}
