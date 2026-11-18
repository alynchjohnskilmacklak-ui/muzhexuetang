import { readFile } from 'node:fs/promises'

const catalogPath = new URL('../data/textbooks/current-junior-textbook-catalog-2026.json', import.meta.url)
const referencePaths = [
  new URL('../data/textbooks/knowledge-references-published-bank-2026.json', import.meta.url),
  new URL('../data/textbooks/knowledge-references-supplemental-2026.json', import.meta.url),
  new URL('../data/textbooks/knowledge-references-junior-math-7a-ch1.json', import.meta.url),
]
const [catalog, ...referenceCatalogs] = await Promise.all([
  readFile(catalogPath, 'utf8').then(JSON.parse),
  ...referencePaths.map((path) => readFile(path, 'utf8').then(JSON.parse)),
])

const referenceSourcesByEntry = new Map()
for (const [sourceIndex, referenceCatalog] of referenceCatalogs.entries()) {
  for (const collection of referenceCatalog.collections) {
    for (const record of collection.records) {
      const key = `${collection.subject}|${collection.grade}|${collection.volumeTitle}|${record.entryId}`
      const sources = referenceSourcesByEntry.get(key) || new Set()
      sources.add(sourceIndex)
      referenceSourcesByEntry.set(key, sources)
    }
  }
}

const gradeForVolume = (title) => title.startsWith('七年级') ? '初一' : title.startsWith('八年级') ? '初二' : '初三'
const entryPath = (entry) => entry.path?.length ? entry.path : [entry.title]
const isTerminalEntry = (entry, entries) => {
  const path = entryPath(entry)
  return !entries.some((other) => {
    const otherPath = entryPath(other)
    return otherPath.length > path.length && path.every((part, index) => part === otherPath[index])
  })
}
const totals = { volumes: catalog.volumes.length, entries: 0, referenced: 0, published: 0, draft: 0 }

console.log('学科 | 册次 | 最细章节 | 题库精确匹配 | 新增待复核补充 | 手工参考 | 待补充')
console.log('--- | --- | ---: | ---: | ---: | ---: | ---:')
for (const volume of catalog.volumes) {
  const grade = gradeForVolume(volume.title)
  const entries = volume.entries.filter((entry) => isTerminalEntry(entry, volume.entries))
  const sourcesFor = (entry) => referenceSourcesByEntry.get(`${volume.subject}|${grade}|${volume.title}|${entry.id}`) || new Set()
  const published = entries.filter((entry) => sourcesFor(entry).has(0)).length
  const draft = entries.filter((entry) => sourcesFor(entry).has(1)).length
  const manual = entries.filter((entry) => sourcesFor(entry).has(2)).length
  const referenced = entries.filter((entry) => sourcesFor(entry).size > 0).length
  const missing = entries.length - referenced
  totals.entries += entries.length
  totals.referenced += referenced
  totals.published += published
  totals.draft += draft
  console.log(`${volume.subject} | ${volume.title} | ${entries.length} | ${published} | ${draft} | ${manual} | ${missing}`)
}

console.log(`\n合计：${totals.volumes} 册、${totals.entries} 个最细章节；${totals.published} 个与正式题库精确匹配，${totals.draft} 个新增待复核补充，${totals.entries - totals.referenced} 个仍待补充。`)
console.log('另有手工参考覆盖部分题库章节；各来源列可重叠统计。待复核项不能作为已确认课堂内容。')
