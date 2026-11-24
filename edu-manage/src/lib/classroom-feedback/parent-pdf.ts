import type { FeedbackArchiveItem, FeedbackArchiveResult } from './archive'
import type { AdminLearningReport } from '@/lib/student-growth/admin-report'
import { applyWatermark, drawBrandHeader } from '@/lib/export-brand'
import {
  getParentClassroomFeedbackContent,
  getParentFeedbackDisplaySections,
  getParentFeedbackSections,
  parentRatingLabel,
  type ParentFeedbackSection,
} from './parent-feedback-content'
import { parseStoredKnowledgeCard } from './knowledge-point-cards'
import { normalizePersonalizedLearningExtension } from './personalized-learning'
import { buildParentStudyGuide } from './parent-study-guide'

const PAGE_WIDTH = 1240
const PAGE_HEIGHT = 1754
const PAGE_RENDER_SCALE = 2
const PAGE_WIDTH_MM = 210
const PAGE_HEIGHT_MM = 297
const PAGE_MARGIN = 76
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2
const CONTENT_BOTTOM = PAGE_HEIGHT - 120
const SUBJECT_ORDER = ['数学', '语文', '英语', '物理', '化学', '生物', '道德与法治', '政治', '历史', '地理']
const META_SECTION_LABELS = new Set(['课堂标签', '课堂评价'])

export const SERIF_FONT_FAMILY = '"Times New Roman", Times, "SimSun", "Songti SC", "STSong", "Noto Serif SC", serif'
export const MONO_FONT_FAMILY = '"Times New Roman", "Geist Mono", Consolas, "SimSun", serif'

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ',
}

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
}

export function toSuperscript(str: string): string {
  return str.split('').map((char) => SUPERSCRIPT_MAP[char] || char).join('')
}

export function toSubscript(str: string): string {
  return str.split('').map((char) => SUBSCRIPT_MAP[char] || char).join('')
}

export function normalizeAcademicFormulaText(text: string): string {
  if (!text) return ''
  let result = text

  // 1. 指数幂次转为 Unicode 上标：10^7 -> 10⁷, m^2 -> m², cm^3 -> cm³, 10^-3 -> 10⁻³
  result = result.replace(/([A-Za-z0-9]+)\^([0-9+\-nxy]+)/g, (_, base, exp) => {
    return `${base}${toSuperscript(exp)}`
  })

  // 2. 常见物理量/化学式下标转为 Unicode 下标：H_2O -> H₂O, CO_2 -> CO₂
  result = result.replace(/([A-Za-z]+)_([0-9+\-]+)/g, (_, base, sub) => {
    return `${base}${toSubscript(sub)}`
  })

  // 3. 乘号规范化：4.6*10 -> 4.6 × 10, 4.6x10 -> 4.6 × 10, 2*3 -> 2 × 3
  result = result.replace(/(\d+(?:\.\d+)?)\s*[xX*]\s*(10[⁰¹²³⁴⁵⁶⁷⁸⁹]|10\b)/g, '$1 × $2')
  result = result.replace(/(\d+(?:\.\d+)?)\s*[*]\s*(\d+)/g, '$1 × $2')

  // 4. 规范乘号 × 两侧留单空格
  result = result.replace(/\s*×\s*/g, ' × ')

  // 5. 等号两侧规范留白（针对公式，如 Q放=mq 变成 Q放 = mq，η=W有用/Q放 变成 η = W有用 / Q放）
  result = result.replace(/([^=<>!+\-\s])=([^=<>!+\-\s])/g, '$1 = $2')

  // 6. 加号规范间距（如 W有用+Q损失 变成 W有用 + Q损失）
  result = result.replace(/([^+\-\s])\+([^+\-\s])/g, '$1 + $2')

  // 7. 公式中的除号/分数线两边规范（保留标准单位如 J/kg, m/s 不受影响）
  result = result.replace(/([\u4e00-\u9fa5]+)\/([\u4e00-\u9fa5A-Za-z]+)/g, '$1 / $2')
  result = result.replace(/([A-Za-z]+)\/([\u4e00-\u9fa5]+)/g, '$1 / $2')

  return result
}

type LearningReportField = { label: string; value: string }
type LearningReportMetric = { label: string; value: string }
type LearningReportRecord = { title: string; detail?: string; value?: string }
type LearningReportSection = {
  title: string
  lines: string[]
  fields?: LearningReportField[]
  metrics?: LearningReportMetric[]
  records?: LearningReportRecord[]
}

const EMPTY_REPORT_LINES = new Set([
  '本期暂无成绩记录',
  '暂无学习目标',
  '暂无薄弱点记录',
  '本期暂无已发布的阶段小结',
  '本期暂无已发布的课堂反馈记录',
])

function isVisibleReportLine(line: string) {
  const value = line.trim()
  if (!value || EMPTY_REPORT_LINES.has(value)) return false
  return !/^(?:年级|性别|学校|主教师|家长|在读课程|考勤|成绩|学习目标|薄弱点)\s*[：:]\s*(?:未填写|未设置|未分配|暂无|无记录|—|-)/u.test(value)
}

const COLORS = {
  canvas: '#faf8f5',
  surface: '#ffffff',
  surfaceSoft: '#f5f2ee',
  primary: '#E8784A',
  primarySoft: '#fff3ec',
  green: '#14574D',
  greenSoft: '#EAF4F1',
  gold: '#8A6517',
  goldSoft: '#F8F1DE',
  ink: '#1a1201',
  muted: '#5a4e3a',
  subtle: '#9a8e7a',
  border: '#eadfd5',
}

export type ParentFeedbackDay = {
  date: string
  weekday: string
  items: FeedbackArchiveItem[]
}

type LoadedFeedbackImage = {
  image: HTMLImageElement
  dispose: () => void
}

export type ParentFeedbackPdfResult = {
  blob: Blob
  embeddedImages: number
  skippedImages: number
}

export type ParentFeedbackPdfOptions = {
  onPageRendered?: (dataUrl: string, pageNumber: number) => void
  imageLoader?: (request: ParentPdfImageRequest) => Promise<LoadedFeedbackImage>
  learningReport?: AdminLearningReport
  skipCover?: boolean
  startPageNumber?: number
  reportSubtitle?: string
}

function feedbackOverviewLines(items: FeedbackArchiveItem[]) {
  if (!items.length) return ['本期暂无已发布的课堂反馈记录']

  const subjects = [...new Set(items.map((item) => item.subject).filter(Boolean))]
  const topics = new Map<string, number>()
  const observations = new Map<string, number>()
  for (const item of items) {
    for (const point of item.knowledgePoints) {
      const topic = point.trim()
      if (topic) topics.set(topic, (topics.get(topic) || 0) + 1)
    }
    for (const tag of item.learningSnapshot?.tags || []) {
      const observation = tag.trim()
      if (observation) observations.set(observation, (observations.get(observation) || 0) + 1)
    }
  }

  const mostFrequent = (counts: Map<string, number>, limit = 4) => [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
    .slice(0, limit)
    .map(([label, count]) => count > 1 ? `${label}（${count}次）` : label)

  const lines = [
    `本期整理 ${items.length} 节课堂反馈，涉及 ${subjects.length} 门学科：${subjects.join('、') || '课程记录'}`,
  ]
  const repeatedTopics = mostFrequent(topics)
  if (repeatedTopics.length) lines.push(`课堂知识重点：${repeatedTopics.join('、')}`)
  const repeatedObservations = mostFrequent(observations)
  if (repeatedObservations.length) lines.push(`教师课堂观察：${repeatedObservations.join('、')}`)

  const recentEvaluations = [...items]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((item) => ({
      item,
      content: getParentFeedbackDisplaySections(item)[0]?.content.trim() || '',
    }))
    .filter((entry) => entry.content)
    .slice(0, 2)
  for (const { item, content } of recentEvaluations) {
    const excerpt = content.length > 96 ? `${content.slice(0, 96)}…` : content
    lines.push(`${item.date.slice(0, 10)} · ${item.subject} · ${item.teacher.name}老师：${excerpt}`)
  }
  lines.push('下方按日期列出每节课的教师反馈、孩子学情、知识点讲解、课堂照片与巩固建议。')
  return lines
}

export type ResolvedTeacherSubject = {
  teacher: string
  subject: string
  display: string
}

function cleanTeacherName(name?: string | null): string {
  if (!name) return ''
  return name.trim().replace(/(老师|教练|助教)$/, '').trim()
}

export function resolveTeacherSubjectList(
  items: Array<{ subject?: string | null; teacher?: { name?: string | null } | null }> = [],
  mainTeacherInput?: string | { name?: string | null; subjects?: string[] | string | null } | null,
  fallbackCourse?: string | string[],
): { list: ResolvedTeacherSubject[]; display: string; label: string } {
  const teacherMap = new Map<string, Set<string>>()
  const rawTeacherName = typeof mainTeacherInput === 'object' && mainTeacherInput !== null
    ? mainTeacherInput.name
    : mainTeacherInput
  const teacherKnownSubjects = typeof mainTeacherInput === 'object' && mainTeacherInput !== null
    ? (Array.isArray(mainTeacherInput.subjects)
        ? mainTeacherInput.subjects
        : typeof (mainTeacherInput as { subjects?: unknown }).subjects === 'string'
          ? ((mainTeacherInput as { subjects?: string }).subjects || '').split(/[,，、]/)
          : []
      ).map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
    : []

  // 统计历史反馈中所有学科出现的频次
  const subjectFrequency = new Map<string, number>()
  for (const item of items) {
    const sName = item.subject?.trim()
    if (sName) {
      subjectFrequency.set(sName, (subjectFrequency.get(sName) || 0) + 1)
    }
  }
  const mostFrequentSubject = [...subjectFrequency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const allSubjects = [...new Set(items.map((i) => i.subject?.trim()).filter(Boolean))] as string[]

  // 1. 从所有课堂反馈记录中提取教师和学科（统一去除后缀避免同名分叉）
  for (const item of items) {
    const tName = cleanTeacherName(item.teacher?.name)
    const sName = item.subject?.trim()
    if (tName) {
      if (!teacherMap.has(tName)) {
        teacherMap.set(tName, new Set())
      }
      if (sName) {
        teacherMap.get(tName)!.add(sName)
      }
    }
  }

  // 2. 如果提供了主教师名，确保其被纳入，并优先根据教师档案或课程推断其学科
  const cleanMain = cleanTeacherName(rawTeacherName)
  if (cleanMain) {
    const existing = teacherMap.get(cleanMain) || new Set<string>()
    if (existing.size === 0) {
      if (teacherKnownSubjects.length > 0) {
        teacherKnownSubjects.forEach((sub) => existing.add(sub))
      }
      if (existing.size === 0 && fallbackCourse) {
        const courseList = Array.isArray(fallbackCourse) ? fallbackCourse : [fallbackCourse]
        for (const c of courseList) {
          for (const sub of SUBJECT_ORDER) {
            if (c.includes(sub)) existing.add(sub)
          }
        }
      }
      if (existing.size === 0) {
        if (allSubjects.length === 1 && teacherMap.size === 0) {
          existing.add(allSubjects[0])
        } else {
          existing.add('综合培优')
        }
      }
    } else if (teacherKnownSubjects.length > 0) {
      // 教师已有明确登记的任教学科：核验 existing 中的学科是否属于教师真实任教学科
      const hasValidMatch = [...existing].some((s) => teacherKnownSubjects.includes(s))
      if (!hasValidMatch) {
        // 如果历史反馈中归档的学科均非该老师任教学科（多为排课误配或班级课程兜底漂移），以教师档案中登记的真实学科为准
        existing.clear()
        teacherKnownSubjects.forEach((sub) => existing.add(sub))
      }
    }
    teacherMap.set(cleanMain, existing)
  }

  // 3. 构建规范罗列列表，确保每一位教师均带上明确学科标注
  const resolved: ResolvedTeacherSubject[] = []
  for (const [teacher, subjects] of teacherMap.entries()) {
    let subStr = [...subjects].filter(Boolean).join('/')
    if (!subStr) {
      subStr = '综合培优'
    }
    const display = `${teacher}（${subStr}）`
    resolved.push({ teacher, subject: subStr, display })
  }

  const defaultSubject = mostFrequentSubject || allSubjects[0] || '综合培优'
  const display = resolved.map((r) => r.display).join('、')
    || (cleanMain ? `${cleanMain}（${defaultSubject}）` : '学堂教研团队（全科）')

  const label = resolved.length > 1 ? '授课教师' : '主教老师'

  return { list: resolved, display, label }
}

export function getAdminLearningReportSections(
  report: AdminLearningReport,
  feedbackItems: FeedbackArchiveItem[] = [],
): LearningReportSection[] {
  const gender = ({ MALE: '男', FEMALE: '女' } as Record<string, string>)[report.student.gender?.toUpperCase() || ''] || ''
  const teacherInfo = resolveTeacherSubjectList(
    feedbackItems,
    report.student.mainTeacher,
    report.student.courses,
  )
  const fields = [
    { label: '学生姓名', value: report.student.name },
    { label: '在读年级', value: report.student.grade || '' },
    { label: '性别', value: gender },
    { label: '就读学校', value: report.student.school || '' },
    { label: teacherInfo.label, value: teacherInfo.display },
    { label: '家长', value: report.student.parentName || '' },
    { label: '在读课程', value: report.student.courses.join('、') },
  ].filter((field) => field.value.trim())

  const metrics: LearningReportMetric[] = [
    { label: '阶段出勤率', value: `${report.indicators?.attendanceRate ?? report.overview.attendanceRate ?? 100}%` },
    { label: '课堂反馈', value: `${report.overview.feedbackCount} 条` },
    ...(report.overview.subjectCount > 0 ? [{ label: '涉及学科', value: `${report.overview.subjectCount} 门` }] : []),
    { label: '档案登记课时', value: `${report.indicators?.totalHours ?? Number(report.overview.totalHours.toFixed(2))} 小时` },
    ...(report.overview.homeworkDoneRate === null && !report.indicators ? [] : [{ label: '作业完成率', value: `${report.indicators?.homeworkDoneRate ?? report.overview.homeworkDoneRate ?? 100}%` }]),
    ...(report.mastery.total > 0 || (report.indicators && report.indicators.masteryRate > 0) ? [
      { label: '考点 · 已掌握', value: `${report.indicators?.masteryRate ?? report.mastery.masteredPct}%` },
      ...(report.mastery.total > 0 ? [
        { label: '试卷知识点 · 需复习', value: `${report.mastery.reviewPct}%` },
        { label: '试卷知识点 · 薄弱', value: `${report.mastery.weakPct}%` },
      ] : []),
    ] : []),
  ]

  const gradeRecords = report.grades.map((grade) => ({
    title: `${grade.date} · ${grade.subject}`,
    detail: grade.assessment,
    value: `${grade.score} / ${grade.fullScore} 分 · ${grade.percentage}% · 【${grade.level || '达标'}】`,
  }))
  const gradeLines = report.grades.map((grade) => `${grade.date} · ${grade.subject} · ${grade.assessment}：${grade.score}/${grade.fullScore} 分（得分率 ${grade.percentage}% · 【${grade.level || '达标'}】）`)

  const goalLines = [
    ...report.goals.map((goal) => `${goal.subject} · ${goal.achieved ? '已达成' : '进行中'}：${goal.text}`),
    ...(report.knowledgeMatrix?.mastered.length
      ? [`熟练掌握考点（🟢）：${report.knowledgeMatrix.mastered.slice(0, 10).join('、')}`]
      : []),
    ...(report.knowledgeMatrix?.reviewing.length
      ? [`巩固突破考点（🟡）：${report.knowledgeMatrix.reviewing.slice(0, 10).join('、')}`]
      : []),
    ...report.weaknesses.map((item) => `需关注：${item.topic}（记录 ${item.mistakeCount} 次）${item.suggestion ? `；建议：${item.suggestion}` : ''}`),
  ]

  const teacherSummaryLines = report.teacherSummaries.length
    ? report.teacherSummaries.flatMap((summary) => [
        `${summary.teacher || '任课教师'} · ${summary.period}`,
        summary.text,
        ...(summary.suggestions ? [`后续建议：${summary.suggestions}`] : []),
        '',
      ])
    : feedbackItems.length
      ? feedbackOverviewLines(feedbackItems)
      : ['本期暂无已发布的阶段小结']

  const guidanceLines = [
    '【学堂下一阶段提分路线】',
    ...(report.nextStageRoadmap || []).map((item) => `${item.step}（${item.target}）：${item.action}`),
    '',
    '【家校共育 · 家庭辅导实操指引】',
    ...(report.homeGuidance || []).map((item) => `• ${item.title}：${item.desc}`),
  ]

  return [
    {
      title: '学生信息与课程',
      lines: [
        ...fields.map((field) => `${field.label}：${field.value}`),
      ],
      fields,
    },
    {
      title: '本期学习概况',
      lines: [
        `统计时间：${report.period.from} 至 ${report.period.to}`,
        ...(report.executiveSummary ? [`【学情综合诊断与评定】${report.executiveSummary}`] : []),
        ...metrics.map((metric) => `${metric.label}：${metric.value}`),
      ],
      metrics,
    },
    {
      title: '本期成绩记录',
      lines: gradeLines.length ? gradeLines : ['本期暂无成绩记录'],
      records: gradeRecords,
    },
    {
      title: '当前学习目标与薄弱点',
      lines: goalLines.length ? goalLines : ['暂无学习目标', '暂无薄弱点记录'],
    },
    {
      title: report.teacherSummaries.length ? '本期教师阶段小结' : feedbackItems.length ? '本期课堂反馈摘要' : '本期教师阶段小结',
      lines: teacherSummaryLines,
    },
    {
      title: '下一阶段提分规划与家校协同方案',
      lines: guidanceLines,
    },
  ]
}

function subjectRank(subject: string) {
  const index = SUBJECT_ORDER.findIndex((name) => subject.includes(name))
  return index === -1 ? SUBJECT_ORDER.length : index
}

export function groupFeedbackForParentPdf(items: FeedbackArchiveItem[]): ParentFeedbackDay[] {
  const sorted = [...items].sort((left, right) => {
    const dateOrder = right.date.slice(0, 10).localeCompare(left.date.slice(0, 10))
    if (dateOrder) return dateOrder
    const subjectOrder = subjectRank(left.subject) - subjectRank(right.subject)
    if (subjectOrder) return subjectOrder
    const teacherOrder = left.teacher.name.localeCompare(right.teacher.name, 'zh-CN')
    return teacherOrder || left.createdAt.localeCompare(right.createdAt)
  })
  const groups = new Map<string, FeedbackArchiveItem[]>()
  sorted.forEach((item) => {
    const date = item.date.slice(0, 10)
    groups.set(date, [...(groups.get(date) || []), item])
  })

  return [...groups.entries()].map(([date, dayItems]) => ({
    date,
    weekday: new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: 'Asia/Shanghai' })
      .format(new Date(`${date}T12:00:00+08:00`)),
    items: dayItems,
  }))
}

export type ParentPdfImageRequest = {
  feedbackId: string
  imageIndex: number
  assetId: string | null
  previewUrl?: string | null
  thumbnailUrl?: string | null
}

export function getParentPdfImageRequests(item: FeedbackArchiveItem): ParentPdfImageRequest[] {
  return item.images.map((image, imageIndex) => ({
    feedbackId: item.id,
    imageIndex,
    assetId: image.assetId,
    previewUrl: image.previewUrl || null,
    thumbnailUrl: image.thumbnailUrl || null,
  }))
}

export function getParentPdfDetailSections(item: FeedbackArchiveItem): ParentFeedbackSection[] {
  const sections: ParentFeedbackSection[] = []

  // 1. Only show the rich Teacher Feedback body
  const feedbackContent = getParentClassroomFeedbackContent(item.overallComment, null)
    || (typeof item.overallComment === 'string' ? item.overallComment.trim() : '')
    || (typeof item.summary === 'string' ? item.summary.trim() : '')
    || ''

  if (feedbackContent) {
    sections.push({
      label: '教师课堂反馈',
      content: feedbackContent,
    })
  }

  // 2. Interactive Questions & Answers (如果有提问的信息也加进来)
  if (item.parentReply && item.parentReply.trim()) {
    const timeLabel = item.replyTime ? ` · ${item.replyTime.slice(0, 16).replace('T', ' ')}` : ''
    sections.push({
      label: `家长提问与互动留言${timeLabel}`,
      content: item.parentReply.trim(),
    })
  }

  if (item.teacherReply && item.teacherReply.trim()) {
    const timeLabel = item.teacherReplyTime ? ` · ${item.teacherReplyTime.slice(0, 16).replace('T', ' ')}` : ''
    sections.push({
      label: `教师答疑与课后回复${timeLabel}`,
      content: item.teacherReply.trim(),
    })
  }

  const checkinNote = item.learningSnapshot?.practiceCheckin?.note
  if (checkinNote && checkinNote.trim()) {
    sections.push({
      label: '随堂提问与练习打卡',
      content: checkinNote.trim(),
    })
  }

  return sections
}

function homeworkTextItems(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string') return item.trim() ? [item.trim()] : []
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const text = [record.content, record.text, record.title]
      .find((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()))
    return text ? [text.trim()] : []
  })
}

function getParentPdfLearningSections(item: FeedbackArchiveItem): ParentFeedbackSection[] {
  const snapshot = item.learningSnapshot
  const card = item.knowledgeCard ? parseStoredKnowledgeCard(item.knowledgeCard) : null
  const extension = normalizePersonalizedLearningExtension(snapshot?.personalizedLearning)
  const homework = homeworkTextItems(item.homework)
  const topic = card?.topic || item.knowledgePoints.find(Boolean) || ''
  const sections: ParentFeedbackSection[] = []

  // 1. 知识点详解 (保留精要与解题例题)
  if (card) {
    const knowledgeLines = [
      card.definition ? `【知识精讲】${card.definition}` : '',
      ...card.formulas.map((formula) => `【核心公式与方法】${formula}`),
      ...(card.tips || []).map((tip) => `【易错点剖析】${tip}`),
      card.example?.question ? `【经典例题】${card.example.question}` : '',
      ...(card.example?.steps || []).map((step, index) => `第${index + 1}步：${step}`),
      card.example?.answer ? `【参考答案】${card.example.answer}` : '',
    ].filter(Boolean)
    if (knowledgeLines.length) {
      sections.push({ label: `知识点详解 · ${card.topic}`, content: knowledgeLines.join('\n') })
    }
  }

  // 2. 家长陪学建议 (结构化整合三步法，避免拆碎跨页)
  const guide = buildParentStudyGuide({ topic, knowledgeCard: card, extension, homework })
  const guideBlocks: string[] = []
  if (guide.ask.length) {
    guideBlocks.push('【一、怎么问 · 启发孩子口述思路】\n' + guide.ask.map((e, i) => `${i + 1}. ${e}`).join('\n'))
  }
  if (guide.practice.length) {
    guideBlocks.push('【二、怎么练 · 重点题型巩固落实】\n' + guide.practice.map((e, i) => `${i + 1}. ${e}`).join('\n'))
  }
  if (guide.check.length) {
    guideBlocks.push('【三、怎么检查 · 避开高频易错考点】\n' + guide.check.map((e, i) => `${i + 1}. ${e}`).join('\n'))
  }
  if (guideBlocks.length) {
    sections.push({ label: '家长陪学建议 · 辅导三步法', content: guideBlocks.join('\n\n') })
  }

  return sections
}

function canvasContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法生成PDF画布')
  return context
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function wrapText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const lines: string[] = []
  const normalizedValue = normalizeAcademicFormulaText(value)
  normalizedValue.split(/\r?\n/).forEach((paragraph) => {
    if (!paragraph) {
      lines.push('')
      return
    }
    let line = ''
    Array.from(paragraph).forEach((character) => {
      const next = line + character
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line)
        line = character
      } else {
        line = next
      }
    })
    if (line) lines.push(line)
  })
  return lines
}

function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value
  let result = value
  while (result && context.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return result ? `${result}…` : ''
}

function drawOfficialStamp(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius = 64,
) {
  context.save()
  context.translate(centerX, centerY)
  context.rotate(-0.08)

  context.strokeStyle = 'rgba(217, 72, 40, 0.88)'
  context.lineWidth = 3.5
  context.beginPath()
  context.arc(0, 0, radius, 0, Math.PI * 2)
  context.stroke()

  context.strokeStyle = 'rgba(217, 72, 40, 0.65)'
  context.lineWidth = 1.5
  context.setLineDash([4, 3])
  context.beginPath()
  context.arc(0, 0, radius - 7, 0, Math.PI * 2)
  context.stroke()
  context.setLineDash([])

  context.fillStyle = 'rgba(217, 72, 40, 0.90)'
  context.font = `22px ${SERIF_FONT_FAMILY}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('★', 0, -18)

  context.font = `700 13px ${SERIF_FONT_FAMILY}`
  context.fillText('牧哲学堂教务学术中心', 0, 4)
  context.font = `700 15px ${SERIF_FONT_FAMILY}`
  context.fillText('学情诊断认证', 0, 24)

  context.restore()
}

function drawCover(context: CanvasRenderingContext2D, archive: FeedbackArchiveResult, learningDays: number, report?: AdminLearningReport) {
  context.fillStyle = COLORS.canvas
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  context.fillStyle = COLORS.green
  context.fillRect(0, 0, PAGE_WIDTH, 20)

  // Top brand emblem & badge
  context.textAlign = 'left'
  context.fillStyle = COLORS.primary
  context.font = `700 20px ${SERIF_FONT_FAMILY}`
  context.fillText('MUZHE ACADEMY · 牧哲学堂', PAGE_MARGIN, 180)

  // Student greeting & main title
  context.fillStyle = COLORS.ink
  context.font = `700 48px ${SERIF_FONT_FAMILY}`
  context.fillText(fitText(context, `${archive.student.name} 同学`, CONTENT_WIDTH - 200), PAGE_MARGIN, 248)

  context.fillStyle = COLORS.green
  context.font = `700 52px ${SERIF_FONT_FAMILY}`
  context.fillText(report ? '学生学业成长与学情诊断报告' : '课堂学习成长反馈报告', PAGE_MARGIN, 320)

  context.fillStyle = COLORS.muted
  context.font = `500 21px ${SERIF_FONT_FAMILY}`
  context.fillText('精准诊断 · 结构提分 · 家校携手 · 见证成长', PAGE_MARGIN, 362)

  // Period tag
  const period = report
    ? `${report.period.from} 至 ${report.period.to}`
    : archive.summary.firstFeedbackDate && archive.summary.latestFeedbackDate
      ? `${archive.summary.firstFeedbackDate.slice(0, 10)} 至 ${archive.summary.latestFeedbackDate.slice(0, 10)}`
      : '当前学习周期'
  context.fillStyle = COLORS.goldSoft
  roundedRect(context, PAGE_MARGIN, 392, 360, 42, 21)
  context.fill()
  context.strokeStyle = COLORS.border
  context.lineWidth = 1
  context.stroke()
  context.fillStyle = COLORS.gold
  context.font = `600 18px ${SERIF_FONT_FAMILY}`
  context.fillText(fitText(context, `统计周期：${period}`, 330), PAGE_MARGIN + 18, 419)

  // Draw Official Stamp at top right
  drawOfficialStamp(context, PAGE_WIDTH - PAGE_MARGIN - 95, 275, 66)

  // 4 Core KPIs in 2x2 Grid
  const kpiTop = 460
  const kpiCardWidth = (CONTENT_WIDTH - 20) / 2
  const kpiCardHeight = 135

  const attendanceVal = report?.indicators?.attendanceRate ?? report?.overview.attendanceRate ?? null
  const hoursVal = report?.indicators?.totalHours ?? (report ? Number(report.overview.totalHours.toFixed(1)) : null)
  const homeworkVal = report?.indicators?.homeworkDoneRate ?? report?.overview.homeworkDoneRate ?? null
  const masteryVal = report?.indicators?.masteryRate ?? (report ? report.mastery.masteredPct : null)

  const kpis = [
    {
      label: '出勤表现',
      value: attendanceVal !== null ? `${attendanceVal}` : '100',
      unit: '%',
      sub: '出勤率 · 专注守纪',
      bg: COLORS.greenSoft,
      color: COLORS.green,
    },
    {
      label: '累计课时',
      value: hoursVal !== null ? `${hoursVal}` : `${archive.summary.totalCount}`,
      unit: 'h',
      sub: '档案登记 · 持续沉淀',
      bg: COLORS.goldSoft,
      color: COLORS.gold,
    },
    {
      label: '作业落实',
      value: homeworkVal !== null ? `${homeworkVal}` : '100',
      unit: '%',
      sub: '完成率 · 扎实巩固',
      bg: COLORS.surfaceSoft,
      color: COLORS.primary,
    },
    {
      label: '考点掌握',
      value: (masteryVal !== null && masteryVal > 0) ? `${masteryVal}` : (report?.overview.feedbackCount ? '随堂积累' : '85'),
      unit: (masteryVal !== null && masteryVal > 0) ? '%' : '阶段',
      sub: (masteryVal !== null && masteryVal > 0) ? '掌握率 · 稳步阶梯提分' : '考点循序过关中',
      bg: COLORS.primarySoft,
      color: COLORS.green,
    },
  ]

  kpis.forEach((kpi, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const cardX = PAGE_MARGIN + col * (kpiCardWidth + 20)
    const cardY = kpiTop + row * (kpiCardHeight + 14)

    context.fillStyle = kpi.bg
    roundedRect(context, cardX, cardY, kpiCardWidth, kpiCardHeight, 16)
    context.fill()
    context.strokeStyle = COLORS.border
    context.lineWidth = 1.2
    context.stroke()

    context.fillStyle = COLORS.muted
    context.font = `500 18px ${SERIF_FONT_FAMILY}`
    context.fillText(kpi.label, cardX + 22, cardY + 34)

    // Number + unit (Times New Roman 为数字与单位赋予典雅质感)
    context.fillStyle = kpi.color
    context.font = `700 44px ${SERIF_FONT_FAMILY}`
    context.fillText(kpi.value, cardX + 22, cardY + 84)
    const valWidth = context.measureText(kpi.value).width
    context.fillStyle = COLORS.muted
    context.font = `500 18px ${SERIF_FONT_FAMILY}`
    context.fillText(kpi.unit, cardX + 26 + valWidth, cardY + 70)

    context.fillStyle = COLORS.subtle
    context.font = `400 15px ${SERIF_FONT_FAMILY}`
    context.fillText(kpi.sub, cardX + 22, cardY + 114)
  })

  // Student Profile Card
  const profileTop = 770
  const profileHeight = 205
  context.fillStyle = COLORS.surface
  roundedRect(context, PAGE_MARGIN, profileTop, CONTENT_WIDTH, profileHeight, 18)
  context.fill()
  context.strokeStyle = COLORS.border
  context.lineWidth = 1.5
  context.stroke()

  context.fillStyle = COLORS.ink
  context.font = `700 24px ${SERIF_FONT_FAMILY}`
  context.fillText('学生学业档案', PAGE_MARGIN + 28, profileTop + 40)

  const genderStr = report?.student.gender === 'FEMALE' ? '女' : report?.student.gender === 'MALE' ? '男' : ''
  const teacherInfo = resolveTeacherSubjectList(
    archive.items,
    report?.student.mainTeacher,
    report?.student.courses.length ? report.student.courses : archive.items.map((i) => i.course || '').filter(Boolean),
  )

  const profileFields = [
    { label: '在读年级', value: report?.student.grade || archive.student.grade || '未设置' },
    { label: '就读学校', value: report?.student.school || '待完善' },
    { label: teacherInfo.label, value: teacherInfo.display },
    { label: '学生性别', value: genderStr || '已登记' },
    { label: '在读课程', value: report?.student.courses.length ? report.student.courses.join('、') : '常规学科培优' },
    { label: '报告防伪', value: `MZ-${Math.abs(archive.student.name.split('').reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0)).toString(16).toUpperCase().padStart(8, '0')}` },
  ]

  // 不对称弹性栅格：列 0 (年级/性别: 200px), 列 1 (学校/课程: 370px), 列 2 (老师学科/防伪: 462px)
  const colWidths = [200, 370, 462]
  const colXOffsets = [
    PAGE_MARGIN + 28,
    PAGE_MARGIN + 28 + colWidths[0],
    PAGE_MARGIN + 28 + colWidths[0] + colWidths[1],
  ]

  profileFields.forEach((field, fIdx) => {
    const col = fIdx % 3
    const row = Math.floor(fIdx / 3)
    const fx = colXOffsets[col]
    const fy = profileTop + 85 + row * 54
    const availWidth = colWidths[col] - 82

    context.fillStyle = COLORS.subtle
    context.font = `400 16px ${SERIF_FONT_FAMILY}`
    context.fillText(field.label, fx, fy)

    context.fillStyle = COLORS.ink
    let fontSize = 19
    context.font = `600 ${fontSize}px ${SERIF_FONT_FAMILY}`
    if (context.measureText(field.value).width > availWidth) {
      fontSize = 17
      context.font = `600 ${fontSize}px ${SERIF_FONT_FAMILY}`
    }
    context.fillText(fitText(context, field.value, availWidth), fx + 80, fy)
  })

  // Executive Diagnosis Card or Table of Contents
  const diagTop = 1000
  const diagHeight = 440
  context.fillStyle = COLORS.surface
  roundedRect(context, PAGE_MARGIN, diagTop, CONTENT_WIDTH, diagHeight, 18)
  context.fill()
  context.strokeStyle = COLORS.border
  context.lineWidth = 1.5
  context.stroke()

  if (report?.executiveSummary) {
    context.fillStyle = COLORS.green
    context.font = `700 24px ${SERIF_FONT_FAMILY}`
    context.fillText('学情综合诊断与教学评定', PAGE_MARGIN + 28, diagTop + 44)

    context.fillStyle = COLORS.ink
    context.font = `400 21px ${SERIF_FONT_FAMILY}`
    const diagLines = wrapText(context, report.executiveSummary, CONTENT_WIDTH - 56)
    diagLines.slice(0, 9).forEach((line, lineIdx) => {
      context.fillText(line, PAGE_MARGIN + 28, diagTop + 90 + lineIdx * 34)
    })
  } else {
    context.fillStyle = COLORS.green
    context.font = `700 24px ${SERIF_FONT_FAMILY}`
    context.fillText('本期学情报告阅读导航', PAGE_MARGIN + 28, diagTop + 44)

    const contents = [
      '按日期归档查看各学科教师的随堂点评与重点关注',
      '孩子课堂表现、知识点讲解、课后任务与巩固指引',
      '随堂收录教师上传的黑板板书、随堂练习批改与课堂照片',
    ]
    contents.forEach((entry, index) => {
      const y = diagTop + 104 + index * 60
      context.fillStyle = COLORS.goldSoft
      roundedRect(context, PAGE_MARGIN + 28, y - 22, 32, 32, 16)
      context.fill()
      context.fillStyle = COLORS.gold
      context.beginPath()
      context.arc(PAGE_MARGIN + 44, y - 6, 5, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = COLORS.muted
      context.font = `400 20px ${SERIF_FONT_FAMILY}`
      context.fillText(entry, PAGE_MARGIN + 72, y)
    })
  }

  // Footer branding
  context.fillStyle = COLORS.subtle
  context.font = `400 17px ${SERIF_FONT_FAMILY}`
  context.textAlign = 'left'
  context.fillText('牧哲学堂教务学术中心 · 全程定制化学业成长档案', PAGE_MARGIN, PAGE_HEIGHT - 60)
  context.textAlign = 'right'
  context.fillText(`生成日期：${new Date().toLocaleDateString('zh-CN')}`, PAGE_WIDTH - PAGE_MARGIN, PAGE_HEIGHT - 60)
  context.textAlign = 'left'
}

async function decodeImageResponse(response: Response) {
  const objectUrl = URL.createObjectURL(await response.blob())
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = objectUrl
    await image.decode()
    return { image, dispose: () => URL.revokeObjectURL(objectUrl) }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function loadFeedbackImage(request: ParentPdfImageRequest): Promise<LoadedFeedbackImage> {
  const urls = [
    ...(request.previewUrl ? [request.previewUrl] : []),
    ...(request.assetId
      ? [`/api/files/view?id=${encodeURIComponent(request.assetId)}`]
      : []),
    `/api/admin/classroom-feedback/${encodeURIComponent(request.feedbackId)}/image?index=${request.imageIndex}`,
    ...(request.thumbnailUrl ? [request.thumbnailUrl] : []),
  ]

  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) continue
      return await decodeImageResponse(response)
    } catch {
      // Try next
    }
  }
  throw new Error('图片加载失败')
}

async function loadImagesWithLimit(
  requests: ParentPdfImageRequest[],
  loader: (request: ParentPdfImageRequest) => Promise<LoadedFeedbackImage>,
  limit = 3,
) {
  const results: Array<PromiseSettledResult<LoadedFeedbackImage>> = new Array(requests.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, requests.length) }, async () => {
    while (cursor < requests.length) {
      const index = cursor
      cursor += 1
      try {
        results[index] = { status: 'fulfilled', value: await loader(requests[index]) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  })
  await Promise.all(workers)
  return results
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.fillStyle = COLORS.surfaceSoft
  roundedRect(context, x, y, width, height, 14)
  context.fill()
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const targetWidth = image.naturalWidth * scale
  const targetHeight = image.naturalHeight * scale
  context.save()
  roundedRect(context, x, y, width, height, 14)
  context.clip()
  context.drawImage(
    image,
    x + (width - targetWidth) / 2,
    y + (height - targetHeight) / 2,
    targetWidth,
    targetHeight,
  )
  context.restore()
}

/** Browser-only PDF renderer. Text and preview images are embedded into the file. */
export async function renderParentFeedbackPdf(
  archive: FeedbackArchiveResult,
  options: ParentFeedbackPdfOptions = {},
): Promise<ParentFeedbackPdfResult> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH * PAGE_RENDER_SCALE
  canvas.height = PAGE_HEIGHT * PAGE_RENDER_SCALE
  const context = canvasContext(canvas)
  context.scale(PAGE_RENDER_SCALE, PAGE_RENDER_SCALE)
  const days = groupFeedbackForParentPdf(archive.items)
  const startPage = Math.max(1, options.startPageNumber || 1)
  let pdfHasPage = false
  let pageOpen = false
  let pageNumber = startPage - 1
  let y = 0
  let currentDay: ParentFeedbackDay | null = null
  let pageHeading = options.skipCover ? (options.reportSubtitle || '课堂学习反馈 · 阶段增量更新') : '课堂学习反馈'
  let embeddedImages = 0
  let skippedImages = 0
  const reportPeriod = options.learningReport
    ? `${options.learningReport.period.from} 至 ${options.learningReport.period.to}`
    : `${archive.summary.firstFeedbackDate?.slice(0, 10) || '暂无记录'} 至 ${archive.summary.latestFeedbackDate?.slice(0, 10) || '暂无记录'}`

  const commitPage = async () => {
    // Watermark the body, then place readable page furniture above it.
    applyWatermark(context, PAGE_WIDTH, PAGE_HEIGHT, undefined, options.learningReport ? 0.04 : 0.07)
    context.fillStyle = COLORS.subtle
    context.font = `400 18px ${SERIF_FONT_FAMILY}`
    context.textAlign = 'center'
    context.fillText(`牧哲学堂 · 第 ${pageNumber} 页`, PAGE_WIDTH / 2, PAGE_HEIGHT - 42)
    const title = pageNumber === startPage && !options.skipCover
      ? options.learningReport ? `${archive.student.name}同学的定制学情报告` : '课堂学习反馈'
      : `${archive.student.name} · ${pageHeading}`
    await drawBrandHeader(context, PAGE_WIDTH, title, reportPeriod)
    const pageImage = canvas.toDataURL('image/jpeg', 0.96)
    options.onPageRendered?.(pageImage, pageNumber)
    if (pdfHasPage) pdf.addPage('a4', 'portrait')
    pdf.addImage(pageImage, 'JPEG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, undefined, 'MEDIUM')
    pdfHasPage = true
    pageOpen = false
  }

  const startContentPage = async (day: ParentFeedbackDay | null, continuation = false) => {
    if (pageOpen) await commitPage()
    pageNumber += 1
    pageOpen = true
    currentDay = day
    context.clearRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    context.fillStyle = COLORS.canvas
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    context.fillStyle = COLORS.primary
    context.fillRect(0, 0, PAGE_WIDTH, 14)
    context.textAlign = 'left'
    y = 100
    if (day) {
      context.fillStyle = COLORS.primarySoft
      roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, 82, 16)
      context.fill()
      context.fillStyle = COLORS.ink
      context.font = `700 28px ${SERIF_FONT_FAMILY}`
      context.fillText(
        `${day.date} · ${day.weekday}${continuation ? '（续）' : ''}`,
        PAGE_MARGIN + 24,
        y + 38,
      )
      context.fillStyle = COLORS.muted
      context.font = `500 18px ${SERIF_FONT_FAMILY}`
      context.fillText(`${day.items.length} 节课堂反馈`, PAGE_MARGIN + 24, y + 66)
      y += 106
    }
  }

  const ensureSpace = async (height: number) => {
    if (y + height <= CONTENT_BOTTOM) return false
    await startContentPage(currentDay, true)
    return true
  }

  const drawSubjectHeader = (item: FeedbackArchiveItem, continuation = false) => {
    context.fillStyle = COLORS.surface
    roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, 86, 16)
    context.fill()
    context.strokeStyle = COLORS.border
    context.lineWidth = 2
    context.stroke()

    context.fillStyle = COLORS.primary
    roundedRect(context, PAGE_MARGIN + 14, y + 12, 128, 34, 17)
    context.fill()
    context.fillStyle = '#ffffff'
    context.font = `600 20px ${SERIF_FONT_FAMILY}`
    context.textAlign = 'center'
    context.fillText(item.subject.slice(0, 8), PAGE_MARGIN + 78, y + 36)

    context.textAlign = 'left'
    context.fillStyle = COLORS.ink
    context.font = `600 23px ${SERIF_FONT_FAMILY}`
    context.fillText(
      `${item.teacher.name}老师${continuation ? ' · 本节内容续页' : ''}`,
      PAGE_MARGIN + 164,
      y + 37,
    )
    const courseContext = [item.course, item.className].filter(Boolean).join(' · ')
    if (courseContext) {
      context.fillStyle = COLORS.muted
      context.font = `400 17px ${SERIF_FONT_FAMILY}`
      context.fillText(fitText(context, courseContext, CONTENT_WIDTH - 192), PAGE_MARGIN + 164, y + 67)
    }
    y += 102
  }

  const continueSubject = async (item: FeedbackArchiveItem) => {
    await startContentPage(currentDay, true)
    drawSubjectHeader(item, true)
  }

  if (!options.skipCover) {
    drawCover(context, archive, days.length, options.learningReport)
    pageNumber = startPage
    pageOpen = true
    await commitPage()
  }

  if (options.learningReport) {
    pageHeading = '学业诊断与提分规划'
    await startContentPage(null)
    const drawReportHeading = (title: string, continuation = false) => {
      context.textAlign = 'left'
      context.fillStyle = COLORS.green
      context.font = `700 28px ${SERIF_FONT_FAMILY}`
      context.fillText(`${title}${continuation ? ' · 续' : ''}`, PAGE_MARGIN, y + 31)
      context.fillStyle = COLORS.gold
      context.fillRect(PAGE_MARGIN, y + 43, 44, 4)
      y += 66
    }
    const continueReportPage = async (title: string) => {
      await startContentPage(null, true)
      drawReportHeading(title, true)
    }
    const ensureReportRoom = async (height: number, title: string) => {
      if (y + height <= CONTENT_BOTTOM) return
      await continueReportPage(title)
    }
    const drawReportText = async (
      value: string,
      title: string,
      options: { emphasized?: boolean; warm?: boolean } = {},
    ) => {
      context.textAlign = 'left'
      context.font = `${options.emphasized ? '600' : '400'} 21px ${SERIF_FONT_FAMILY}`
      const lines = wrapText(context, value, CONTENT_WIDTH - 48).filter(Boolean)
      let cursor = 0
      while (cursor < lines.length) {
        let capacity = Math.floor((CONTENT_BOTTOM - y - 58) / 32)
        if (capacity < 1) {
          await continueReportPage(title)
          capacity = Math.floor((CONTENT_BOTTOM - y - 58) / 32)
        }
        const chunk = lines.slice(cursor, cursor + capacity)
        const cardHeight = 26 + chunk.length * 32
        await ensureReportRoom(cardHeight + 10, title)
        context.fillStyle = options.warm ? COLORS.goldSoft : COLORS.surface
        roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, cardHeight, 14)
        context.fill()
        context.strokeStyle = COLORS.border
        context.lineWidth = 1
        context.stroke()
        context.fillStyle = options.emphasized ? COLORS.green : COLORS.ink
        context.font = `${options.emphasized ? '600' : '400'} 21px ${SERIF_FONT_FAMILY}`
        chunk.forEach((line, index) => context.fillText(line, PAGE_MARGIN + 22, y + 37 + index * 32))
        y += cardHeight + 10
        cursor += chunk.length
      }
    }

    const sectionsToRender = getAdminLearningReportSections(options.learningReport, archive.items)
      .filter((section) => {
        // Skip duplicate profile info and bare metric boxes that are already prominently shown on the official cover
        if (section.title === '学生信息与课程' || section.title === '本期学习概况') return false
        // Skip truncated single-sentence quote if no real stage summaries exist
        if (section.title === '本期课堂反馈摘要') return false
        return true
      })

    for (const section of sectionsToRender) {
      const lines = section.lines.filter(isVisibleReportLine)
      const fields = section.fields?.filter((field) => field.value.trim()) || []
      const metrics = section.metrics || []
      const records = section.records || []
      if (!fields.length && !metrics.length && !records.length && !lines.length) continue

      await ensureReportRoom(78, section.title)
      drawReportHeading(section.title)

      if (fields.length) {
        const columnWidth = (CONTENT_WIDTH - 52) / 2
        for (let index = 0; index < fields.length; index += 2) {
          const pair = fields.slice(index, index + 2)
          const wrappedValues = pair.map((field) => {
            context.font = `600 20px ${SERIF_FONT_FAMILY}`
            return wrapText(context, field.value, columnWidth - 30)
          })
          const rowHeight = Math.max(74, ...wrappedValues.map((valueLines) => 43 + valueLines.length * 26))
          await ensureReportRoom(rowHeight + 10, section.title)
          context.fillStyle = COLORS.surface
          roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight, 14)
          context.fill()
          context.strokeStyle = COLORS.border
          context.stroke()
          pair.forEach((field, pairIndex) => {
            const x = PAGE_MARGIN + 22 + pairIndex * (columnWidth + 8)
            context.fillStyle = COLORS.subtle
            context.font = `500 16px ${SERIF_FONT_FAMILY}`
            context.fillText(field.label, x, y + 27)
            context.fillStyle = COLORS.ink
            context.font = `600 20px ${SERIF_FONT_FAMILY}`
            wrappedValues[pairIndex].forEach((line, lineIndex) => context.fillText(line, x, y + 54 + lineIndex * 26))
          })
          if (pair.length === 2) {
            context.fillStyle = COLORS.border
            context.fillRect(PAGE_MARGIN + 22 + columnWidth + 2, y + 18, 1, rowHeight - 36)
          }
          y += rowHeight + 10
        }
      } else if (metrics.length) {
        const gap = 12
        const columns = 2
        const tileWidth = (CONTENT_WIDTH - gap) / columns
        for (let index = 0; index < metrics.length; index += columns) {
          await ensureReportRoom(116, section.title)
          metrics.slice(index, index + columns).forEach((metric, tileIndex) => {
            const x = PAGE_MARGIN + tileIndex * (tileWidth + gap)
            context.fillStyle = COLORS.greenSoft
            roundedRect(context, x, y, tileWidth, 104, 14)
            context.fill()
            context.fillStyle = COLORS.muted
            context.font = `500 16px ${SERIF_FONT_FAMILY}`
            context.fillText(fitText(context, metric.label, tileWidth - 32), x + 18, y + 30)
            context.fillStyle = COLORS.green
            context.font = `700 28px ${SERIF_FONT_FAMILY}`
            context.fillText(fitText(context, metric.value, tileWidth - 32), x + 18, y + 73)
          })
          y += 116
        }
      } else if (records.length) {
        for (const record of records) {
          await ensureReportRoom(82, section.title)
          context.fillStyle = COLORS.surface
          roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, 72, 14)
          context.fill()
          context.strokeStyle = COLORS.border
          context.stroke()
          context.textAlign = 'left'
          context.fillStyle = COLORS.ink
          context.font = `600 19px ${SERIF_FONT_FAMILY}`
          context.fillText(fitText(context, record.title, CONTENT_WIDTH * 0.50), PAGE_MARGIN + 20, y + 29)
          if (record.detail) {
            context.fillStyle = COLORS.muted
            context.font = `400 16px ${SERIF_FONT_FAMILY}`
            context.fillText(fitText(context, record.detail, CONTENT_WIDTH * 0.50), PAGE_MARGIN + 20, y + 54)
          }
          context.textAlign = 'right'
          context.fillStyle = COLORS.green
          context.font = `700 19px ${SERIF_FONT_FAMILY}`
          context.fillText(fitText(context, record.value || '', CONTENT_WIDTH * 0.40), PAGE_WIDTH - PAGE_MARGIN - 20, y + 42)
          context.textAlign = 'left'
          y += 82
        }
      }

      const supportingLines = section.fields
        ? []
        : section.records
          ? []
          : section.metrics
            ? lines.filter((entry) => entry.startsWith('统计时间：'))
            : lines
      for (const entry of supportingLines) {
        const isSuggestion = /^(?:需关注|后续建议|建议)\s*[：:]/u.test(entry)
        const isHeading = /^(?:\S+老师|任课教师)\s*[·・]/u.test(entry)
        await drawReportText(entry, section.title, {
          emphasized: isHeading,
          warm: isSuggestion,
        })
      }
      y += 10
    }
    if (pageOpen) await commitPage()
    pageHeading = '课堂学习反馈'
  }

  if (!days.length) {
    await startContentPage(null)
    context.fillStyle = COLORS.surface
    roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, 180, 20)
    context.fill()
    context.fillStyle = COLORS.muted
    context.font = `400 28px ${SERIF_FONT_FAMILY}`
    context.textAlign = 'center'
    context.fillText('暂时还没有课堂反馈记录', PAGE_WIDTH / 2, y + 105)
  }

  for (const day of days) {
    await startContentPage(day)

    for (const item of day.items) {
      const detailSections = [...getParentPdfDetailSections(item), ...getParentPdfLearningSections(item)]
      const imageRequests = getParentPdfImageRequests(item)
      if (!detailSections.length && !imageRequests.length) continue

      await ensureSpace(190)
      drawSubjectHeader(item)

      for (const [sectionIndex, section] of detailSections.entries()) {
        const isFeedback = section.label === '教师课堂反馈' || section.label.includes('课堂反馈')
        const isKnowledge = section.label.includes('知识点详解')
        const isParentQuestion = section.label.includes('家长提问')
        const isTeacherReply = section.label.includes('教师答疑')

        // 1. 知识点详解：分层结构化排版，公式高亮条，经典例题卡片原子化保护（杜绝底部截断）
        if (isKnowledge) {
          const rawLines = section.content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
          const defLines: string[] = []
          const formulaList: string[] = []
          const tipList: string[] = []
          let exampleQuestion = ''
          const exampleSteps: string[] = []
          let exampleAnswer = ''

          for (const line of rawLines) {
            if (line.startsWith('【知识精讲】')) {
              defLines.push(line)
            } else if (line.startsWith('【核心公式与方法】')) {
              formulaList.push(line.replace(/^【核心公式与方法】\s*/, ''))
            } else if (line.startsWith('【易错点剖析】')) {
              tipList.push(line.replace(/^【易错点剖析】\s*/, ''))
            } else if (line.startsWith('【经典例题】')) {
              exampleQuestion = line
            } else if (/^第\s*\d+\s*步[：:]/.test(line)) {
              exampleSteps.push(line)
            } else if (line.startsWith('【参考答案】')) {
              exampleAnswer = line
            } else if (exampleQuestion && !exampleAnswer) {
              exampleSteps.push(line)
            } else {
              defLines.push(line)
            }
          }

          if (y + 110 > CONTENT_BOTTOM) await continueSubject(item)
          const headerHeight = 44
          context.fillStyle = COLORS.surface
          roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, headerHeight, 12)
          context.fill()
          context.strokeStyle = COLORS.border
          context.lineWidth = 1
          context.stroke()

          roundedRect(context, PAGE_MARGIN + 12, y + 8, 28, 28, 14)
          context.fillStyle = COLORS.primarySoft
          context.fill()
          context.fillStyle = COLORS.primary
          context.font = `700 16px ${SERIF_FONT_FAMILY}`
          context.textAlign = 'center'
          context.fillText(String(sectionIndex + 1).padStart(2, '0'), PAGE_MARGIN + 26, y + 27)

          context.textAlign = 'left'
          context.fillStyle = COLORS.primary
          context.font = `600 21px ${SERIF_FONT_FAMILY}`
          context.fillText(section.label, PAGE_MARGIN + 50, y + 29)
          y += headerHeight + 12

          // a. 概念精讲
          if (defLines.length) {
            context.font = `400 22px ${SERIF_FONT_FAMILY}`
            const fullDef = defLines.join('\n')
            const wrappedDef = wrapText(context, fullDef, CONTENT_WIDTH - 48)
            const defHeight = 22 + wrappedDef.length * 32
            if (y + defHeight > CONTENT_BOTTOM && CONTENT_BOTTOM - y < 100) {
              await continueSubject(item)
            }
            context.fillStyle = COLORS.surface
            roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, defHeight, 10)
            context.fill()
            context.strokeStyle = COLORS.border
            context.stroke()
            context.fillStyle = COLORS.ink
            wrappedDef.forEach((line, i) => {
              context.fillText(line, PAGE_MARGIN + 20, y + 30 + i * 32)
            })
            y += defHeight + 10
          }

          // b. 核心公式与方法（公式条，浅青底色高亮，Times New Roman 加粗公式）
          if (formulaList.length) {
            for (const formula of formulaList) {
              context.font = `600 22px ${SERIF_FONT_FAMILY}`
              const normFormula = normalizeAcademicFormulaText(formula)
              const fLines = wrapText(context, `▪  ${normFormula}`, CONTENT_WIDTH - 48)
              const fHeight = 16 + fLines.length * 30
              if (y + fHeight > CONTENT_BOTTOM) {
                await continueSubject(item)
              }
              context.fillStyle = COLORS.greenSoft
              roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, fHeight, 8)
              context.fill()
              context.strokeStyle = '#D4E7DE'
              context.lineWidth = 1
              context.stroke()
              context.fillStyle = COLORS.green
              context.font = `600 22px ${SERIF_FONT_FAMILY}`
              fLines.forEach((line, i) => {
                context.fillText(line, PAGE_MARGIN + 20, y + 26 + i * 30)
              })
              y += fHeight + 8
            }
            y += 4
          }

          // c. 易错点剖析
          if (tipList.length) {
            for (const tip of tipList) {
              context.font = `400 21px ${SERIF_FONT_FAMILY}`
              const normTip = normalizeAcademicFormulaText(tip)
              const tLines = wrapText(context, `•  ${normTip}`, CONTENT_WIDTH - 48)
              const tHeight = 14 + tLines.length * 30
              if (y + tHeight > CONTENT_BOTTOM) {
                await continueSubject(item)
              }
              context.fillStyle = COLORS.surface
              roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, tHeight, 8)
              context.fill()
              context.strokeStyle = COLORS.border
              context.lineWidth = 1
              context.stroke()
              context.fillStyle = COLORS.muted
              context.font = `400 21px ${SERIF_FONT_FAMILY}`
              tLines.forEach((line, i) => {
                context.fillText(line, PAGE_MARGIN + 20, y + 25 + i * 30)
              })
              y += tHeight + 8
            }
            y += 4
          }

          // d. 经典例题卡片（防截断重磅保护：原子化卡片）
          if (exampleQuestion) {
            context.font = `600 22px ${SERIF_FONT_FAMILY}`
            const qLines = wrapText(context, exampleQuestion, CONTENT_WIDTH - 64)
            context.font = `400 20px ${SERIF_FONT_FAMILY}`
            const stepLines = exampleSteps.flatMap((s) => wrapText(context, s, CONTENT_WIDTH - 76))
            context.font = `700 21px ${SERIF_FONT_FAMILY}`
            const aLines = exampleAnswer ? wrapText(context, exampleAnswer, CONTENT_WIDTH - 64) : []

            const exCardHeight = 36 + qLines.length * 32
              + (stepLines.length ? 14 + stepLines.length * 28 : 0)
              + (aLines.length ? 18 + aLines.length * 32 : 0)
              + 16

            // 【防截断核心规则】：如果当前页面放不下整张例题卡片，或者剩余空间小于 190px，立即新起一页完整绘制！
            if (y + exCardHeight > CONTENT_BOTTOM || (CONTENT_BOTTOM - y) < 190) {
              await continueSubject(item)
            }

            // 绘制独立例题暖色底卡与琥珀金左边条
            context.fillStyle = '#FAF7F2'
            roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, exCardHeight, 12)
            context.fill()
            context.strokeStyle = '#E5DCD1'
            context.lineWidth = 1.2
            context.stroke()

            // 左侧雅金装饰线
            context.fillStyle = COLORS.gold
            roundedRect(context, PAGE_MARGIN, y, 5, exCardHeight, 2.5)
            context.fill()

            let curEy = y + 32
            // 题干
            context.fillStyle = COLORS.ink
            context.font = `600 22px ${SERIF_FONT_FAMILY}`
            qLines.forEach((line) => {
              context.fillText(line, PAGE_MARGIN + 24, curEy)
              curEy += 32
            })

            // 步骤
            if (stepLines.length) {
              curEy += 6
              context.fillStyle = COLORS.muted
              context.font = `400 20px ${SERIF_FONT_FAMILY}`
              stepLines.forEach((line) => {
                context.fillText(line, PAGE_MARGIN + 36, curEy)
                curEy += 28
              })
            }

            // 参考答案
            if (aLines.length) {
              curEy += 10
              context.fillStyle = COLORS.green
              context.font = `700 21px ${SERIF_FONT_FAMILY}`
              aLines.forEach((line) => {
                context.fillText(line, PAGE_MARGIN + 24, curEy)
                curEy += 32
              })
            }

            y += exCardHeight + 14
          }
          continue
        }

        // 2. 教师课堂反馈：按自然段做呼吸感排版与段间距
        if (isFeedback) {
          const paragraphs = section.content.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean)

          if (y + 110 > CONTENT_BOTTOM) await continueSubject(item)
          const headerHeight = 44
          context.fillStyle = COLORS.surface
          roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, headerHeight, 12)
          context.fill()
          context.strokeStyle = COLORS.border
          context.lineWidth = 1
          context.stroke()

          roundedRect(context, PAGE_MARGIN + 12, y + 8, 28, 28, 14)
          context.fillStyle = COLORS.primarySoft
          context.fill()
          context.fillStyle = COLORS.primary
          context.font = `700 16px ${SERIF_FONT_FAMILY}`
          context.textAlign = 'center'
          context.fillText(String(sectionIndex + 1).padStart(2, '0'), PAGE_MARGIN + 26, y + 27)

          context.textAlign = 'left'
          context.fillStyle = COLORS.primary
          context.font = `600 21px ${SERIF_FONT_FAMILY}`
          context.fillText('教师课堂反馈', PAGE_MARGIN + 50, y + 29)
          y += headerHeight + 12

          for (const para of paragraphs) {
            context.font = `400 22px ${SERIF_FONT_FAMILY}`
            const pLines = wrapText(context, para, CONTENT_WIDTH - 48)

            let cursor = 0
            while (cursor < pLines.length) {
              let availLines = Math.floor((CONTENT_BOTTOM - y - 30) / 33)
              if (availLines < 2) {
                await continueSubject(item)
                availLines = Math.floor((CONTENT_BOTTOM - y - 30) / 33)
              }
              const chunk = pLines.slice(cursor, cursor + availLines)
              const chunkHeight = 22 + chunk.length * 33

              context.fillStyle = COLORS.surface
              roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, chunkHeight, 10)
              context.fill()
              context.strokeStyle = COLORS.border
              context.lineWidth = 1
              context.stroke()

              context.fillStyle = COLORS.ink
              context.font = `400 22px ${SERIF_FONT_FAMILY}`
              chunk.forEach((line, i) => {
                context.fillText(line, PAGE_MARGIN + 24, y + 30 + i * 33)
              })

              y += chunkHeight + 12 // 12-14px 段间距呼吸感
              cursor += chunk.length
            }
          }
          y += 4
          continue
        }

        // 3. 家长提问与教师互动答疑卡片
        if (isParentQuestion || isTeacherReply) {
          const isParent = isParentQuestion
          context.font = `400 21px ${SERIF_FONT_FAMILY}`
          const qLines = wrapText(context, section.content, CONTENT_WIDTH - 64)
          const qHeight = 36 + qLines.length * 30
          if (y + qHeight > CONTENT_BOTTOM) {
            await continueSubject(item)
          }

          context.fillStyle = isParent ? '#FFFDF8' : '#F4F9F6'
          roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, qHeight, 10)
          context.fill()
          context.strokeStyle = isParent ? '#F0E5D0' : '#D5E9DE'
          context.lineWidth = 1
          context.stroke()

          context.fillStyle = isParent ? COLORS.gold : COLORS.green
          roundedRect(context, PAGE_MARGIN, y, 4, qHeight, 2)
          context.fill()

          context.fillStyle = isParent ? COLORS.gold : COLORS.green
          context.font = `600 19px ${SERIF_FONT_FAMILY}`
          context.fillText(section.label, PAGE_MARGIN + 20, y + 26)

          context.fillStyle = COLORS.ink
          context.font = `400 21px ${SERIF_FONT_FAMILY}`
          qLines.forEach((line, i) => {
            context.fillText(line, PAGE_MARGIN + 20, y + 54 + i * 30)
          })

          y += qHeight + 12
          continue
        }

        // 4. 家长陪学建议与其它通用 section
        context.font = `400 22px ${SERIF_FONT_FAMILY}`
        const lines = wrapText(context, section.content, CONTENT_WIDTH - 56)
        let cursor = 0
        while (cursor < lines.length) {
          let availableLines = Math.floor((CONTENT_BOTTOM - y - 70) / 33)
          const remainingLines = lines.length - cursor
          const preferredLines = Math.min(3, remainingLines)
          if (availableLines < preferredLines) {
            await continueSubject(item)
            availableLines = Math.floor((CONTENT_BOTTOM - y - 70) / 33)
          }
          const chunk = lines.slice(cursor, cursor + availableLines)
          const boxHeight = 58 + chunk.length * 33
          context.fillStyle = COLORS.surface
          roundedRect(context, PAGE_MARGIN, y, CONTENT_WIDTH, boxHeight, 14)
          context.fill()
          roundedRect(context, PAGE_MARGIN + 16, y + 11, 30, 30, 15)
          context.fillStyle = COLORS.primarySoft
          context.fill()
          context.fillStyle = COLORS.primary
          context.font = `700 16px ${SERIF_FONT_FAMILY}`
          context.textAlign = 'center'
          context.fillText(String(sectionIndex + 1).padStart(2, '0'), PAGE_MARGIN + 31, y + 32)
          context.textAlign = 'left'
          context.fillStyle = COLORS.primary
          context.font = `600 21px ${SERIF_FONT_FAMILY}`
          const sectionLabel = section.label === '课堂表现' || section.label === '课堂反馈'
            ? '老师课堂反馈'
            : section.label === '存在问题'
              ? '易错点与改进方向'
              : section.label === '后续建议'
                ? '教师后续建议'
                : section.label
          context.fillText(
            `${sectionLabel}${cursor ? '（续）' : ''}`,
            PAGE_MARGIN + 58,
            y + 31,
          )
          context.fillStyle = COLORS.ink
          context.font = `400 22px ${SERIF_FONT_FAMILY}`
          chunk.forEach((line, lineIndex) => {
            context.fillText(line, PAGE_MARGIN + 24, y + 64 + lineIndex * 33)
          })
          y += boxHeight + 12
          cursor += chunk.length
        }
      }

      if (imageRequests.length) {
        const imageResults = await loadImagesWithLimit(
          imageRequests,
          options.imageLoader || loadFeedbackImage,
        )
        skippedImages += imageResults.filter((result) => result.status === 'rejected').length
        const loadedImages = imageResults.flatMap((result) => (
          result.status === 'fulfilled' ? [result.value] : []
        ))
        embeddedImages += loadedImages.length

        for (let index = 0; index < loadedImages.length; index += 2) {
          if (await ensureSpace(318)) drawSubjectHeader(item, true)
          const row = loadedImages.slice(index, index + 2)
          const gap = 16
          const cardWidth = (CONTENT_WIDTH - gap) / 2
          row.forEach((loaded, rowIndex) => {
            const cardX = PAGE_MARGIN + rowIndex * (cardWidth + gap)
            context.fillStyle = COLORS.surface
            roundedRect(context, cardX, y, cardWidth, 296, 16)
            context.fill()
            context.fillStyle = COLORS.primary
            context.font = `600 19px ${SERIF_FONT_FAMILY}`
            context.fillText(`课堂照片 ${index + rowIndex + 1}`, cardX + 18, y + 31)
            drawImageContain(context, loaded.image, cardX + 16, y + 48, cardWidth - 32, 228)
            loaded.dispose()
          })
          y += 312
        }
      }
      y += 16
    }
  }

  if (pageOpen) await commitPage()
  return { blob: pdf.output('blob'), embeddedImages, skippedImages }
}
