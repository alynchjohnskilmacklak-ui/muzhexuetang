import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

const CONTENT_TYPES_PATH = '[Content_Types].xml'
const RELATIONSHIPS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const DOCUMENT_RELATIONSHIPS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'
const DRAWING_MAIN_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
// Excel-compatible legacy sheet verifier for the user-provided unprotect password.
// Worksheet protection is intended to prevent accidental object edits, not encrypt workbook data.
const WORKSHEET_PROTECTION_PASSWORD_HASH = 'EB18'

export type XlsxBrandAssets = {
  logoPng: Uint8Array
  watermarkPng: Uint8Array
}

function readAttribute(attributes: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return attributes.match(new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`))?.[1]
}

function resolvePackageTarget(basePath: string, target: string): string {
  const parts = (target.startsWith('/') ? target.slice(1) : `${basePath}/${target}`).split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  return resolved.join('/')
}

function relationshipPath(partPath: string): string {
  const folder = partPath.slice(0, partPath.lastIndexOf('/'))
  const name = partPath.slice(partPath.lastIndexOf('/') + 1)
  return `${folder}/_rels/${name}.rels`
}

function addRelationship(xml: string | undefined, id: string, type: string, target: string): string {
  const relationship = `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`
  if (!xml) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${RELATIONSHIPS_NS}">${relationship}</Relationships>`
  }
  if (xml.includes(`Id="${id}"`)) throw new Error(`XLSX branding relationship already exists: ${id}`)
  if (!xml.includes('</Relationships>')) throw new Error('Unsupported XLSX relationship file')
  return xml.replace('</Relationships>', `${relationship}</Relationships>`)
}

function columnIndex(cellReference: string | undefined): number {
  const letters = cellReference?.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? 'A'
  let column = 0
  for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64
  return Math.max(0, column - 1)
}

function drawingXml(startColumn: number): string {
  const endColumn = startColumn + 3
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<xdr:wsDr xmlns:xdr="${DRAWING_NS}" xmlns:a="${DRAWING_MAIN_NS}" xmlns:r="${DOCUMENT_RELATIONSHIPS_NS}">` +
    '<xdr:twoCellAnchor editAs="oneCell">' +
    `<xdr:from><xdr:col>${startColumn}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
    `<xdr:to><xdr:col>${endColumn}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
    '<xdr:pic>' +
    '<xdr:nvPicPr><xdr:cNvPr id="1" name="牧哲学堂 Logo" descr="牧哲学堂品牌标识"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1" noSelect="1"/></xdr:cNvPicPr></xdr:nvPicPr>' +
    '<xdr:blipFill><a:blip r:embed="rIdMuzheLogo"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
    '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></xdr:spPr>' +
    '</xdr:pic><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>'
}

function unlockCellFormat(xf: string): string {
  const openingTag = xf.match(/^<xf\b[^>]*\/?\s*>/)?.[0]
  if (!openingTag) throw new Error('Unsupported XLSX cell format')

  const setAttribute = (tag: string, name: string, value: string) => {
    const attributePattern = new RegExp(`\\b${name}="[^"]*"`)
    if (attributePattern.test(tag)) return tag.replace(attributePattern, `${name}="${value}"`)
    return tag.replace(/\s*\/?\s*>$/, (suffix) => ` ${name}="${value}"${suffix}`)
  }

  const unlockedOpeningTag = setAttribute(openingTag, 'applyProtection', '1')
  const protection = '<protection locked="0" hidden="0"/>'
  if (/\/\s*>$/.test(openingTag)) {
    return `${unlockedOpeningTag.replace(/\/\s*>$/, '>')}${protection}</xf>`
  }

  const closingTagIndex = xf.lastIndexOf('</xf>')
  if (closingTagIndex < 0) throw new Error('Unsupported XLSX cell format')
  const inner = xf.slice(openingTag.length, closingTagIndex)
  const existingCellProtection = /<protection\b[^>]*?(?:\/\s*>|>[\s\S]*?<\/protection>)/
  const updatedInner = existingCellProtection.test(inner)
    ? inner.replace(existingCellProtection, protection)
    : `${inner}${protection}`
  return `${unlockedOpeningTag}${updatedInner}</xf>`
}

function unlockWorksheetCells(stylesXml: string): string {
  const cellXfsMatch = stylesXml.match(/<cellXfs\b([^>]*)>([\s\S]*?)<\/cellXfs>/)
  if (!cellXfsMatch) throw new Error('XLSX styles are missing cell formats')

  const cellFormats = cellXfsMatch[2].replace(/<xf\b[^>]*?(?:\/\s*>|>[\s\S]*?<\/xf>)/g, unlockCellFormat)
  if (!/<xf\b/.test(cellFormats)) throw new Error('XLSX cell formats are empty')
  const updatedCellXfs = `<cellXfs${cellXfsMatch[1]}>${cellFormats}</cellXfs>`
  return stylesXml.replace(cellXfsMatch[0], updatedCellXfs)
}

function addWorksheetProtection(files: Record<string, Uint8Array>, worksheetPath: string) {
  const worksheetBytes = files[worksheetPath]
  if (!worksheetBytes) throw new Error(`XLSX worksheet is missing: ${worksheetPath}`)
  const worksheetXml = strFromU8(worksheetBytes)
  const sheetProtection = `<sheetProtection password="${WORKSHEET_PROTECTION_PASSWORD_HASH}" sheet="1" objects="1" selectLockedCells="0" selectUnlockedCells="0"/>`
  const existingProtection = /<sheetProtection\b[^>]*(?:\/\s*>|>[\s\S]*?<\/sheetProtection>)/
  if (existingProtection.test(worksheetXml)) {
    files[worksheetPath] = strToU8(worksheetXml.replace(existingProtection, sheetProtection))
    return
  }
  if (!worksheetXml.includes('</sheetData>')) throw new Error(`XLSX worksheet has no sheet data: ${worksheetPath}`)
  const sheetDataEnd = worksheetXml.indexOf('</sheetData>') + '</sheetData>'.length
  const trailingXml = worksheetXml.slice(sheetDataEnd)
  const calcPr = trailingXml.match(/^\s*<sheetCalcPr\b[^>]*?(?:\/\s*>|>[\s\S]*?<\/sheetCalcPr>)/)?.[0]
  const afterCalcPr = sheetDataEnd + (calcPr?.length ?? 0)
  const laterElements = worksheetXml.slice(afterCalcPr)
  const trailingElement = laterElements.search(/<(?:protectedRanges|scenarios|autoFilter|sortState|dataConsolidate|customSheetViews|mergeCells|phoneticPr|conditionalFormatting|dataValidations|hyperlinks|printOptions|pageMargins|pageSetup|headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/)
  const insertionPoint = trailingElement < 0 ? afterCalcPr : afterCalcPr + trailingElement
  files[worksheetPath] = strToU8(`${worksheetXml.slice(0, insertionPoint)}${sheetProtection}${worksheetXml.slice(insertionPoint)}`)
}

function addContentType(contentTypes: string, tag: string): string {
  if (contentTypes.includes(tag)) return contentTypes
  return contentTypes.replace('</Types>', `${tag}</Types>`)
}

function addWorksheetBranding(
  files: Record<string, Uint8Array>,
  worksheetPath: string,
  sheetNumber: number,
  logoMediaPath: string,
  watermarkMediaPath: string,
) {
  const worksheetBytes = files[worksheetPath]
  if (!worksheetBytes) throw new Error(`XLSX worksheet is missing: ${worksheetPath}`)
  let worksheetXml = strFromU8(worksheetBytes)
  if (/<(?:xdr:)?drawing\b/.test(worksheetXml) || /<picture\b/.test(worksheetXml)) {
    throw new Error(`XLSX worksheet already contains images: ${worksheetPath}`)
  }

  const dimension = worksheetXml.match(/<dimension\b[^>]*\bref="([^"]+)"/)
  const usedRange = dimension?.[1]?.split(':').at(-1)
  const logoColumn = columnIndex(usedRange) + 1
  const drawingName = `muzhe-export-sheet${sheetNumber}.xml`
  const drawingPath = `xl/drawings/${drawingName}`
  const drawingRelsPath = relationshipPath(drawingPath)
  files[drawingPath] = strToU8(drawingXml(logoColumn))

  const drawingRels = addRelationship(undefined, 'rIdMuzheLogo', `${DOCUMENT_RELATIONSHIPS_NS}/image`, `../media/${logoMediaPath.split('/').at(-1)}`)
  files[drawingRelsPath] = strToU8(drawingRels)

  const sheetRelsPath = relationshipPath(worksheetPath)
  const existingSheetRels = files[sheetRelsPath] ? strFromU8(files[sheetRelsPath]) : undefined
  let sheetRels = addRelationship(existingSheetRels, 'rIdMuzheDrawing', `${DOCUMENT_RELATIONSHIPS_NS}/drawing`, `../drawings/${drawingName}`)
  sheetRels = addRelationship(sheetRels, 'rIdMuzheBackground', `${DOCUMENT_RELATIONSHIPS_NS}/image`, `../media/${watermarkMediaPath.split('/').at(-1)}`)
  files[sheetRelsPath] = strToU8(sheetRels)

  if (!/\sxmlns:r=/.test(worksheetXml)) {
    worksheetXml = worksheetXml.replace(/<worksheet\b/, `<worksheet xmlns:r="${DOCUMENT_RELATIONSHIPS_NS}"`)
  }
  const imageElements = '<drawing r:id="rIdMuzheDrawing"/><picture r:id="rIdMuzheBackground"/>'
  worksheetXml = worksheetXml.replace('</worksheet>', `${imageElements}</worksheet>`)
  files[worksheetPath] = strToU8(worksheetXml)

  let contentTypes = strFromU8(files[CONTENT_TYPES_PATH])
  contentTypes = addContentType(contentTypes, '<Default Extension="png" ContentType="image/png"/>')
  contentTypes = addContentType(contentTypes, `<Override PartName="/${drawingPath}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`)
  files[CONTENT_TYPES_PATH] = strToU8(contentTypes)
}

/** Embeds a visible logo and a faint tiled logo watermark without moving any worksheet cells. */
export function brandXlsxBuffer(buffer: Uint8Array, assets: XlsxBrandAssets): Uint8Array {
  const files = unzipSync(buffer)
  const workbookXml = files['xl/workbook.xml'] ? strFromU8(files['xl/workbook.xml']) : ''
  const workbookRelsXml = files['xl/_rels/workbook.xml.rels'] ? strFromU8(files['xl/_rels/workbook.xml.rels']) : ''
  if (!workbookXml || !workbookRelsXml || !files[CONTENT_TYPES_PATH]) {
    throw new Error('Invalid XLSX workbook; required workbook parts are missing')
  }
  const alreadyBranded = Boolean(files['xl/media/muzhe-export-logo.png'])

  const relationships = new Map<string, string>()
  for (const match of workbookRelsXml.matchAll(/<Relationship\b([^>]*?)\/?\s*>/g)) {
    const id = readAttribute(match[1], 'Id')
    const target = readAttribute(match[1], 'Target')
    if (id && target) relationships.set(id, target)
  }

  const worksheets: string[] = []
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*?)\/?\s*>/g)) {
    const relationId = readAttribute(match[1], 'r:id')
    const target = relationId ? relationships.get(relationId) : undefined
    if (target) worksheets.push(resolvePackageTarget('xl', target))
  }
  if (worksheets.length === 0) throw new Error('XLSX workbook contains no worksheets')

  const logoMediaPath = 'xl/media/muzhe-export-logo.png'
  const watermarkMediaPath = 'xl/media/muzhe-export-watermark.png'

  const stylesPath = 'xl/styles.xml'
  if (!files[stylesPath]) throw new Error('XLSX styles are missing')
  files[stylesPath] = strToU8(unlockWorksheetCells(strFromU8(files[stylesPath])))

  if (alreadyBranded) {
    worksheets.forEach((worksheetPath) => addWorksheetProtection(files, worksheetPath))
    return zipSync(files, { level: 6 })
  }

  files[logoMediaPath] = new Uint8Array(assets.logoPng)
  files[watermarkMediaPath] = new Uint8Array(assets.watermarkPng)

  worksheets.forEach((worksheetPath, index) => {
    addWorksheetBranding(files, worksheetPath, index + 1, logoMediaPath, watermarkMediaPath)
    addWorksheetProtection(files, worksheetPath)
  })

  return zipSync(files, { level: 6 })
}

export function copyXlsxAsArrayBuffer(buffer: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(copy).set(buffer)
  return copy
}

let browserAssets: Promise<XlsxBrandAssets> | undefined

/** Loads the same generated brand artwork for client-side workbook downloads. */
export function brandXlsxBufferInBrowser(buffer: Uint8Array): Promise<Uint8Array> {
  browserAssets ??= Promise.all([
    fetch('/brand/export-logo.png', { cache: 'force-cache' }),
    fetch('/brand/export-watermark.png', { cache: 'force-cache' }),
  ]).then(async ([logoResponse, watermarkResponse]) => {
    if (!logoResponse.ok || !watermarkResponse.ok) throw new Error('无法加载牧哲学堂导出品牌素材')
    const [logo, watermark] = await Promise.all([logoResponse.arrayBuffer(), watermarkResponse.arrayBuffer()])
    return { logoPng: new Uint8Array(logo), watermarkPng: new Uint8Array(watermark) }
  })
  return browserAssets.then((assets) => brandXlsxBuffer(buffer, assets))
}
