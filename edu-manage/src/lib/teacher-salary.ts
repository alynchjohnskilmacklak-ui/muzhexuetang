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
  knowledgePoints?: string[]
  badge?: string | null
  imageUrls?: string[]
  homework?: any[]
}) {
  return feedback.status === 'PUBLISHED'
    && feedback.studentIds.length > 0
    && (
      Boolean((feedback.overallComment || '').trim()) ||
      Boolean((feedback.summary || '').trim()) ||
      (Array.isArray(feedback.knowledgePoints) && feedback.knowledgePoints.length > 0) ||
      Boolean((feedback.badge || '').trim()) ||
      (Array.isArray(feedback.imageUrls) && feedback.imageUrls.length > 0) ||
      (Array.isArray(feedback.homework) && feedback.homework.length > 0)
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

export async function triggerFeedbackBonus(feedbackId: string, prismaClient?: PrismaClient): Promise<{ success: boolean; error?: string }> {
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

    // Check if this exact feedback already has a bonus
    const existingBonus = await prisma.teacherSalaryTransaction.findFirst({
      where: { feedbackId, type: 'FEEDBACK_BONUS' },
      select: { id: true },
    })
    if (existingBonus) {
      console.warn('[salary] triggerFeedbackBonus: bonus already exists for feedback', feedbackId)
      return { success: true }
    }

    // Gather studentIds already rewarded today for this teacher
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart.getTime() + 86400000)
    const todayBonuses = await prisma.teacherSalaryTransaction.findMany({
      where: { teacherId, type: 'FEEDBACK_BONUS', createdAt: { gte: todayStart, lt: todayEnd } },
      select: { feedbackId: true },
    })

    const rewardedIds = new Set<string>()
    for (const b of todayBonuses) {
      if (!b.feedbackId || b.feedbackId === feedbackId) continue
      const fb = await prisma.classroomFeedback.findUnique({
        where: { id: b.feedbackId },
        select: { studentIds: true },
      })
      if (fb) fb.studentIds.forEach((id: string) => rewardedIds.add(id))
    }

    // Count eligible vs duplicate
    const allIds = feedback.studentIds
    const eligibleIds = allIds.filter((id: string) => !rewardedIds.has(id))
    const duplicateCount = allIds.length - eligibleIds.length

    if (eligibleIds.length === 0) {
      console.warn(`[salary] triggerFeedbackBonus: all ${allIds.length} students already rewarded today`, feedbackId)
      return { success: true, error: `当日均已奖励（${allIds.length}人重复）` }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Dedup check inside transaction
      const txExisting = await tx.teacherSalaryTransaction.findFirst({
        where: { feedbackId, type: 'FEEDBACK_BONUS' },
        select: { id: true },
      })
      if (txExisting) return { success: true }

      const cfg = await getTeacherSalaryConfig(teacherId, tx)

      // Per-student rate determination
      let totalAmount = 0
      for (const sid of eligibleIds) {
        let isOneOnOne = false
        if (lesson?.group?.course?.type === 'ONE_ON_ONE') {
          isOneOnOne = true
        } else if (!lesson) {
          const oneOnOneEnroll = await tx.enrollment.count({
            where: { studentId: sid, status: 'ACTIVE', group: { course: { type: 'ONE_ON_ONE' }, teacherId } },
          })
          isOneOnOne = oneOnOneEnroll > 0
        }
        const rate = isOneOnOne ? cfg.feedbackRateOneOne : cfg.feedbackRateGroup
        totalAmount += rate
      }

      const finalAmount = Number(totalAmount.toFixed(4))
      if (finalAmount <= 0) return { success: false, error: '金额为零' }

      const descParts = [`课堂反馈奖励（有效${eligibleIds.length}人`]
      if (duplicateCount > 0) descParts.push(`，重复${duplicateCount}人`)
      descParts.push(`，${lesson?.group?.course?.type === 'ONE_ON_ONE' ? '一对一' : '小班'}）`)

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
    return result
  } catch (err) {
    console.error('[salary] triggerFeedbackBonus failed:', feedbackId, err instanceof Error ? err.message : err)
    return { success: false, error: err instanceof Error ? err.message : '反馈奖励计算失败' }
  }
}
