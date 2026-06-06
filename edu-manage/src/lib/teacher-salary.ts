import { prisma } from '@/lib/prisma'

export const DEFAULT_GROUP_RATE_JUNIOR = 22
export const DEFAULT_GROUP_RATE_SENIOR = 26
export const DEFAULT_ONE_ON_ONE_RATES: Record<string, number> = {
  '初一': 25,
  '初二': 30,
  '初三': 35,
  '高一': 40,
  '高二': 45,
  '高三': 50,
}
export const DEFAULT_FEEDBACK_RATE_GROUP = 0.5
export const DEFAULT_FEEDBACK_RATE_ONE_ONE = 1.0

const SENIOR_GRADES = ['高一', '高二', '高三']
const GRADE_ALIASES: Array<[string, string[]]> = [
  ['初一', ['初一', '七年级', '7年级', '七上', '七下', '初中一年级']],
  ['初二', ['初二', '八年级', '8年级', '八上', '八下', '初中二年级']],
  ['初三', ['初三', '九年级', '9年级', '九上', '九下', '初中三年级', '中考']],
  ['高一', ['高一', '十年级', '10年级', '高一上', '高一下', '高中一年级']],
  ['高二', ['高二', '十一年级', '11年级', '高二上', '高二下', '高中二年级']],
  ['高三', ['高三', '十二年级', '12年级', '高三上', '高三下', '高中三年级', '高考']],
]

// Salary rules:
// group/small-group lesson pay = junior 22 or senior 26 yuan/hour * lessonMinutes / 60.
// one-on-one lesson pay = grade rate * lessonMinutes / 60.
// feedback bonus = student headcount * group 0.5 or one-on-one 1.0 yuan.
// Attendance and feedback triggers are idempotent by lesson/feedback transaction checks.

function normalizeRates(value: unknown): Record<string, number> {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return Object.fromEntries(
    Object.entries(DEFAULT_ONE_ON_ONE_RATES).map(([grade, defaultRate]) => [
      grade,
      typeof source[grade] === 'number' ? source[grade] as number : defaultRate,
    ]),
  )
}

export function isSeniorGrade(grade: string | null | undefined): boolean {
  const normalized = normalizeGrade(grade)
  if (normalized) return SENIOR_GRADES.includes(normalized)
  return Boolean(grade && /高中|高/.test(grade))
}

export function normalizeGrade(grade: string | null | undefined) {
  if (!grade) return null
  const text = grade.replace(/\s+/g, '')
  for (const [canonical, aliases] of GRADE_ALIASES) {
    if (aliases.some((alias) => text.includes(alias))) return canonical
  }
  if (/初中|初/.test(text)) return '初一'
  if (/高中|高/.test(text)) return '高一'
  return null
}

export function inferGrade(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(' ')
  return normalizeGrade(text)
}

export function isPayableFeedback(feedback: { status: string; summary?: string | null; knowledgePoints: string[]; studentIds: string[] }) {
  return feedback.status === 'PUBLISHED'
    && feedback.studentIds.length > 0
    && (Boolean(feedback.summary?.trim()) || feedback.knowledgePoints.length > 0)
}

export async function getTeacherSalaryConfig(teacherId: string) {
  const cfg = await prisma.teacherSalaryConfig.findUnique({ where: { teacherId } })
  return {
    groupRateJunior: cfg?.groupRateJunior ?? DEFAULT_GROUP_RATE_JUNIOR,
    groupRateSenior: cfg?.groupRateSenior ?? DEFAULT_GROUP_RATE_SENIOR,
    oneOnOneRates: normalizeRates(cfg?.oneOnOneRates),
    feedbackRateGroup: cfg?.feedbackRateGroup ?? DEFAULT_FEEDBACK_RATE_GROUP,
    feedbackRateOneOne: cfg?.feedbackRateOneOne ?? DEFAULT_FEEDBACK_RATE_ONE_ONE,
  }
}

export function calcLessonPay(opts: {
  courseType: string
  grade: string | null | undefined
  lessonMinutes: number
  groupRateJunior: number
  groupRateSenior: number
  oneOnOneRates: Record<string, number>
}): number {
  const { courseType, grade, lessonMinutes, groupRateJunior, groupRateSenior, oneOnOneRates } = opts
  if (courseType === 'ONE_ON_ONE') {
    const matchedGrade = normalizeGrade(grade)
    const ratePerHour = matchedGrade ? oneOnOneRates[matchedGrade] ?? DEFAULT_ONE_ON_ONE_RATES[matchedGrade] : 25
    return Number((ratePerHour * lessonMinutes / 60).toFixed(4))
  }

  const ratePerHour = isSeniorGrade(grade) ? groupRateSenior : groupRateJunior
  return Number((ratePerHour * lessonMinutes / 60).toFixed(4))
}

export async function triggerLessonPay(lessonId: string): Promise<void> {
  const lesson = await prisma.classLesson.findUnique({
    where: { id: lessonId },
    include: { group: { include: { course: true } } },
  })
  const teacherId = lesson?.teacherId || lesson?.group.teacherId
  if (!lesson || !teacherId) return

  const existing = await prisma.teacherSalaryTransaction.findFirst({
    where: { lessonId, type: 'LESSON_PAY' },
    select: { id: true },
  })
  if (existing) return

  const cfg = await getTeacherSalaryConfig(teacherId)
  const grade = inferGrade(lesson.group.course.grade, lesson.group.name, lesson.group.course.name)
  const amount = calcLessonPay({
    courseType: lesson.group.course.type,
    grade,
    lessonMinutes: lesson.group.lessonMinutes,
    groupRateJunior: cfg.groupRateJunior,
    groupRateSenior: cfg.groupRateSenior,
    oneOnOneRates: cfg.oneOnOneRates,
  })

  const rateLabel = lesson.group.course.type === 'ONE_ON_ONE'
    ? `${cfg.oneOnOneRates[grade || ''] ?? 25}元/小时`
    : `${isSeniorGrade(grade) ? cfg.groupRateSenior : cfg.groupRateJunior}元/小时`

  await prisma.teacherSalaryTransaction.create({
    data: {
      teacherId,
      type: 'LESSON_PAY',
      amount,
      lessonId,
      lessonDate: lesson.lessonDate,
      description: `${lesson.group.name}（${lesson.group.lessonMinutes}分钟 x ${rateLabel}）`,
    },
  })
}

export async function triggerFeedbackBonus(feedbackId: string): Promise<void> {
  const feedback = await prisma.classroomFeedback.findUnique({
    where: { id: feedbackId },
    include: { classLesson: { include: { group: { include: { course: true } } } } },
  })
  if (!feedback || !isPayableFeedback(feedback)) return

  // 管理端创建的反馈不发放奖励
  if ((feedback as any).source === 'admin') return

  const lesson = feedback.classLesson
  const teacherId = feedback.teacherId
  if (lesson?.id) {
    const existing = await prisma.teacherSalaryTransaction.findFirst({
      where: { lessonId: lesson.id, type: 'FEEDBACK_BONUS' },
      select: { id: true },
    })
    if (existing) return
  } else {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start.getTime() + 86400000)
    const existing = await prisma.teacherSalaryTransaction.findFirst({
      where: { teacherId, type: 'FEEDBACK_BONUS', createdAt: { gte: start, lt: end } },
      select: { id: true },
    })
    if (existing) return
  }

  const cfg = await getTeacherSalaryConfig(teacherId)
  // 优先从关联课次判断课程类型；无关联课次时，检查该教师是否存在活跃一对一班级
  let isOneOnOne = lesson?.group.course.type === 'ONE_ON_ONE'
  if (!lesson) {
    const hasOneOnOne = await prisma.classGroup.findFirst({
      where: { teacherId, status: 'ACTIVE', course: { type: 'ONE_ON_ONE' } },
      select: { id: true },
    })
    if (hasOneOnOne) isOneOnOne = true
  }
  const headCount = feedback.studentIds.length
  const rate = isOneOnOne ? cfg.feedbackRateOneOne : cfg.feedbackRateGroup
  const amount = Number((headCount * rate).toFixed(4))
  if (amount <= 0) return

  await prisma.teacherSalaryTransaction.create({
    data: {
      teacherId,
      type: 'FEEDBACK_BONUS',
      amount,
      feedbackId,
      lessonId: lesson?.id ?? null,
      lessonDate: lesson?.lessonDate ?? new Date(),
      description: `课堂反馈奖励（${headCount}人 x ${rate}元）`,
    },
  })
}
