import type { StudentGrowthArchive } from './archive'

type ReportFeedbackItem = StudentGrowthArchive['feedback']['items'][number]

export type StudentGrowthReportDTO = {
  student: {
    name: string
    grade: string | null
  }
  period: {
    startDate: string | null
    endDate: string | null
  }
  overview: {
    feedbackCount: number
    attendanceRate: number | null
    usedHours: number
    remainingHours: number
    approvedIntensiveHours: number
  }
  trend: {
    type: 'IMPROVING' | 'STABLE' | 'NEEDS_ATTENTION'
    description: string
  }
  stageSummary: string
  focusAreas: string[]
  learningStrengths: string[]
  improvements: string[]
  recentFeedback: Array<{
    id: string
    date: string
    subject: string
    teacher: string
    summary: string
  }>
  teacherSuggestions: string[]
  availability: {
    hasFeedback: boolean
    hasAttendance: boolean
    hasGrades: boolean
  }
}

const SECTION_NAMES = ['课堂表现', '知识掌握', '存在问题', '后续建议'] as const
const ISSUE_KEYWORDS = ['需要加强', '不足', '薄弱', '错误', '需提升', '不熟练']
const TREND_POSITIVE_KEYWORDS = ['积极', '认真', '提升', '进步', '掌握', '稳定']
const TREND_NEGATIVE_KEYWORDS = ['不足', '需要加强', '薄弱', '错误', '不熟练']
const FOCUS_AREA_RULES = [
  { keywords: ['计算'], label: '计算规范性需要加强' },
  { keywords: ['审题'], label: '审题习惯需要培养' },
  { keywords: ['基础', '概念'], label: '基础知识需要巩固' },
  { keywords: ['公式'], label: '公式运用需要加强' },
  { keywords: ['单词', '词汇'], label: '词汇积累需要加强' },
  { keywords: ['语法'], label: '语法运用需要加强' },
  { keywords: ['阅读'], label: '阅读理解需要加强' },
  { keywords: ['书写'], label: '书写规范性需要加强' },
  { keywords: ['专注', '注意力'], label: '课堂专注度需要提升' },
] as const

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
}

function extractRatingText(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  return [record.teacherRemark, record.masteryLevel, record.rating]
    .map(normalizeText)
    .filter(Boolean)
    .join('\n')
}

function extractSection(text: string, section: typeof SECTION_NAMES[number]) {
  if (!text) return ''
  const sectionPattern = SECTION_NAMES.join('|')
  const match = text.match(new RegExp(`${section}\\s*[：:]\\s*([\\s\\S]*?)(?=\\n?\\s*(?:${sectionPattern})\\s*[：:]|$)`))
  return match?.[1]?.trim() || ''
}

function feedbackText(item: ReportFeedbackItem) {
  return [
    item.lessonContent,
    item.overallComment,
    item.summary,
    ...item.knowledgePoints,
    ...item.tags,
    extractRatingText(item.studentRating),
  ].map(normalizeText).filter(Boolean).join('\n')
}

function trendText(item: ReportFeedbackItem) {
  return feedbackText(item).replace(/(?:课堂表现|知识掌握|存在问题|后续建议)\s*[：:]/g, '')
}

function countMatchingFeedback(items: ReportFeedbackItem[], keywords: string[]) {
  return items.filter((item) => {
    const text = feedbackText(item)
    return keywords.some((keyword) => text.includes(keyword))
  }).length
}

function countKeywordOccurrences(items: ReportFeedbackItem[], keywords: readonly string[]) {
  return items.reduce((total, item) => {
    const text = trendText(item)
    return total + keywords.reduce((count, keyword) => count + text.split(keyword).length - 1, 0)
  }, 0)
}

function cleanExcerpt(value: string) {
  return value
    .replace(/^(?:存在问题|后续建议)\s*[：:]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function issueExcerpts(item: ReportFeedbackItem) {
  const sources = [
    extractSection(normalizeText(item.overallComment), '存在问题'),
    normalizeText(item.summary),
    extractRatingText(item.studentRating),
  ].filter(Boolean)

  return sources.flatMap((source) => source
    .split(/[。！？!？；;\n]+/)
    .map(cleanExcerpt)
    .filter((sentence) => sentence && ISSUE_KEYWORDS.some((keyword) => sentence.includes(keyword))))
}

function suggestionOf(item: ReportFeedbackItem) {
  return cleanExcerpt(extractSection(normalizeText(item.overallComment), '后续建议'))
}

function summaryOf(item: ReportFeedbackItem) {
  return cleanExcerpt(
    normalizeText(item.summary)
      || extractSection(normalizeText(item.overallComment), '课堂表现')
      || normalizeText(item.overallComment),
  )
}

function buildTrend(items: ReportFeedbackItem[]): StudentGrowthReportDTO['trend'] {
  if (!items.length) {
    return { type: 'STABLE', description: '近期学习表现保持稳定。' }
  }

  const recentItems = items.slice(0, 10)
  const positiveCount = countKeywordOccurrences(recentItems, TREND_POSITIVE_KEYWORDS)
  const negativeCount = countKeywordOccurrences(recentItems, TREND_NEGATIVE_KEYWORDS)

  if (positiveCount > negativeCount * 2) {
    return { type: 'IMPROVING', description: '近期课堂反馈显示学习状态持续向好。' }
  }
  if (negativeCount > positiveCount) {
    return { type: 'NEEDS_ATTENTION', description: '近期存在需要重点关注的学习环节。' }
  }
  return { type: 'STABLE', description: '近期学习表现保持稳定。' }
}

function focusText(item: ReportFeedbackItem) {
  const problem = extractSection(normalizeText(item.overallComment), '存在问题')
  const suggestion = suggestionOf(item)
  if (!problem && !suggestion) return ''
  return [problem, suggestion, ...item.knowledgePoints].filter(Boolean).join('\n')
}

function buildFocusAreas(items: ReportFeedbackItem[]) {
  return FOCUS_AREA_RULES
    .filter((rule) => items.filter((item) => {
      const text = focusText(item)
      return rule.keywords.some((keyword) => text.includes(keyword))
    }).length >= 2)
    .map((rule) => rule.label)
}

function buildStageSummary(
  archive: StudentGrowthArchive,
  trend: StudentGrowthReportDTO['trend'],
  focusAreas: string[],
) {
  if (!archive.feedback.summary.totalCount) return '暂无阶段学习记录。'

  const attendance = archive.overview.attendanceRate === null
    ? ''
    : `阶段出勤率为${archive.overview.attendanceRate}%。`
  const focus = focusAreas.length
    ? `当前建议重点关注：${focusAreas.join('、')}。`
    : '当前未发现重复出现的重点问题。'
  return `${archive.student.name}同学本阶段共收到${archive.feedback.summary.totalCount}条课堂反馈。${trend.description}${attendance}${focus}`
}

export function renderStudentGrowthReport(archive: StudentGrowthArchive): StudentGrowthReportDTO {
  const items = archive.feedback.items
  const learningStrengths: string[] = []

  if (countMatchingFeedback(items, ['积极', '认真', '完成较好', '参与积极', '专注', '主动']) >= 2) {
    learningStrengths.push('近期课堂参与度较好')
  }
  if (countMatchingFeedback(items, ['理解较快', '基础扎实', '方法掌握', '掌握稳定', '掌握较好']) >= 2) {
    learningStrengths.push('知识掌握情况较稳定')
  }

  const improvements = [...new Set(items.flatMap(issueExcerpts))].slice(0, 5)
  if (!improvements.length) improvements.push('暂无明显薄弱项记录，请继续保持。')

  const teacherSuggestions = [...new Set(items.map(suggestionOf).filter(Boolean))].slice(0, 3)
  const trend = buildTrend(items)
  const focusAreas = buildFocusAreas(items)

  return {
    student: {
      name: archive.student.name,
      grade: archive.student.grade,
    },
    period: {
      startDate: archive.feedback.summary.firstFeedbackDate,
      endDate: archive.feedback.summary.latestFeedbackDate,
    },
    overview: {
      feedbackCount: archive.overview.feedbackCount,
      attendanceRate: archive.overview.attendanceRate,
      usedHours: archive.overview.usedHours,
      remainingHours: archive.overview.remainingHours,
      approvedIntensiveHours: archive.overview.approvedIntensiveHours || 0,
    },
    trend,
    stageSummary: buildStageSummary(archive, trend, focusAreas),
    focusAreas,
    learningStrengths,
    improvements,
    recentFeedback: items.slice(0, 5).map((item) => ({
      id: item.id,
      date: item.date,
      subject: item.subject,
      teacher: item.teacher.name,
      summary: summaryOf(item) || '老师已记录本次课堂情况',
    })),
    teacherSuggestions,
    availability: {
      hasFeedback: archive.feedback.summary.totalCount > 0,
      hasAttendance: archive.attendance.summary.total > 0,
      hasGrades: archive.grades.trend.length > 0,
    },
  }
}
