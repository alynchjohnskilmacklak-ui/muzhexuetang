import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import catalogJson from '../data/textbooks/current-junior-textbook-catalog-2026.json'
import { PUBLISHED_PRACTICE_SETS } from '../src/data/published-practice-bank'
import type { PracticeSet } from '../src/data/parent-practice-bank'

type CatalogEntry = { id: string; title: string; path?: string[] }
type CatalogVolume = { subject: string; title: string; entries: CatalogEntry[] }
type PointRecord = {
  id: string
  title: string
  content: string
  practiceNotes: Map<string, { content: string; questionId: string; setId: string }>
}

const gradeForVolume = (title: string) => {
  if (title.startsWith('七年级')) return '初一'
  if (title.startsWith('八年级')) return '初二'
  if (title.startsWith('九年级')) return '初三'
  return ''
}

const bookForVolume = (title: string) => title.replace(/^(?:七|八|九)年级/u, '')
const normalizeSubject = (subject: string) => subject === '道德与法治' ? '政治' : subject
const locatorKey = (grade: string, subject: string, volume: string, locator: string) =>
  [grade, normalizeSubject(subject), volume, locator].join('|')
const entryPath = (entry: CatalogEntry) => entry.path?.length ? entry.path : [entry.title]
const pathKey = (path: string[]) => path.join(' / ')

const genericExplanationPatterns = [
  /本题考查.*重点字词读音.*准确识记/u,
  /本题考查.*重点字词.*正确书写/u,
  /这是课文重点识记的文学常识/u,
  /重要篇目，.*文体是理解课文的基础/u,
  /关键语句往往兼具内容与形式之美/u,
  /综合运用了多种写作手法/u,
  /把握作者情感是阅读.*核心目标/u,
  /重点掌握文学常识、字音字形、词句赏析与内容理解/u,
]

function usefulExplanation(value: string) {
  const text = value.replace(/\s+/gu, ' ').trim()
  return text.length >= 24 && !genericExplanationPatterns.some((pattern) => pattern.test(text))
}

function boundedExplanation(value: string) {
  const text = value.replace(/\s+/gu, ' ').trim()
  if (text.length <= 260) return text
  const candidate = text.slice(0, 260)
  const boundary = Math.max(candidate.lastIndexOf('。'), candidate.lastIndexOf('；'), candidate.lastIndexOf('！'), candidate.lastIndexOf('？'))
  return boundary >= 120 ? candidate.slice(0, boundary + 1) : `${candidate.slice(0, 259).trimEnd()}…`
}

function isTerminalEntry(entry: CatalogEntry, entries: CatalogEntry[]) {
  const path = entryPath(entry)
  return !entries.some((other) => {
    const otherPath = entryPath(other)
    return otherPath.length > path.length && path.every((part, index) => part === otherPath[index])
  })
}

const volumes = (catalogJson as { volumes: CatalogVolume[] }).volumes
const setsByLocation = new Map<string, PracticeSet[]>()
for (const set of PUBLISHED_PRACTICE_SETS) {
  const locator = set.catalogEvidence?.locator
  if (!locator) continue
  const key = locatorKey(set.grade, set.subject, set.volume, locator)
  const current = setsByLocation.get(key) || []
  current.push(set)
  setsByLocation.set(key, current)
}

let terminalCount = 0
let referencedCount = 0
let pointCount = 0
let noteCount = 0
const collections = volumes.map((volume) => {
  const grade = gradeForVolume(volume.title)
  const book = bookForVolume(volume.title)
  const terminalEntries = volume.entries.filter((entry) => isTerminalEntry(entry, volume.entries))
  terminalCount += terminalEntries.length
  const records = terminalEntries.flatMap((entry) => {
    const locator = pathKey(entryPath(entry))
    const sets = setsByLocation.get(locatorKey(grade, volume.subject, book, locator)) || []
    if (!sets.length) return []

    referencedCount += 1
    const points = new Map<string, PointRecord>()
    for (const set of sets) {
      const pointIds = new Set(set.knowledgePoints.map((point) => point.id))
      for (const point of set.knowledgePoints) {
        const existing = points.get(point.id)
        if (!existing) {
          points.set(point.id, { id: point.id, title: point.title, content: point.content, practiceNotes: new Map() })
        } else if (point.content.trim().length > existing.content.trim().length) {
          existing.title = point.title
          existing.content = point.content
        }
      }

      for (const question of set.questions) {
        if (!pointIds.has(question.knowledgePointId) || !usefulExplanation(question.explanation)) continue
        const point = points.get(question.knowledgePointId)
        if (!point) continue
        const content = boundedExplanation(question.explanation)
        const prior = point.practiceNotes.get(content)
        if (!prior || content.length > prior.content.length) {
          point.practiceNotes.set(content, {
            content,
            questionId: question.id,
            setId: set.id,
          })
        }
      }
    }

    const knowledgePoints = [...points.values()].map((point) => {
      const practiceNotes = [...point.practiceNotes.values()]
        .sort((a, b) => b.content.length - a.content.length)
        .slice(0, 2)
      pointCount += 1
      noteCount += practiceNotes.length
      return {
        title: point.title,
        content: point.content,
        practiceNotes,
      }
    })

    const sourceSetIds = [...new Set(sets.map((set) => set.id))]
    return [{
      entryId: entry.id,
      entryTitle: locator,
      sourceReference: `已发布题库：${sourceSetIds.join('、')}`,
      sourceSetIds,
      knowledgePoints,
    }]
  })

  return {
    subject: volume.subject,
    grade,
    volumeTitle: volume.title,
    reviewStatus: 'PUBLISHED_QUESTION_BANK_DERIVED',
    sourceReference: '根据已发布题库中与本教材目录精确匹配的知识点和题目解析整理；内容为内部摘要，不是教材原文。',
    records,
  }
})

const output = {
  schema: 1,
  generatedFrom: 'PUBLISHED_PRACTICE_SETS + current-junior-textbook-catalog-2026.json',
  coverage: {
    terminalChapterCount: terminalCount,
    referencedChapterCount: referencedCount,
    uncoveredChapterCount: terminalCount - referencedCount,
  },
  notes: [
    '仅纳入通过题库发布规则的正式题组。',
    '章节位置依据题组 catalogEvidence.locator 与当前教材目录路径精确匹配。',
    '知识点内容保留题库原文；解析线索只摘录关联知识点且非通用模板的题目解析。',
    '解析线索保留题目来源，生成反馈时必须以教师输入和课堂记录为准。',
  ],
  collections,
}

const outputPath = fileURLToPath(new URL('../data/textbooks/knowledge-references-published-bank-2026.json', import.meta.url))
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ outputPath, ...output.coverage, knowledgePointEntries: pointCount, explanationNotes: noteCount }, null, 2))
