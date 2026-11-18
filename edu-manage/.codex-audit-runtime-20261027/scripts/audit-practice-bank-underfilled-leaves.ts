import currentJuniorCatalog from '../data/textbooks/current-junior-textbook-catalog-2026.json'
import { PUBLISHED_PRACTICE_SETS } from '../src/data/published-practice-bank'

type Entry = { title: string; path?: string[] }
type Volume = { subject: string; title: string; entries: Entry[] }

const minimumArg = process.argv.find((arg) => arg.startsWith('--minimum='))
const minimumQuestions = Math.max(1, Number(minimumArg?.split('=')[1] ?? 8) || 8)
const includeSupporting = process.argv.includes('--include-supporting')
const subjectArg = process.argv.find((arg) => arg.startsWith('--subject='))
const selectedSubjects = subjectArg ? new Set(subjectArg.split('=')[1].split(',').map((subject) => subject.trim()).filter(Boolean)) : null
const explanationArg = process.argv.find((arg) => arg.startsWith('--explanations-below='))
const explanationMinimum = Math.max(1, Number(explanationArg?.split('=')[1] ?? 65) || 65)
const compactWeak = process.argv.includes('--compact-weak')
const bookArg = process.argv.find((arg) => arg.startsWith('--book='))
const selectedBook = bookArg?.split('=')[1]
const pathPrefixArg = process.argv.find((arg) => arg.startsWith('--path-prefix='))
const pathPrefix = pathPrefixArg?.split('=')[1]
const locatorArg = process.argv.find((arg) => arg.startsWith('--locator='))
const exactLocator = locatorArg?.slice('--locator='.length)
const locatorContainsArg = process.argv.find((arg) => arg.startsWith('--locator-contains='))
const locatorContains = locatorContainsArg?.slice('--locator-contains='.length)
const special = /(?:阅读综合实践|写作|专题学习活动|跨学科(?:实践|主题)|项目学习|数学活动|回顾与反思|复习题|复习与提高|章节综合与测试|单元(?:复习|测试|综合与测试)|本册综合|全册综合|单元总结|思考与行动|活动课|综合与实践|科学探究|实验活动|章末复习|本章复习|本章小结|整理与提升|学习与探究|课外古诗词诵读|整本书阅读|附录|后记|目录|绪言|引言|总复习|任务[一二三四五六七八九十]|读一读|阅读拓展|学史方法|大事年表|运用网络资源|如何研读经典著作|与同学们谈地理|做个小小会计师|天宫空间站轨道|我国古代关于负数及有理数加减的记载|Listening Scripts|Reading Plus|Pronunciation|Vocabulary(?: in Each Unit| A-Z| in Use)?|^Grammar$|^Project(?:[:：].*)?$|选学|词汇表)/iu
const questionCounts = new Map<string, number>()
const keyOf = (subject: string, book: string, path: string[]) => `${subject}|${book}|${path.join(' / ')}`
const volumes = (currentJuniorCatalog as { volumes: Volume[] }).volumes

for (const set of PUBLISHED_PRACTICE_SETS) {
  const subject = set.subject === '政治' ? '道德与法治' : set.subject
  const locator = set.catalogEvidence?.locator
  if (!locator) continue
  const key = `${subject}|${set.grade === '初一' ? '七年级' : set.grade === '初二' ? '八年级' : '九年级'}${set.volume}|${locator}`
  questionCounts.set(key, (questionCounts.get(key) ?? 0) + set.questions.length)
}

if (explanationArg) {
  const reports = PUBLISHED_PRACTICE_SETS.flatMap((set) => {
    const subject = set.subject === '政治' ? '道德与法治' : set.subject
    const book = `${set.grade === '初一' ? '七年级' : set.grade === '初二' ? '八年级' : '九年级'}${set.volume}`
    const locator = set.catalogEvidence?.locator ?? ''
    if ((selectedSubjects && !selectedSubjects.has(subject)) || (selectedBook && selectedBook !== book) || (pathPrefix && !locator.startsWith(pathPrefix)) || (exactLocator && locator !== exactLocator) || (locatorContains && !locator.includes(locatorContains))) return []
    const weak = set.questions.flatMap((question) => {
      const length = question.explanation?.trim().length ?? 0
      if (length >= explanationMinimum) return []
      const answer = question.answerIndex === undefined ? question.correctAnswer : question.options?.[question.answerIndex]
      return [compactWeak ? { id: question.id, length, prompt: question.prompt, answer } : { id: question.id, length, prompt: question.prompt, options: question.options, answer, explanation: question.explanation }]
    })
    if (!weak.length) return []
    return [{ book, subject, locator, questionCount: set.questions.length, minExplanationLength: Math.min(...set.questions.map((question) => question.explanation?.trim().length ?? 0)), weakQuestions: weak }]
  })
  console.log(JSON.stringify({ explanationMinimum, reportCount: reports.length, reports }, null, 2))
  process.exit(0)
}

const rows: Array<{ subject: string; book: string; count: number; path: string[]; category: 'core' | 'supporting' }> = []
for (const volume of volumes) {
  const leaves = volume.entries.filter((entry) => {
    const path = entry.path?.length ? entry.path : [entry.title]
    return !volume.entries.some((other) => {
      const otherPath = other.path?.length ? other.path : [other.title]
      return otherPath.length > path.length && path.every((part, index) => part === otherPath[index])
    })
  })
  for (const entry of leaves) {
    const path = entry.path?.length ? entry.path : [entry.title]
    const count = questionCounts.get(keyOf(volume.subject, volume.title, path)) ?? 0
    const category = path.some((part) => special.test(part)) ? 'supporting' : 'core'
    if (count < minimumQuestions && (includeSupporting || category === 'core') && (!selectedSubjects || selectedSubjects.has(volume.subject))) {
      rows.push({ subject: volume.subject, book: volume.title, count, path, category })
    }
  }
}

const bySubject = new Map<string, number>()
for (const row of rows) bySubject.set(row.subject, (bySubject.get(row.subject) ?? 0) + 1)
console.log(`minimum=${minimumQuestions}; includedSupporting=${includeSupporting}; underfilledCoreLeaves=${rows.filter((row) => row.category === 'core').length}; allUnderfilledLeaves=${rows.length}`)
console.log(`bySubject=${JSON.stringify(Object.fromEntries(bySubject))}`)
for (const row of rows) console.log(`${row.book}\t${row.subject}\t${row.count}\t${row.category}\t${row.path.join(' / ')}`)
