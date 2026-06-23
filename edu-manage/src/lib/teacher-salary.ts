import { getRequestPrisma } from '@/lib/prisma'
import type { Prisma, PrismaClient } from '@prisma/client'

export const DEFAULT_GROUP_RATE_JUNIOR = 22
export const DEFAULT_GROUP_RATE_SENIOR = 26
export const DEFAULT_ONE_ON_ONE_RATES: Record<string, number> = {
  '初一': 25, '初二': 30, '初三': 35,
  '高一': 40, '高二': 45, '高三': 50,
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

// ── Grade helpers ──

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

// ── Payable feedback check ──

export function isPayableFeedback(feedback: {
  status: string
  studentIds: string[]
  overallComment?: string | null
  summary?: string | null
  knowledgePoints?: string[] | null
  badge?: string | null
  imageUrls?: string[] | null
  homework?: unknown
}) {
  const hwArr = Array.isArray(feedback.homework) ? feedback.homework : []
  const kpArr = Array.isArray(feedback.knowledgePoints) ? feedback.knowledgePoints : []
  const imgsArr = Array.isArray(feedback.imageUrls) ? feedback.imageUrls : []
  return feedback.status === 'PUBLISHED'
    && feedback.studentIds.length > 0
    && (
      Boolean((feedback.overallComment || '').trim()) ||
      Boolean((feedback.summary || '').trim()) ||
      kpArr.length > 0 ||
      Boolean((feedback.badge || '').trim()) ||
      imgsArr.length > 0 ||
      hwArr.length > 0
    )
}

// ── Salary config ──

export async function getTeacherSalaryConfig(teacherId: string, prismaClient?: PrismaClient | Prisma.TransactionClient) {
  const prisma = prismaClient ?? await getRequestPrisma()
  const cfg = await prisma.teacherSalaryConfig.findUnique({ where: { teacherId } })
  return {
    groupRateJunior: cfg?.groupRateJunior ?? DEFAULT_GROUP_RATE_JUNIOR,
    groupRateSenior: cfg?.groupRateSenior ?? DEFAULT_GROUP_RATE_SENIOR,
    oneOnOneRates: normalizeRates(cfg?.oneOnOneRates),
    feedbackRateGroup: cfg?.feedbackRateGroup ?? DEFAULT_FEEDBACK_RATE_GROUP,
    feedbackRateOneOne: cfg?.feedbackRateOneOne ?? DEFAULT_FEEDBACK_RATE_ONE_ONE,
  }
}

// ── Lesson pay ──

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

export async function triggerLessonPay(lessonId: string, prismaClient?: PrismaClient): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = prismaClient ?? await getRequestPrisma()
    const lesson = await prisma.classLesson.findUnique({
      where: { id: lessonId },
      include: { group: { include: { course: true } } },
    })
    const teacherId = lesson?.teacherId || lesson?.group.teacherId
    if (!lesson || !teacherId) return { success: false, error: '课次或教师不存在' }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.teacherSalaryTransaction.findFirst({
        where: { lessonId, type: 'LESSON_PAY' },
        select: { id: true },
      })
      if (existing) return { success: true }

      const cfg = await getTeacherSalaryConfig(teacherId, tx)
      const grade = inferGrade(lesson.group.course.grade, lesson.group.name, lesson.group.course.name)
      const amount = calcLessonPay({
        courseType: lesson.group.course.type, grade,
        lessonMinutes: lesson.group.lessonMinutes,
        groupRateJunior: cfg.groupRateJunior, groupRateSenior: cfg.groupRateSenior,
        oneOnOneRates: cfg.oneOnOneRates,
      })

      const rateLabel = lesson.group.course.type === 'ONE_ON_ONE'
        ? `${cfg.oneOnOneRates[grade || ''] ?? 25}元/小时`
        : `${isSeniorGrade(grade) ? cfg.groupRateSenior : cfg.groupRateJunior}元/小时`

      await tx.teacherSalaryTransaction.create({
        data: {
          teacherId, type: 'LESSON_PAY', amount, lessonId,
          lessonDate: lesson.lessonDate,
          description: `${lesson.group.name}（${lesson.group.lessonMinutes}分钟 x ${rateLabel}）`,
        },
      })
      return { success: true }
    })
    return result
  } catch (err) {
    console.error('[salary] triggerLessonPay failed:', lessonId, err instanceof Error ? err.message : err)
    return { success: false, error: err instanceof Error ? err.message : '薪资计算失败' }
  }
}

// ── Feedback bonus ──

export type FeedbackCourseBucket = 'GROUP' | 'ONE_ON_ONE'

export type FeedbackBonusPreview = {
  courseBucket: FeedbackCourseBucket
  label: string
  rate: number
  selectedCount: number
  eligibleCount: number
  duplicateCount: number
  total: number
  eligibleStudentIds: string[]
  duplicateStudentIds: string[]
  duplicateStudentNames: string[]
  message: string
}

export type FeedbackBonusResult = {
  success: boolean
  error?: string
  courseBucket?: FeedbackCourseBucket
  rate?: number
  eligibleCount?: number
  duplicateCount?: number
  amount?: number
  message?: string
}

export function toFeedbackCourseBucket(value: unknown): FeedbackCourseBucket {
  return value === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : 'GROUP'
}

export function resolveFeedbackCourseBucket(feedback: {
  feedbackCourseType?: string | null
  classLesson?: { group?: { course?: { type?: string | null } | null } | null } | null
}): FeedbackCourseBucket {
  const lessonCourseType = feedback.classLesson?.group?.course?.type
  if (lessonCourseType === 'ONE_ON_ONE') return 'ONE_ON_ONE'
  if (lessonCourseType) return 'GROUP'
  return toFeedbackCourseBucket(feedback.feedbackCourseType)
}

export async function resolveFeedbackCourseBucketFromContext(opts: {
  lessonId?: string | null
  groupId?: string | null
  feedbackCourseType?: string | null
  prismaClient?: PrismaClient | Prisma.TransactionClient
}): Promise<FeedbackCourseBucket> {
  const prisma = opts.prismaClient ?? await getRequestPrisma()
  if (opts.lessonId) {
    const lesson = await prisma.classLesson.findUnique({
      where: { id: opts.lessonId },
      select: { group: { select: { course: { select: { type: true } } } } },
    })
    const type = lesson?.group?.course?.type
    if (type) return toFeedbackCourseBucket(type)
  }
  if (opts.groupId) {
    const group = await prisma.classGroup.findUnique({
      where: { id: opts.groupId },
      select: { course: { select: { type: true } } },
    })
    const type = group?.course?.type
    if (type) return toFeedbackCourseBucket(type)
  }
  return toFeedbackCourseBucket(opts.feedbackCourseType)
}

function feedbackBucketLabel(bucket: FeedbackCourseBucket) {
  return bucket === 'ONE_ON_ONE' ? '一对一反馈' : '小班反馈'
}

function feedbackBucketShortLabel(bucket: FeedbackCourseBucket) {
  return bucket === 'ONE_ON_ONE' ? '一对一' : '小班'
}

function formatMoney(value: number) {
  return Number(value.toFixed(2)).toString()
}

export async function getFeedbackBonusPreview(opts: {
  teacherId: string
  studentIds: string[]
  lessonId?: string | null
  groupId?: string | null
  feedbackCourseType?: string | null
  excludeFeedbackId?: string | null
  prismaClient?: PrismaClient | Prisma.TransactionClient
}): Promise<FeedbackBonusPreview> {
  const prisma = opts.prismaClient ?? await getRequestPrisma()
  const selectedIds = [...new Set(opts.studentIds.filter(Boolean))]
  const courseBucket = await resolveFeedbackCourseBucketFromContext({
    lessonId: opts.lessonId,
    groupId: opts.groupId,
    feedbackCourseType: opts.feedbackCourseType,
    prismaClient: prisma,
  })
  const cfg = await getTeacherSalaryConfig(opts.teacherId, prisma)
  const rate = courseBucket === 'ONE_ON_ONE' ? cfg.feedbackRateOneOne : cfg.feedbackRateGroup

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const todayBonuses = await prisma.teacherSalaryTransaction.findMany({
    where: { teacherId: opts.teacherId, type: 'FEEDBACK_BONUS', createdAt: { gte: todayStart, lt: todayEnd } },
    select: { feedbackId: true },
  })

  const feedbackIds = todayBonuses
    .map((item) => item.feedbackId)
    .filter((id): id is string => Boolean(id && id !== opts.excludeFeedbackId))

  const rewardedKeys = new Set<string>()
  if (feedbackIds.length) {
    const feedbacks = await prisma.classroomFeedback.findMany({
      where: { id: { in: feedbackIds } },
      select: {
        studentIds: true,
        feedbackCourseType: true,
        classLesson: { select: { group: { select: { course: { select: { type: true } } } } } },
      },
    })
    for (const fb of feedbacks) {
      const bucket = resolveFeedbackCourseBucket(fb)
      fb.studentIds.forEach((id: string) => rewardedKeys.add(`${id}:${bucket}`))
    }
  }

  const eligibleStudentIds = selectedIds.filter((id) => !rewardedKeys.has(`${id}:${courseBucket}`))
  const duplicateStudentIds = selectedIds.filter((id) => rewardedKeys.has(`${id}:${courseBucket}`))
  const duplicateStudents = duplicateStudentIds.length
    ? await prisma.student.findMany({ where: { id: { in: duplicateStudentIds } }, select: { id: true, name: true } })
    : []
  const duplicateNameMap = new Map(duplicateStudents.map((student) => [student.id, student.name]))
  const label = feedbackBucketLabel(courseBucket)
  const total = Number((eligibleStudentIds.length * rate).toFixed(4))
  const message = duplicateStudentIds.length
    ? `当前场景：${label} · ${formatMoney(rate)}元/人，已选${selectedIds.length}人，预计奖励${formatMoney(total)}元；其中${duplicateStudentIds.length}人今日${feedbackBucketShortLabel(courseBucket)}反馈已奖励过，不重复计奖`
    : `当前场景：${label} · ${formatMoney(rate)}元/人，已选${selectedIds.length}人，预计奖励${formatMoney(total)}元`

  return {
    courseBucket,
    label,
    rate,
    selectedCount: selectedIds.length,
    eligibleCount: eligibleStudentIds.length,
    duplicateCount: duplicateStudentIds.length,
    total,
    eligibleStudentIds,
    duplicateStudentIds,
    duplicateStudentNames: duplicateStudentIds.map((id) => duplicateNameMap.get(id) || id),
    message,
  }
}

export async function triggerFeedbackBonus(feedbackId: string, prismaClient?: PrismaClient): Promise<FeedbackBonusResult> {
  try {
    const prisma = prismaClient ?? await getRequestPrisma()
    const feedback = await prisma.classroomFeedback.findUnique({
      where: { id: feedbackId },
      include: { classLesson: { include: { group: { include: { course: true } } } } },
    })
    if (!feedback || !isPayableFeedback(feedback)) {
      console.warn('[salary] triggerFeedbackBonus: feedback not payable', feedbackId, feedback?.status)
      return { success: false, error: '反馈不可发放奖励' }
    }

    const teacherId = feedback.teacherId
    const lesson = feedback.classLesson

    const existingBonus = await prisma.teacherSalaryTransaction.findFirst({
      where: { feedbackId, type: 'FEEDBACK_BONUS' },
      select: { id: true },
    })
    if (existingBonus) {
      console.warn('[salary] triggerFeedbackBonus: bonus already exists for feedback', feedbackId)
      return { success: true, message: '本次反馈已记录，奖励流水已存在' }
    }

    const preview = await getFeedbackBonusPreview({
      teacherId,
      studentIds: feedback.studentIds,
      lessonId: feedback.classLessonId,
      groupId: feedback.feedbackGroupId,
      feedbackCourseType: feedback.feedbackCourseType,
      excludeFeedbackId: feedbackId,
      prismaClient: prisma,
    })

    console.log('[FeedbackBonus] resolved', {
      feedbackId,
      teacherId,
      lessonId: feedback.classLessonId,
      currentBucket: preview.courseBucket,
      rate: preview.rate,
      allStudentIds: feedback.studentIds,
      eligibleIds: preview.eligibleStudentIds,
      duplicateIds: preview.duplicateStudentIds,
    })

    if (preview.eligibleCount === 0) {
      console.warn(`[salary] triggerFeedbackBonus: all ${feedback.studentIds.length} students already rewarded today for ${preview.courseBucket}`, feedbackId)
      return {
        success: true,
        courseBucket: preview.courseBucket,
        rate: preview.rate,
        eligibleCount: 0,
        duplicateCount: preview.duplicateCount,
        amount: 0,
        message: '本次反馈已记录，今日同场景已奖励过，不重复计奖',
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const txExisting = await tx.teacherSalaryTransaction.findFirst({
        where: { feedbackId, type: 'FEEDBACK_BONUS' },
        select: { id: true },
      })
      if (txExisting) return { success: true }

      const finalAmount = preview.total
      if (finalAmount <= 0) return { success: false, error: '金额为零' }

      const typeLabel = feedbackBucketShortLabel(preview.courseBucket)
      const descParts = [`课堂反馈奖励：${typeLabel}，有效${preview.eligibleCount}人`]
      if (preview.duplicateCount > 0) descParts.push(`，重复${preview.duplicateCount}人`)
      descParts.push(`，${formatMoney(preview.rate)}元/人`)

      await tx.teacherSalaryTransaction.create({
        data: {
          teacherId, type: 'FEEDBACK_BONUS', amount: finalAmount, feedbackId,
          lessonId: lesson?.id ?? null,
          lessonDate: lesson?.lessonDate ?? new Date(),
          description: descParts.join(''),
        },
      })
      return { success: true }
    })
    if (!result.success) return result
    return {
      success: true,
      courseBucket: preview.courseBucket,
      rate: preview.rate,
      eligibleCount: preview.eligibleCount,
      duplicateCount: preview.duplicateCount,
      amount: preview.total,
      message: `本次按${preview.label}计入奖励：${preview.eligibleCount}人 × ${formatMoney(preview.rate)}元 = ${formatMoney(preview.total)}元`,
    }
  } catch (err) {
    console.error('[salary] triggerFeedbackBonus failed:', feedbackId, err instanceof Error ? err.message : err)
    return { success: false, error: err instanceof Error ? err.message : '反馈奖励计算失败' }
  }
}
