import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ServiceCatalogItem } from './service-catalog'

export async function getServiceMarkdown(service: ServiceCatalogItem) {
  if (!service.markdownFile) return convertTablesToLists(service.detailMarkdown || '')
  const filePath = path.join(process.cwd(), 'src', 'content', 'services', service.markdownFile)
  let content = await readFile(filePath, 'utf8')

  if (service.markdownStartHeading) {
    const startIndex = content.indexOf(service.markdownStartHeading)
    if (startIndex >= 0) content = content.slice(startIndex)
  }
  if (service.markdownEndHeading) {
    const endIndex = content.indexOf(service.markdownEndHeading)
    if (endIndex > 0) content = content.slice(0, endIndex)
  }

  return convertTablesToLists(content.replace(/^#\s+[^\r\n]+\r?\n+/, ''))
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
}

function convertTablesToLists(markdown: string) {
  const lines = markdown.split(/\r?\n/)
  const result: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const header = lines[index]
    const divider = lines[index + 1]
    if (!header?.includes('|') || !divider || !/^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(divider)) {
      result.push(header)
      continue
    }

    const headers = splitTableRow(header)
    const rows: string[][] = []
    index += 2
    while (index < lines.length && lines[index].includes('|')) {
      rows.push(splitTableRow(lines[index]))
      index += 1
    }
    index -= 1

    for (const row of rows) {
      result.push(`- **${headers[0]}：${row[0] || '—'}**`)
      headers.slice(1).forEach((label, cellIndex) => result.push(`  - **${label}：** ${row[cellIndex + 1] || '—'}`))
    }
    result.push('')
  }

  return result.join('\n')
}
