import currentJuniorCatalog from '../data/textbooks/current-junior-textbook-catalog-2026.json'
import { QUESTION_REVIEW_CANDIDATES } from '../src/data/parent-practice-bank'
import { PUBLISHED_PRACTICE_SETS } from '../src/data/published-practice-bank'

type Entry = { title: string; path?: string[] }
type Volume = {
  subject: string
  title: string
  publisher: string
  termLabel?: string
  entries: Entry[]
}

const volumes = (currentJuniorCatalog as { volumes: Volume[] }).volumes
const special = /(?:阅读综合实践|写作|专题学习活动|跨学科(?:实践|主题)|项目学习|数学活动|回顾与反思|复习题|复习与提高|章节综合与测试|单元(?:复习|测试|综合与测试)|本册综合|全册综合|单元总结|思考与行动|活动课|综合与实践|科学探究|实验活动|章末复习|本章复习|本章小结|整理与提升|学习与探究|课外古诗词诵读|整本书阅读|附录|后记|目录|绪言|引言|总复习|任务[一二三四五六七八九十]|读一读|阅读拓展|学史方法|大事年表|运用网络资源|如何研读经典著作|与同学们谈地理|做个小小会计师|天宫空间站轨道|Listening Scripts|Reading Plus|Pronunciation|Vocabulary(?: in Each Unit| A-Z| in Use)?|^Grammar$|^Project(?:[:：].*)?$|选学|词汇表)/iu
const gradeLabel: Record<string, string> = { 初一: '七年级', 初二: '八年级', 初三: '九年级' }
const locatorQuestionCounts = new Map<string, number>()
const locatorSetCounts = new Map<string, number>()
const keyOf = (subject: string, book: string, path: string[]) => `${subject}|${book}|${path.join(' / ')}`

for (const set of PUBLISHED_PRACTICE_SETS) {
  const subject = set.subject === '政治' ? '道德与法治' : set.subject
  const book = `${gradeLabel[set.grade] ?? ''}${set.volume}`
  const locator = set.catalogEvidence?.locator
  if (!locator) continue
  const key = `${subject}|${book}|${locator}`
  locatorQuestionCounts.set(key, (locatorQuestionCounts.get(key) ?? 0) + set.questions.length)
  locatorSetCounts.set(key, (locatorSetCounts.get(key) ?? 0) + 1)
}

const gaps: Array<{
  subject: string
  book: string
  term?: string
  path: string[]
  category: 'core' | 'supporting'
  nearestParentLocators: string[]
}> = []
const byBook: Record<string, {
  terminalLeaves: number
  exactCoveredLeaves: number
  ancestorOnlyLeaves: number
  uncoveredLeaves: number
  exactQuestions: number
  supportingGaps: number
  coreGaps: number
}> = {}

for (const volume of volumes) {
  const leaves = volume.entries.filter((entry) => {
    const path = entry.path?.length ? entry.path : [entry.title]
    return !volume.entries.some((other) => {
      const otherPath = other.path?.length ? other.path : [other.title]
      return otherPath.length > path.length && path.every((part, index) => part === otherPath[index])
    })
  })
  const tally = byBook[`${volume.title}/${volume.subject}`] = {
    terminalLeaves: leaves.length,
    exactCoveredLeaves: 0,
    ancestorOnlyLeaves: 0,
    uncoveredLeaves: 0,
    exactQuestions: 0,
    supportingGaps: 0,
    coreGaps: 0,
  }

  for (const entry of leaves) {
    const path = entry.path?.length ? entry.path : [entry.title]
    const key = keyOf(volume.subject, volume.title, path)
    const exactQuestions = locatorQuestionCounts.get(key) ?? 0
    tally.exactQuestions += exactQuestions
    if (exactQuestions > 0) {
      tally.exactCoveredLeaves += 1
      continue
    }

    const nearestParentLocators: string[] = []
    for (let depth = path.length - 1; depth > 0; depth -= 1) {
      const parentPath = path.slice(0, depth)
      const parentKey = keyOf(volume.subject, volume.title, parentPath)
      if ((locatorQuestionCounts.get(parentKey) ?? 0) > 0) nearestParentLocators.push(parentPath.join(' / '))
    }
    const category = path.some((part) => special.test(part)) ? 'supporting' : 'core'
    if (nearestParentLocators.length) tally.ancestorOnlyLeaves += 1
    else tally.uncoveredLeaves += 1
    if (category === 'supporting') tally.supportingGaps += 1
    else tally.coreGaps += 1
    gaps.push({ subject: volume.subject, book: volume.title, term: volume.termLabel, path, category, nearestParentLocators })
  }
}

const summary = Object.values(byBook).reduce((acc, row) => {
  for (const key of Object.keys(acc) as Array<keyof typeof acc>) acc[key] += row[key]
  return acc
}, {
  terminalLeaves: 0,
  exactCoveredLeaves: 0,
  ancestorOnlyLeaves: 0,
  uncoveredLeaves: 0,
  exactQuestions: 0,
  supportingGaps: 0,
  coreGaps: 0,
})

if (process.argv.includes('--gaps')) {
  console.log(JSON.stringify(gaps, null, 2))
} else if (process.argv.includes('--compact')) {
  for (const [book, row] of Object.entries(byBook)) {
    console.log(`${book}\tleaves=${row.terminalLeaves}\texact=${row.exactCoveredLeaves}\tancestor-only=${row.ancestorOnlyLeaves}\tuncovered=${row.uncoveredLeaves}\texact-questions=${row.exactQuestions}`)
  }
  console.log(`TOTAL\t${JSON.stringify(summary)}`)
} else {
  console.log(JSON.stringify({
    catalogVolumes: volumes.length,
    catalogEntries: volumes.reduce((sum, volume) => sum + volume.entries.length, 0),
    publishedSets: PUBLISHED_PRACTICE_SETS.length,
    publishedQuestions: PUBLISHED_PRACTICE_SETS.reduce((sum, set) => sum + set.questions.length, 0),
    pendingCandidates: QUESTION_REVIEW_CANDIDATES.length,
    summary,
    byBook,
    gaps,
  }, null, 2))
}
