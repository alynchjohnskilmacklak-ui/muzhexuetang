import { readFileSync } from 'node:fs'
import path from 'node:path'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { brandXlsxBuffer } from './export-xlsx-brand'

const projectRoot = process.cwd()
const assets = {
  logoPng: new Uint8Array(readFileSync(path.join(projectRoot, 'public', 'brand', 'export-logo.png'))),
  watermarkPng: new Uint8Array(readFileSync(path.join(projectRoot, 'public', 'brand', 'export-watermark.png'))),
}

describe('brandXlsxBuffer', () => {
  it('embeds the logo and watermark without changing the original header rows', () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['姓名', '手机号'],
      ['张三', '13800001111'],
    ]), '学员导入模板')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['家长姓名', '登录账号'],
      ['李女士', 'parent@example.com'],
    ]), '家长账号')

    const rawBuffer = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
    const brandedBuffer = brandXlsxBuffer(rawBuffer, assets)
    const archive = unzipSync(brandedBuffer)
    const brandedWorkbook = XLSX.read(Buffer.from(brandedBuffer).toString('binary'), { type: 'binary' })

    expect(archive['xl/media/muzhe-export-logo.png']).toBeDefined()
    expect(archive['xl/media/muzhe-export-watermark.png']).toBeDefined()
    expect(strFromU8(archive['xl/worksheets/sheet1.xml'])).toContain('<picture r:id="rIdMuzheBackground"/>')
    expect(strFromU8(archive['xl/worksheets/sheet2.xml'])).toContain('<drawing r:id="rIdMuzheDrawing"/>')
    expect(XLSX.utils.sheet_to_json(brandedWorkbook.Sheets['学员导入模板'], { header: 1 })).toEqual([
      ['姓名', '手机号'],
      ['张三', '13800001111'],
    ])
    expect(XLSX.utils.sheet_to_json(brandedWorkbook.Sheets['家长账号'], { header: 1 })).toEqual([
      ['家长姓名', '登录账号'],
      ['李女士', 'parent@example.com'],
    ])
  })
})
