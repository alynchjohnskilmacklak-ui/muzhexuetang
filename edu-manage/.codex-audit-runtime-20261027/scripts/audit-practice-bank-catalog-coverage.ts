import currentJuniorCatalog from '../data/textbooks/current-junior-textbook-catalog-2026.json'
import { PARENT_PRACTICE_SETS, QUESTION_REVIEW_CANDIDATES } from '../src/data/parent-practice-bank'
import { PUBLISHED_PRACTICE_SETS } from '../src/data/published-practice-bank'

type Entry = { title: string; path?: string[] }
type Volume = { subject: string; title: string; publisher: string; termLabel: string; entries: Entry[] }
const volumes = (currentJuniorCatalog as { volumes: Volume[] }).volumes
const gradeLabel: Record<string, string> = { 初一: '七年级', 初二: '八年级', 初三: '九年级' }
const publishedLocators = new Map<string, number>()
const candidatesByLocator = new Map<string, Array<{ id: string; questions: number }>>()

for (const set of PUBLISHED_PRACTICE_SETS) {
  const subject = set.subject === '政治' ? '道德与法治' : set.subject
  const title = `${gradeLabel[set.grade] ?? ''}${set.volume}`
  const volume = volumes.find((item) => item.subject === subject && item.title === title)
  const locator = set.catalogEvidence?.locator
  if (volume && locator) {
    const key = `${subject}|${title}|${locator}`
    publishedLocators.set(key, (publishedLocators.get(key) ?? 0) + set.questions.length)
  }
}

for (const set of QUESTION_REVIEW_CANDIDATES) {
  const subject = set.subject === '政治' ? '道德与法治' : set.subject
  const title = `${gradeLabel[set.grade] ?? ''}${set.volume}`
  const volume = volumes.find((item) => item.subject === subject && item.title === title)
  const locator = set.catalogEvidence?.locator
  if (volume && locator) {
    const key = `${subject}|${title}|${locator}`
    const list = candidatesByLocator.get(key) ?? []
    list.push({ id: set.id, questions: set.questions.length })
    candidatesByLocator.set(key, list)
  }
}

const summary: Record<string, { terminal: number; published: number; withCandidates: number; empty: number; emptyCore: number; emptySpecial: number }> = {}
const missing: Array<{ subject: string; book: string; term: string; path: string[]; category: string; candidateIds: string[] }> = []
const keyOf = (subject: string, title: string, path: string[]) => `${subject}|${title}|${path.join(' / ')}`
const special = /(?:阅读综合实践|写作|专题学习活动|跨学科(?:实践|主题)|项目学习|数学活动|回顾与反思|复习题|复习与提高|章节综合与测试|单元(?:复习|测试|综合与测试)|本册综合|全册综合|单元总结|思考与行动|活动课|综合与实践|科学探究|实验活动|章末复习|本章复习|本章小结|整理与提升|学习与探究|课外古诗词诵读|整本书阅读|附录|后记|目录|绪言|引言|总复习|任务[一二三四五六七八九十]|读一读|阅读拓展|学史方法|大事年表|运用网络资源|如何研读经典著作|与同学们谈地理|做个小小会计师|天宫空间站轨道|Listening Scripts|Reading Plus|Pronunciation|Vocabulary(?: in Each Unit| A-Z| in Use)?|^Grammar$|^Project(?:[:：].*)?$|选学|词汇表)/iu

for (const volume of volumes) {
  const subject = volume.subject
  const leaves = volume.entries.filter((entry) => {
    const path = entry.path?.length ? entry.path : [entry.title]
    return !volume.entries.some((other) => {
      const otherPath = other.path?.length ? other.path : [other.title]
      return otherPath.length > path.length && path.every((part, index) => part === otherPath[index])
    })
  })
  const tally = { terminal: leaves.length, published: 0, withCandidates: 0, empty: 0, emptyCore: 0, emptySpecial: 0 }
  for (const entry of leaves) {
    const path = entry.path?.length ? entry.path : [entry.title]
    let coveredBy: string[] | undefined
    let candidateRows: Array<{ id: string; questions: number }> = []
    for (let depth = path.length; depth > 0; depth -= 1) {
      const prefix = path.slice(0, depth)
      const key = keyOf(subject, volume.title, prefix)
      if (publishedLocators.has(key)) {
        coveredBy = prefix
        break
      }
      candidateRows = candidatesByLocator.get(key) ?? []
      if (candidateRows.length) break
    }
    if (coveredBy) tally.published += 1
    else if (candidateRows.length) tally.withCandidates += 1
    else {
      tally.empty += 1
      const category = path.some((part) => special.test(part)) ? 'supporting' : 'core'
      if (category === 'core') tally.emptyCore += 1
      else tally.emptySpecial += 1
      missing.push({ subject, book: volume.title, term: volume.termLabel, path, category, candidateIds: candidateRows.map((row) => row.id) })
    }
  }
  summary[`${volume.title}/${subject}`] = tally
}

const countsBySubject: Record<string, { terminal: number; published: number; withCandidates: number; empty: number; emptyCore: number; emptySpecial: number }> = {}
for (const [key, tally] of Object.entries(summary)) {
  const subject = key.slice(key.lastIndexOf('/') + 1)
  const total = countsBySubject[subject] ??= { terminal: 0, published: 0, withCandidates: 0, empty: 0, emptyCore: 0, emptySpecial: 0 }
  for (const field of Object.keys(tally) as Array<keyof typeof tally>) total[field] += tally[field]
}

const includeMissing = process.argv.includes('--missing')
const includeAllMissing = process.argv.includes('--all-missing')
const compact = process.argv.includes('--compact')
const missingReport = missing.filter((entry) => entry.category === 'core').map((entry) => ({
  subject: entry.subject,
  book: entry.book,
  term: entry.term,
  path: entry.path.join(' / '),
}))
const allMissingReport = missing.map((entry) => ({
  subject: entry.subject,
  book: entry.book,
  term: entry.term,
  path: entry.path.join(' / '),
  category: entry.category,
  candidateIds: entry.candidateIds,
}))
const candidateReport = QUESTION_REVIEW_CANDIDATES.map((set) => ({
  id: set.id,
  grade: set.grade,
  subject: set.subject,
  volume: set.volume,
  chapter: set.chapter,
  section: set.section,
  edition: set.edition,
  questionCount: set.questions.length,
  samplePrompt: set.questions[0]?.prompt?.slice(0, 140),
  sampleSource: set.questions[0]?.sourceRef?.slice(0, 120),
}))
const detailId = process.argv.includes('--candidate-details')
  ? process.argv[process.argv.indexOf('--candidate-details') + 1]
  : undefined
const report = {
  catalogVolumes: volumes.length,
  catalogEntries: volumes.reduce((sum, volume) => sum + volume.entries.length, 0),
  publishedSets: PUBLISHED_PRACTICE_SETS.length,
  publishedQuestions: PUBLISHED_PRACTICE_SETS.reduce((sum, set) => sum + set.questions.length, 0),
  pendingCandidates: QUESTION_REVIEW_CANDIDATES.length,
  parentCatalogOnlyEntries: PARENT_PRACTICE_SETS.filter((set) => set.catalogOnly).length,
  bySubject: countsBySubject,
  byVolume: summary,
}

if (compact) {
  for (const [book, counts] of Object.entries(summary)) {
    console.log(`${book}\tterminal=${counts.terminal}\tpublished=${counts.published}\tcore-gaps=${counts.emptyCore}\tsupport-gaps=${counts.emptySpecial}`)
  }
} else if (process.argv.includes('--candidates')) {
  console.log(JSON.stringify(candidateReport, null, 2))
} else if (detailId) {
  const set = QUESTION_REVIEW_CANDIDATES.find((candidate) => candidate.id === detailId)
  console.log(JSON.stringify(set ? {
    id: set.id,
    subject: set.subject,
    grade: set.grade,
    volume: set.volume,
    chapter: set.chapter,
    section: set.section,
    edition: set.edition,
    sourceNote: set.sourceNote,
    questions: set.questions.map((question) => ({ prompt: question.prompt, options: question.options, answerIndex: question.answerIndex, correctAnswer: question.correctAnswer, explanation: question.explanation, sourceRef: question.sourceRef })),
  } : { error: `Candidate not found: ${detailId}` }, null, 2))
} else {
  console.log(JSON.stringify(includeAllMissing ? allMissingReport : includeMissing ? missingReport : report, null, 2))
}
