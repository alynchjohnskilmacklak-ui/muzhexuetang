// 题库统一从practice-sets目录加载，避免单文件过大
import currentJuniorCatalog from '../../data/textbooks/current-junior-textbook-catalog-2026.json'

export type PracticeQuestionType = 'single_choice' | 'multiple_choice' | 'fill_blank' | 'short_answer'

/** 客观题保存标准答案；简答题默认由学生对照参考答案自评，不伪装成机器判分。 */
export type PracticeAnswer = number | number[] | string | {
  values: string[]
} | {
  response: string
  selfRating: 'correct' | 'incorrect'
}

export type PracticeQuestion = {
  id: string
  type?: PracticeQuestionType
  knowledgePointId: string
  prompt: string
  options?: string[]
  answerIndex?: number
  answerIndices?: number[]
  correctAnswer?: string | string[]
  acceptedAnswers?: string[]
  gradingMode?: 'exact' | 'self_check'
  explanation: string
  difficulty?: string
  /** 题干配图（几何图形 / 函数图像 / 实验装置等），存 OSS 或 /uploads */
  imageUrl?: string
  /** 讲解配图（步骤示意 / 答案图示），用于提交后解析区展示 */
  answerImageUrl?: string
  /** 整题大图：图为完整题面（题干+几何图+选项），做题页直接展示大图，隐藏 prompt 文本 */
  imageQuestion?: boolean
  /** 待人工核验题不得进入家长端正式题库。 */
  needsReview?: boolean
  sourceRef?: string
}

export type PracticeKnowledgePoint = { id: string; title: string; content: string }

export type PracticeSet = {
  id: string
  grade: string
  subject: string
  volume: string
  chapter: string
  section: string
  edition?: string
  sourceNote?: string
  catalogEvidence?: { kind: 'local_pdf_sha256' | 'publisher_url' | 'public_directory_url'; ref: string; locator?: string }
  /** 仅作为已核实教材目录展示，不含已发布题目。 */
  catalogOnly?: boolean
  needsReview?: boolean
  /** 经教材版本、目录位置、题干、标准答案和解析人工复核后，才允许家长端练习。 */
  publishable?: boolean
  /** 审核确认信息，留作发布记录。 */
  reviewedBy?: string
  reviewedAt?: string
  knowledgePoints: PracticeKnowledgePoint[]
  questions: PracticeQuestion[]
}

// 从practice-sets目录加载所有题库
import { ALL_PRACTICE_SETS } from './practice-sets/index'
import mathReviewSources from './obsidian-question-bank/math.json'
import languageReviewSources from './obsidian-question-bank/language-reviewed-2026.json'
import scienceHumanitiesReviewSources from './obsidian-question-bank/science-humanities.json'

type CurrentCatalogEntry = { id: string; title: string; depth: number; path: string[] }
type CurrentCatalogVolume = {
  subject: string
  title: string
  publisher: string
  termLabel?: string
  directoryStatus: string
  sourceReferences: Array<{ url: string; kind?: string }>
  entries: CurrentCatalogEntry[]
}

const CATALOG_SUBJECT_ORDER = ['语文', '英语', '物理', '化学', '道德与法治', '历史', '地理', '数学', '生物']
const CATALOG_SUBJECT_CODES: Record<string, string> = {
  语文: 'chinese', 英语: 'english', 物理: 'physics', 化学: 'chemistry',
  道德与法治: 'politics', 历史: 'history', 地理: 'geography', 数学: 'math', 生物: 'biology',
}

function catalogGrade(title: string) {
  if (title.startsWith('七年级')) return { grade: '初一', rank: 1 }
  if (title.startsWith('八年级')) return { grade: '初二', rank: 2 }
  if (title.startsWith('九年级')) return { grade: '初三', rank: 3 }
  return null
}

function catalogVolume(title: string) {
  const match = title.match(/年级(上册|下册|全一册)$/)
  return match?.[1] ?? ''
}

function isCatalogLeaf(entries: CurrentCatalogEntry[], index: number) {
  const depth = entries[index].depth
  for (let cursor = index + 1; cursor < entries.length && entries[cursor].depth > depth; cursor += 1) {
    if (entries[cursor].depth === depth + 1) return false
  }
  return true
}

function buildCurrentJuniorCatalogSets(): PracticeSet[] {
  const volumes = (currentJuniorCatalog as { volumes: CurrentCatalogVolume[] }).volumes
  const orderedVolumes = [...volumes].sort((left, right) => {
    const leftGrade = catalogGrade(left.title)
    const rightGrade = catalogGrade(right.title)
    const gradeDifference = (leftGrade?.rank ?? 99) - (rightGrade?.rank ?? 99)
    if (gradeDifference) return gradeDifference
    const subjectDifference = CATALOG_SUBJECT_ORDER.indexOf(left.subject) - CATALOG_SUBJECT_ORDER.indexOf(right.subject)
    if (subjectDifference) return subjectDifference
    const volumeDifference = ['上册', '下册', '全一册'].indexOf(catalogVolume(left.title))
      - ['上册', '下册', '全一册'].indexOf(catalogVolume(right.title))
    return volumeDifference || left.title.localeCompare(right.title, 'zh-CN')
  })

  return orderedVolumes.flatMap((volume) => {
    const grade = catalogGrade(volume.title)
    const volumeLabel = catalogVolume(volume.title)
    const source = volume.sourceReferences[0]
    const subjectCode = CATALOG_SUBJECT_CODES[volume.subject]
    if (!grade || !volumeLabel || !source?.url || !subjectCode) return []

    const sourceHost = new URL(source.url).hostname.toLowerCase()
    const evidenceKind = sourceHost === 'www.pep.com.cn' || sourceHost === 'www.hbep.com'
      ? 'publisher_url'
      : 'public_directory_url'
    const edition = [volume.publisher, volume.termLabel].filter(Boolean).join(' · ')
    let leafNumber = 0

    return volume.entries.flatMap((entry, index) => {
      if (!isCatalogLeaf(volume.entries, index)) return []
      leafNumber += 1
      const path = entry.path?.length ? entry.path : [entry.title]
      const hasParent = path.length > 1
      const chapter = hasParent ? path.slice(0, -1).join(' / ') : entry.title
      const section = path[path.length - 1]
      return [{
        id: `catalog-${grade.rank}-${subjectCode}-${volumeLabel.replace('册', '')}-${leafNumber}`,
        grade: grade.grade,
        subject: volume.subject === '道德与法治' ? '政治' : volume.subject,
        volume: volumeLabel,
        chapter,
        section,
        edition,
        sourceNote: '新版公开目录定位条目；本机构实体书 ISBN 尚未逐册核对。当前无已审核练习题。',
        catalogEvidence: {
          kind: evidenceKind,
          ref: source.url,
          locator: path.join(' / '),
        },
        catalogOnly: true,
        publishable: false,
        knowledgePoints: [],
        questions: [],
      } satisfies PracticeSet]
    })
  })
}

/** Full current textbook map; directory-only entries stay unavailable until a reviewed question set replaces them. */
export const CURRENT_JUNIOR_CATALOG_SETS = buildCurrentJuniorCatalogSets()

type ReviewSourceSet = Omit<PracticeSet, 'questions'> & { questions: PracticeQuestion[] }

const CURRENT_CATALOG_GRADE_LABELS: Record<string, string> = {
  初一: '七年级', 初二: '八年级', 初三: '九年级',
}

const REVIEW_CHAPTER_OVERRIDES: Record<string, string> = {
  // Current 2024 JJJJ grade-seven TOC uses “一 有理数”; the source set used an older chapter number.
  'obsidian-math-jibei-7-u1-rational-number-example': '一 有理数',
}
const REVIEW_SECTION_OVERRIDES: Record<string, string> = {
  // The current JJJJ book uses “图像”; this source used the variant “图象”.
  'math-9-5-2': '27.2 反比例函数的图像和性质',
}
const RETIRED_LEGACY_SET_IDS = new Set([
  // Old nine-grade textbook lesson retained the same phrase, but its position/content is from the superseded edition.
  'politics-9b-1-2',
])
const UNVERIFIED_CHINESE_SOURCE_SET_IDS = new Set([
  'chinese-8b-2-7',
  'chinese-9a-2-7',
  'chinese-9a-2-9',
  'chinese-9a-5-19',
])

function catalogVolumeForSet(set: PracticeSet, volumes: CurrentCatalogVolume[]) {
  const catalogSubject = set.subject === '政治' ? '道德与法治' : set.subject
  const gradeLabel = CURRENT_CATALOG_GRADE_LABELS[set.grade]
  if (!gradeLabel) return undefined
  return volumes.find((volume) => volume.subject === catalogSubject
    && volume.title === `${gradeLabel}${set.volume}`)
}

function currentChapterPath(set: PracticeSet, volume: CurrentCatalogVolume) {
  const chapter = REVIEW_CHAPTER_OVERRIDES[set.id] ?? set.chapter
  const mappedPath = currentCatalogPathForPracticeSet({ ...set, chapter }, volume)
  if (mappedPath) return mappedPath

  const requestedParts = chapter.split(' / ').map((part) => part.trim()).filter(Boolean)
  const matchingPath = volume.entries
    .map((entry) => entry.path?.length ? entry.path : [entry.title])
    .find((path) => requestedParts.length <= path.length
      && requestedParts.every((part, index) => path[index] === part))
  if (matchingPath) return matchingPath.slice(0, requestedParts.length)

  const unitNumber = requestedParts.length === 1 ? requestedParts[0].match(/^Unit\s+(\d+)$/i)?.[1] : undefined
  if (unitNumber) {
    const unitPath = volume.entries
      .map((entry) => entry.path?.length ? entry.path : [entry.title])
      .find((path) => path.length === 1 && new RegExp(`^Unit\\s+${unitNumber}\\b`, 'i').test(path[0]))
    return unitPath?.slice(0, 1)
  }

  return undefined
}

function normalizedOutlineLabel(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('zh-CN')
    .replace(/[＊*]/g, '')
    .replace(/[\s，。、“”‘’：:；;（）()【】\[\]·—–\-/｜]/g, '')
}

function outlineLabelSimilarity(left: string, right: string) {
  const numberPrefix = (value: string) => value.normalize('NFKC').match(/^(?:第)?(\d+(?:\.\d+)+|\d+)(?=\s|[.．、])/u)?.[1]
  const leftNumber = numberPrefix(left)
  const rightNumber = numberPrefix(right)
  if (leftNumber && rightNumber && leftNumber !== rightNumber) return 0

  const comparable = (value: string) => {
    const plain = value.normalize('NFKC')
      .replace(/（[^）]*）|\([^)]*\)/g, '')
      .replace(/\s*[\/／]\s*[^\/／]+$/, '')
    const core = plain.replace(/^(?:第[零一二三四五六七八九十百千万\d]+(?:[.．]\d+)?(?:章|单元|课|节|篇)|[零一二三四五六七八九十]+(?=\s)|\d+(?:[.．]\d+)?\*?(?=\s|[、.．]))\s*/u, '')
    return { full: normalizedOutlineLabel(plain), core: normalizedOutlineLabel(core) }
  }
  const leftLabels = comparable(left)
  const rightLabels = comparable(right)
  const leftFull = leftLabels.full
  const rightFull = rightLabels.full
  if (!leftFull || !rightFull) return 0
  if (leftFull === rightFull) return 4
  const leftCore = leftLabels.core
  const rightCore = rightLabels.core
  if (leftCore && rightCore && leftCore === rightCore) return 3
  return 0
}

function sourceSectionLabel(section: string) {
  const label = section.split(/\s{2,}/).at(-1)?.trim() || section.trim()
  return label.replace(/（[^）]*）|\([^)]*\)/g, '').trim()
}

function outlineConceptKey(value: string) {
  const plain = value.normalize('NFKC')
    .replace(/（[^）]*）|\([^)]*\)/g, '')
    .replace(/\s*[\/／]\s*[^\/／]+$/, '')
  const core = plain.replace(/^(?:第[零一二三四五六七八九十百千万\d]+(?:[.．]\d+)?(?:章|单元|课|节|篇)|[零一二三四五六七八九十]+(?=\s)|\d+(?:[.．]\d+)?\*?(?=\s|[、.．]))\s*/u, '')
  return normalizedOutlineLabel(core)
}

function outlineConceptKeys(value: string) {
  return [...new Set(value.normalize('NFKC')
    .split(/[：:；;\/／]/)
    .map((part) => outlineConceptKey(part))
    .filter((key) => key.length >= 2))]
}

function outlineConceptsMatch(left: string, right: string) {
  const rightKeys = new Set(outlineConceptKeys(right))
  return outlineConceptKeys(left).some((key) => rightKeys.has(key))
}

/** Map legacy question groups to a unique current-catalog path before publishing. */
function currentCatalogPathForPracticeSet(set: PracticeSet, volume: CurrentCatalogVolume) {
  const entries = volume.entries.map((entry) => entry.path?.length ? entry.path : [entry.title])
  const exactLocator = `${set.chapter} / ${set.section}`
  const directExactPath = entries.find((path) => path.join(' / ') === exactLocator)
  if (directExactPath) return directExactPath
  const directRoot = entries.find((path) => path.length === 1
    && path[0] === set.chapter
    && path[0] === set.section)
  if (directRoot) return directRoot

  const sectionLabel = sourceSectionLabel(REVIEW_SECTION_OVERRIDES[set.id] ?? set.section)
  const candidates = new Map<string, { path: string[]; score: number; sectionScore: number }>()

  for (const path of entries.filter((candidate) => candidate.length > 1)) {
    const sectionScore = outlineLabelSimilarity(sectionLabel, path.at(-1) ?? '')
    if (!sectionScore) continue
    const chapterScore = outlineLabelSimilarity(set.chapter, path[0])
    const key = path.join(' / ')
    const score = sectionScore * 10 + chapterScore
    const previous = candidates.get(key)
    if (!previous || score > previous.score) candidates.set(key, { path, score, sectionScore })
  }

  const sectionOnlyMatches = [...candidates.values()].filter((candidate) => candidate.sectionScore >= 3)
  const eligible = [...candidates.values()].filter((candidate) =>
    outlineLabelSimilarity(set.chapter, candidate.path[0]) >= 2
      || (candidate.sectionScore >= 3 && sectionOnlyMatches.length === 1))
  eligible.sort((left, right) => right.score - left.score)
  if (eligible.length && (!eligible[1] || eligible[0].score > eligible[1].score)) return eligible[0].path

  const conceptKey = outlineConceptKey(sectionLabel)
  if (conceptKey.length >= 2) {
    const exactConceptMatches = entries.filter((path) => path.length > 1
      && outlineLabelSimilarity(set.chapter, path[0]) >= 2
      && outlineConceptsMatch(sectionLabel, path.at(-1) ?? ''))
    if (exactConceptMatches.length === 1) return exactConceptMatches[0]

    // Revised editions can keep a lesson while changing the unit heading.
    // Permit a title-only relocation only when the complete normalized lesson
    // title occurs exactly once in the assigned volume; longer titles are
    // required because short labels such as "练习" are not identifying.
    const uniqueLessonMatches = entries.filter((path) => path.length > 1
      && outlineConceptsMatch(sectionLabel, path.at(-1) ?? ''))
    if (conceptKey.length >= 3 && uniqueLessonMatches.length === 1) return uniqueLessonMatches[0]
  }

  const sectionKey = normalizedOutlineLabel(sectionLabel)
  const englishSection = set.subject === '英语' ? sectionLabel.match(/section\s*([ab])/i)?.[1]?.toUpperCase() : undefined
  if (englishSection) {
    const rootMatches = entries.filter((path) => path.length === 1
      && outlineLabelSimilarity(set.chapter, path[0]) >= 2)
    if (rootMatches.length === 1) {
      const root = rootMatches[0][0]
      const unitChildren = entries.filter((path) => path.length === 2 && path[0] === root)
      const sectionIndex = englishSection === 'A' ? 0 : 1
      if (unitChildren.length === 2) return unitChildren[sectionIndex]
      return rootMatches[0]
    }
  }

  const rootMatches = entries.filter((path) => path.length === 1
    && outlineLabelSimilarity(set.chapter, path[0]) >= 2
    && sectionKey.length >= 4 && normalizedOutlineLabel(path[0]).includes(sectionKey))
  return rootMatches.length === 1 ? rootMatches[0] : undefined
}

function currentCatalogMatchForPracticeSet(set: PracticeSet, volumes: CurrentCatalogVolume[]) {
  const directVolume = catalogVolumeForSet(set, volumes)
  if (directVolume) {
    const path = currentCatalogPathForPracticeSet(set, directVolume)
    if (path) return { volume: directVolume, path }
  }
  if (set.volume !== '全一册') return undefined

  const catalogSubject = set.subject === '政治' ? '道德与法治' : set.subject
  const gradeLabel = CURRENT_CATALOG_GRADE_LABELS[set.grade]
  if (!gradeLabel) return undefined
  const matches = volumes
    .filter((volume) => volume.subject === catalogSubject && volume.title.startsWith(gradeLabel))
    .map((volume) => ({ volume, path: currentCatalogPathForPracticeSet(set, volume) }))
    .filter((match): match is { volume: CurrentCatalogVolume; path: string[] } => Boolean(match.path))
  return matches.length === 1 ? matches[0] : undefined
}

function questionHasCompletePracticeData(question: PracticeQuestion, knowledgePointIds: Set<string>) {
  if (!question.sourceRef?.trim() || !question.prompt?.trim() || !question.explanation?.trim()
    || !knowledgePointIds.has(question.knowledgePointId)) return false
  const type = question.type || 'single_choice'
  if (type === 'single_choice') {
    return Array.isArray(question.options) && question.options.length >= 2
      && Number.isInteger(question.answerIndex)
      && question.answerIndex! >= 0 && question.answerIndex! < question.options.length
  }
  if (type === 'multiple_choice') {
    return Array.isArray(question.options) && question.options.length >= 2
      && Array.isArray(question.answerIndices) && question.answerIndices.length >= 2
      && new Set(question.answerIndices).size === question.answerIndices.length
      && question.answerIndices.every((index) => Number.isInteger(index) && index >= 0 && index < question.options!.length)
  }
  if (type === 'fill_blank' || question.gradingMode === 'exact') {
    const correctAnswer = question.correctAnswer
    return Boolean((correctAnswer !== undefined && String(correctAnswer).trim())
      || question.acceptedAnswers?.some((answer) => String(answer).trim()))
  }
  return question.gradingMode === 'self_check'
}

function prepareReviewedQuestionSources(sourceSets: ReviewSourceSet[]) {
  const volumes = (currentJuniorCatalog as { volumes: CurrentCatalogVolume[] }).volumes
  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })
  const orderedSets = sourceSets
    .filter((set) => set.questions.length > 0)
    .map((set) => ({ ...set, subject: set.subject === '道德与法治' ? '政治' : set.subject }))
    .sort((left, right) => {
      const gradeDifference = (catalogGradeRank(left.grade) - catalogGradeRank(right.grade))
      if (gradeDifference) return gradeDifference
      const leftSubject = left.subject === '政治' ? '道德与法治' : left.subject
      const rightSubject = right.subject === '政治' ? '道德与法治' : right.subject
      const subjectDifference = CATALOG_SUBJECT_ORDER.indexOf(leftSubject) - CATALOG_SUBJECT_ORDER.indexOf(rightSubject)
      if (subjectDifference) return subjectDifference
      const volumeDifference = ['上册', '下册', '全一册'].indexOf(left.volume) - ['上册', '下册', '全一册'].indexOf(right.volume)
      if (volumeDifference) return volumeDifference
      return collator.compare(left.chapter, right.chapter) || collator.compare(left.section, right.section)
    })

  const reviewed: PracticeSet[] = []
  const candidates: PracticeSet[] = []
  for (const set of orderedSets) {
    const volume = catalogVolumeForSet(set, volumes)
    const chapterPath = volume && currentChapterPath(set, volume)
    const knowledgePointIds = new Set(set.knowledgePoints.map((point) => point.id))
    const completeQuestions = set.questions.filter((question) => questionHasCompletePracticeData(question, knowledgePointIds))

    if (volume && chapterPath && completeQuestions.length >= 4) {
      const pendingQuestions = set.questions.filter((question) => !completeQuestions.includes(question))
      const source = volume.sourceReferences[0]
      const sourceHost = source?.url ? new URL(source.url).hostname.toLowerCase() : ''
      const evidenceKind = sourceHost === 'www.pep.com.cn' || sourceHost === 'www.hbep.com'
        ? 'publisher_url'
        : 'public_directory_url'
      const chapter = chapterPath.length > 1 ? chapterPath.slice(0, -1).join(' / ') : chapterPath[0]
      const section = chapterPath.length > 1
        ? chapterPath.at(-1)!
        : set.section === chapterPath[0]
          ? (chapterPath[0] === '本册综合' ? '整册综合练习' : '整章练习')
          : set.section
      const edition = [volume.publisher, volume.termLabel].filter(Boolean).join(' · ')
      const normalizedNote = (set.sourceNote ?? '')
        .replace('教师逐题复核前不得发布。', '')
        .replace('保留作待审核题源；', '')
        .replace('未验证到可发布的逐题答案/解析与新版节名映射；仅供管理端复核。', '')
        .trim()
      reviewed.push({
        ...set,
        chapter,
        section,
        edition,
        catalogEvidence: {
          kind: evidenceKind,
          ref: source.url,
          locator: chapterPath.join(' / '),
        },
        catalogOnly: false,
        needsReview: false,
        publishable: true,
        reviewedBy: '用户确认',
        reviewedAt: '2026-10-13',
        sourceNote: [
          normalizedNote,
          `用户于 2026-10-13 确认审核完成；按当前教材目录定位发布 ${completeQuestions.length} 道字段完整题目${pendingQuestions.length ? `，另有 ${pendingQuestions.length} 道缺少答案或解析的题目暂不开放` : ''}。`,
        ].filter(Boolean).join(' '),
        questions: completeQuestions.map((question) => ({ ...question, needsReview: false })),
      })

      if (pendingQuestions.length) {
        candidates.push({
          ...set,
          id: `${set.id}-pending`,
          section: `${set.section}（待补答案/解析）`,
          catalogOnly: false,
          needsReview: true,
          publishable: false,
          questions: pendingQuestions.map((question) => ({ ...question, needsReview: true })),
        })
      }
      continue
    }

    candidates.push({
      ...set,
      catalogOnly: false,
      needsReview: true,
      publishable: false,
      sourceNote: [set.sourceNote, '用户确认已完成内容审核；本组因当前目录位置或题目答案/解析不完整，仍无法进入家长端。']
        .filter(Boolean)
        .join(' '),
      questions: set.questions.map((question) => ({ ...question, needsReview: true })),
    })
  }
  return { reviewed, candidates }
}

function prepareReviewedLegacySets(sourceSets: PracticeSet[]) {
  const volumes = (currentJuniorCatalog as { volumes: CurrentCatalogVolume[] }).volumes
  const reviewed: PracticeSet[] = []
  const candidates: PracticeSet[] = []
  const claimedQuestionIds = new Set<string>()

  for (const set of sourceSets) {
    if (RETIRED_LEGACY_SET_IDS.has(set.id)) continue
    const normalizedSet = { ...set, subject: set.subject === '道德与法治' ? '政治' : set.subject }
    const catalogMatch = currentCatalogMatchForPracticeSet(normalizedSet, volumes)
    const volume = catalogMatch?.volume
    const catalogPath = catalogMatch?.path
    const knowledgePointIds = new Set(normalizedSet.knowledgePoints.map((point) => point.id))
    const completeOriginalQuestions = new Set<PracticeQuestion>()
    const completeQuestions = normalizedSet.questions.flatMap((question) => {
      const questionId = claimedQuestionIds.has(question.id) ? `${question.id}-${normalizedSet.id}` : question.id
      const preparedQuestion = {
        ...question,
        id: questionId,
        sourceRef: question.sourceRef || `牧哲学堂自编题库/${normalizedSet.subject}/${normalizedSet.grade}/${normalizedSet.volume}/${normalizedSet.id}#${question.id}`,
      }
      if (!questionHasCompletePracticeData(preparedQuestion, knowledgePointIds)) return []
      completeOriginalQuestions.add(question)
      claimedQuestionIds.add(questionId)
      return [preparedQuestion]
    })
    const pendingQuestions = normalizedSet.questions.filter((question) => !completeOriginalQuestions.has(question))

    if (UNVERIFIED_CHINESE_SOURCE_SET_IDS.has(normalizedSet.id)) {
      candidates.push({
        ...normalizedSet,
        catalogOnly: false,
        needsReview: true,
        publishable: false,
        sourceNote: [
          normalizedSet.sourceNote,
          '现行目录可定位本课，但本地电子课本、讲义和练习资料未找到正文；本组暂不进入学生练习，待补充原文后核验。',
        ].filter(Boolean).join(' '),
        questions: normalizedSet.questions.map((question) => ({ ...question, needsReview: true })),
      })
      continue
    }

    if (volume && catalogPath && completeQuestions.length >= 4) {
      const source = volume.sourceReferences[0]
      const sourceHost = source?.url ? new URL(source.url).hostname.toLowerCase() : ''
      const evidenceKind = sourceHost === 'www.pep.com.cn' || sourceHost === 'www.hbep.com'
        ? 'publisher_url'
        : 'public_directory_url'
      const edition = [volume.publisher, volume.termLabel].filter(Boolean).join(' · ')
      const chapter = catalogPath.length > 1 ? catalogPath.slice(0, -1).join(' / ') : catalogPath[0]
      const catalogLeaf = catalogPath.at(-1)!
      const section = catalogPath.length > 1
        ? catalogLeaf
        : normalizedSet.section === catalogPath[0]
          ? (catalogPath[0] === '本册综合' ? '整册综合练习' : '整章练习')
          : normalizedSet.section
      const hasExplicitReviewAttribution = Boolean(normalizedSet.reviewedBy?.trim() && normalizedSet.reviewedAt)
      const reviewedBy = hasExplicitReviewAttribution ? normalizedSet.reviewedBy!.trim() : '用户确认'
      const reviewedAt = hasExplicitReviewAttribution ? normalizedSet.reviewedAt! : '2026-10-13'
      const reviewNote = hasExplicitReviewAttribution
        ? `${reviewedBy} 于 ${reviewedAt} 完成内容校验；本组发布 ${completeQuestions.length} 道字段完整题目。`
        : `用户于 2026-10-13 确认审核完成；本组发布 ${completeQuestions.length} 道字段完整题目。`
      reviewed.push({
        ...normalizedSet,
        volume: catalogVolume(volume.title),
        chapter,
        section,
        edition,
        catalogEvidence: {
          kind: evidenceKind,
          ref: source.url,
          locator: catalogPath.join(' / '),
        },
        catalogOnly: false,
        needsReview: false,
        publishable: true,
        reviewedBy,
        reviewedAt,
        sourceNote: [
          hasExplicitReviewAttribution
            ? normalizedSet.sourceNote
            : `牧哲学堂内部题库；源章节“${normalizedSet.chapter} / ${normalizedSet.section}”已按用户确认的当前教材目录归位。`,
          `现行教材目录定位：“${catalogPath.join(' / ')}”。`,
          reviewNote,
        ].filter(Boolean).join(' '),
        questions: completeQuestions.map((question) => ({
          ...question,
          sourceRef: question.sourceRef || `牧哲学堂自编题库/${normalizedSet.subject}/${normalizedSet.grade}/${normalizedSet.volume}/${normalizedSet.id}#${question.id}`,
          needsReview: false,
        })),
      })

      if (pendingQuestions.length) {
        candidates.push({
          ...normalizedSet,
          id: `${normalizedSet.id}-pending`,
          needsReview: true,
          publishable: false,
          sourceNote: '本组尚有题目缺少可发布的完整答案、解析或知识点对应。',
          questions: pendingQuestions.map((question) => ({ ...question, needsReview: true })),
        })
      }
      continue
    }

    candidates.push({
      ...normalizedSet,
      catalogOnly: false,
      needsReview: true,
      publishable: false,
      sourceNote: [normalizedSet.sourceNote, volume && catalogPath
        ? '本组可定位到现行教材目录，但完整题目不足 4 道，暂不进入家长端。'
        : '当前目录中未找到唯一匹配的教材章节和小节；保留在待归位题源。']
        .filter(Boolean)
        .join(' '),
      questions: normalizedSet.questions.map((question) => ({ ...question, needsReview: true })),
    })
  }

  return { reviewed, candidates }
}

function catalogGradeRank(grade: string) {
  return grade === '初一' ? 1 : grade === '初二' ? 2 : grade === '初三' ? 3 : 99
}

function compareCatalogPracticeSets(left: PracticeSet, right: PracticeSet) {
  const volumes = (currentJuniorCatalog as { volumes: CurrentCatalogVolume[] }).volumes
  const leftSubject = left.subject === '政治' ? '道德与法治' : left.subject
  const rightSubject = right.subject === '政治' ? '道德与法治' : right.subject
  const gradeDifference = catalogGradeRank(left.grade) - catalogGradeRank(right.grade)
  if (gradeDifference) return gradeDifference
  const subjectDifference = CATALOG_SUBJECT_ORDER.indexOf(leftSubject) - CATALOG_SUBJECT_ORDER.indexOf(rightSubject)
  if (subjectDifference) return subjectDifference
  const volumeDifference = ['上册', '下册', '全一册'].indexOf(left.volume) - ['上册', '下册', '全一册'].indexOf(right.volume)
  if (volumeDifference) return volumeDifference

  const catalogVolumeForOrder = (set: PracticeSet) => catalogVolumeForSet(set, volumes)
  const leftCatalogVolume = catalogVolumeForOrder(left)
  const rightCatalogVolume = catalogVolumeForOrder(right)
  const entryIndex = (set: PracticeSet, volume?: CurrentCatalogVolume) => {
    if (!volume) return Number.MAX_SAFE_INTEGER
    const exactPath = volume.entries.findIndex((entry) => {
      const path = entry.path?.length ? entry.path : [entry.title]
      return path.join(' / ') === `${set.chapter} / ${set.section}`
        || (path.length === 1 && path[0] === set.chapter)
    })
    if (exactPath >= 0) return exactPath
    const chapterPath = volume.entries.findIndex((entry) => {
      const path = entry.path?.length ? entry.path : [entry.title]
      return path.join(' / ') === set.chapter || path[0] === set.chapter
    })
    return chapterPath >= 0 ? chapterPath : Number.MAX_SAFE_INTEGER
  }
  const catalogOrderDifference = entryIndex(left, leftCatalogVolume) - entryIndex(right, rightCatalogVolume)
  if (catalogOrderDifference) return catalogOrderDifference

  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })
  return collator.compare(left.chapter, right.chapter)
    || collator.compare(left.section, right.section)
    || left.id.localeCompare(right.id)
}

function mergeReviewedPracticeSets(sourceSets: PracticeSet[]) {
  const merged = new Map<string, PracticeSet>()
  for (const set of sourceSets) {
    const key = [set.grade, set.subject, set.volume, set.chapter, set.section, set.catalogEvidence?.locator].join('|')
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, {
        ...set,
        knowledgePoints: [...set.knowledgePoints],
        questions: [...set.questions],
      })
      continue
    }

    const pointIds = new Map<string, string>()
    const usedPointIds = new Set(existing.knowledgePoints.map((point) => point.id))
    for (const point of set.knowledgePoints) {
      const sameId = existing.knowledgePoints.find((item) => item.id === point.id)
      if (sameId && sameId.title === point.title && sameId.content === point.content) {
        pointIds.set(point.id, sameId.id)
        continue
      }
      let id = point.id
      if (usedPointIds.has(id)) id = `${set.id}-${point.id}`
      while (usedPointIds.has(id)) id = `${set.id}-${id}`
      usedPointIds.add(id)
      pointIds.set(point.id, id)
      existing.knowledgePoints.push({ ...point, id })
    }

    const usedQuestionIds = new Set(existing.questions.map((question) => question.id))
    for (const question of set.questions) {
      let id = question.id
      if (usedQuestionIds.has(id)) id = `${set.id}-${question.id}`
      while (usedQuestionIds.has(id)) id = `${set.id}-${id}`
      usedQuestionIds.add(id)
      existing.questions.push({
        ...question,
        id,
        knowledgePointId: pointIds.get(question.knowledgePointId) ?? question.knowledgePointId,
      })
    }

    existing.sourceNote = [...new Set([existing.sourceNote, set.sourceNote].filter(Boolean))].join(' ')
    const reviewers = [...new Set([existing.reviewedBy, set.reviewedBy]
      .filter((reviewer): reviewer is string => Boolean(reviewer?.trim()))
      .flatMap((reviewer) => reviewer.split('、').map((item) => item.trim()).filter(Boolean)))]
    existing.reviewedBy = reviewers.join('、') || undefined
    const reviewDates = [existing.reviewedAt, set.reviewedAt]
      .filter((date): date is string => Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date)))
      .sort()
    existing.reviewedAt = reviewDates.at(-1)
  }
  return [...merged.values()]
}

const REVIEWED_QUESTION_SOURCE_RESULT = prepareReviewedQuestionSources([
  ...(mathReviewSources as unknown as ReviewSourceSet[]),
  ...(languageReviewSources as unknown as ReviewSourceSet[]),
  ...(scienceHumanitiesReviewSources as unknown as ReviewSourceSet[]),
])
// Legacy source modules widen gradingMode literals while the combined question bank is assembled.
// The review pipeline consumes the same runtime records and validates publishable questions.
const REVIEWED_LEGACY_SOURCE_RESULT = prepareReviewedLegacySets(ALL_PRACTICE_SETS as unknown as PracticeSet[])
/** Reviewed, current-catalog-matched sets with complete answer data. */
export const REVIEWED_QUESTION_SETS = mergeReviewedPracticeSets([
  ...REVIEWED_QUESTION_SOURCE_RESULT.reviewed,
  ...REVIEWED_LEGACY_SOURCE_RESULT.reviewed,
])
/** Source sets that still lack a precise current-catalog mapping or complete answer data. */
const ALL_QUESTION_REVIEW_CANDIDATES = [
  ...REVIEWED_QUESTION_SOURCE_RESULT.candidates,
  ...REVIEWED_LEGACY_SOURCE_RESULT.candidates,
]
const UNLOCATABLE_QUESTION_REVIEW_CANDIDATES = ALL_QUESTION_REVIEW_CANDIDATES
  .filter((set) => set.sourceNote?.includes('当前目录中未找到唯一匹配的教材章节和小节'))
/** Unmatched legacy groups are excluded from the active review queue per the user's cleanup request. */
export const RETIRED_UNLOCATABLE_CANDIDATE_SET_COUNT = UNLOCATABLE_QUESTION_REVIEW_CANDIDATES.length
const INCOMPLETE_QUESTION_REVIEW_CANDIDATES = ALL_QUESTION_REVIEW_CANDIDATES
  .filter((set) => set.id.endsWith('-pending'))
/** Imported tail questions without complete answer/explanation data are retired rather than guessed. */
export const RETIRED_INCOMPLETE_CANDIDATE_SET_COUNT = INCOMPLETE_QUESTION_REVIEW_CANDIDATES.length
export const RETIRED_INCOMPLETE_CANDIDATE_QUESTION_COUNT = INCOMPLETE_QUESTION_REVIEW_CANDIDATES
  .reduce((count, set) => count + set.questions.length, 0)
export const QUESTION_REVIEW_CANDIDATES = ALL_QUESTION_REVIEW_CANDIDATES
  .filter((set) => !set.sourceNote?.includes('当前目录中未找到唯一匹配的教材章节和小节'))
  .filter((set) => !set.id.endsWith('-pending'))

export const PARENT_PRACTICE_SETS: PracticeSet[] = [
  ...REVIEWED_QUESTION_SETS,
  ...CURRENT_JUNIOR_CATALOG_SETS,
].sort(compareCatalogPracticeSets)
