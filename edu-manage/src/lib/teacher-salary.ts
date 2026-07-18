import * as Sentry from '@sentry/nextjs'
import { getRequestPrisma } from '@/lib/prisma'
import type { Prisma, PrismaClient } from '@prisma/client'

function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

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

export async function triggerLessonPay(
  lessonId: string,
  prismaClient?: PrismaClient,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
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

      const salaryTx = await tx.teacherSalaryTransaction.create({
        data: {
          teacherId, type: 'LESSON_PAY', amount, lessonId,
          lessonDate: lesson.lessonDate,
          description: `${lesson.group.name}（${lesson.group.lessonMinutes}分钟 x ${rateLabel}）`,
        },
      })
      await tx.activityLog.create({
        data: {
          teacherId,
          action: 'SALARY_LESSON_PAY',
          entityType: 'TeacherSalaryTransaction',
          entityId: salaryTx.id,
          detail: `课时费 ¥${amount}：${lesson.group.name}`,
          metadata: { lessonId, amount, lessonDate: lesson.lessonDate, courseType: lesson.group.course.type },
        },
      })
      return { success: true }
    })
    return result
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      console.warn('[salary] triggerLessonPay: concurrent duplicate skipped', lessonId)
      return { success: true, skipped: true }
    }
    console.error('[salary] triggerLessonPay failed:', lessonId, err instanceof Error ? err.message : err)
    Sentry.captureException(err, { extra: { lessonId, location: 'triggerLessonPay' } })
    return { success: false, error: err instanceof Error ? err.message : '薪资计算失败' }
  }
}

// ── Feedback bonus ──

export type FeedbackCourseBucket = 'GROUP' | 'ONE_ON_ONE'

export type FeedbackBonusPreview = {
  courseBucket: FeedbackCourseBucket
  courseKey: string
  courseLabel: string
  subjectKey: string
  subjectLabel: string
  rewardLedgerAvailable: boolean
  label: string
  rate: number
  selectedCount: number
  eligibleCount: number
  duplicateCount: number
  total: number
  eligibleStudentIds: string[]
  eligibleStudentNames: string[]
  duplicateStudentIds: string[]
  duplicateStudentNames: string[]
  message: string
}

export type FeedbackBonusResult = {
  success: boolean
  skipped?: boolean
  error?: string
  courseBucket?: FeedbackCourseBucket
  courseKey?: string
  subjectKey?: string
  rate?: number
  eligibleCount?: number
  duplicateCount?: number
  amount?: number
  eligibleStudentNames?: string[]
  duplicateStudentNames?: string[]
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

type FeedbackRewardContext = {
  courseBucket: FeedbackCourseBucket
  courseKey: string
  courseLabel: string
  subjectKey: string
  subjectLabel: string
}

type FeedbackRewardModel = {
  findMany(args: unknown): Promise<Array<{ studentId: string }>>
  createMany(args: unknown): Promise<{ count: number }>
  count(args: unknown): Promise<number>
}

function feedbackRewardModel(prisma: PrismaClient | Prisma.TransactionClient): FeedbackRewardModel | null {
  return (prisma as unknown as { feedbackRewardRecord?: FeedbackRewardModel }).feedbackRewardRecord ?? null
}

const SUBJECT_KEY_ALIASES: Array<[string, string[]]> = [
  ['MATH', ['数学', 'math', 'mathematics']],
  ['PHYSICS', ['物理', 'physics']],
  ['ENGLISH', ['英语', '英文', 'english']],
  ['CHINESE', ['语文', 'chinese']],
  ['CHEMISTRY', ['化学', 'chemistry']],
  ['BIOLOGY', ['生物', 'biology']],
  ['GEOGRAPHY', ['地理', 'geography']],
  ['HISTORY', ['历史', 'history']],
  ['POLITICS', ['政治', '道法', '道德与法治', 'politics']],
  ['SCIENCE', ['科学', 'science']],
]

export function normalizeFeedbackSubjectKey(division: string | null | undefined, subject: string | null | undefined) {
  const divisionKey = String(division || '').toUpperCase() === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  const subjectLabel = String(subject || '').trim()
  const normalizedSubject = subjectLabel.toLowerCase().replace(/\s+/g, '')
  const alias = SUBJECT_KEY_ALIASES.find(([, aliases]) => aliases.some((item) => item.toLowerCase() === normalizedSubject))?.[0]
  const subjectToken = alias || subjectLabel
    .toUpperCase()
    .replace(/[\s/\\-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'UNCLASSIFIED'
  return `${divisionKey}_${subjectToken}`
}

export function rewardContextFromCourse(
  course: { id?: string | null; name?: string | null; subject?: string | null; type?: string | null; division?: string | null } | null | undefined,
  fallbackType?: string | null,
  override?: { subject?: string | null; division?: string | null },
): FeedbackRewardContext {
  const courseBucket = toFeedbackCourseBucket(course?.type || fallbackType)
  const subjectLabel = override?.subject?.trim() || course?.subject?.trim() || '未分类'
  const subjectKey = normalizeFeedbackSubjectKey(override?.division || course?.division, subjectLabel)
  const courseKey = course?.id ? `course:${course.id}` : subjectLabel !== '未分类' ? `subject:${subjectLabel.toLowerCase()}` : `type:${courseBucket}`
  return {
    courseBucket,
    courseKey,
    courseLabel: course?.name?.trim() || subjectLabel || feedbackBucketLabel(courseBucket),
    subjectKey,
    subjectLabel,
  }
}

async function resolveFeedbackRewardContext(opts: {
  lessonId?: string | null
  groupId?: string | null
  feedbackCourseType?: string | null
  teacherId: string
  prismaClient: PrismaClient | Prisma.TransactionClient
}): Promise<FeedbackRewardContext> {
  const prisma = opts.prismaClient
  if (opts.lessonId) {
    const lesson = await prisma.classLesson.findUnique({
      where: { id: opts.lessonId },
      select: {
        subject: true,
        division: true,
        group: {
          select: {
            division: true,
            course: { select: { id: true, name: true, subject: true, type: true, division: true } },
            teacherAssignments: { where: { teacherId: opts.teacherId }, select: { subject: true }, take: 1 },
          },
        },
      },
    })
    if (lesson?.group?.course) {
      const subject = lesson.subject?.trim() || lesson.group.course.subject?.trim() || lesson.group.teacherAssignments[0]?.subject?.trim()
      return rewardContextFromCourse(lesson.group.course, opts.feedbackCourseType, {
        subject,
        division: lesson.division || lesson.group.division || lesson.group.course.division,
      })
    }
  }
  if (opts.groupId) {
    const group = await prisma.classGroup.findUnique({
      where: { id: opts.groupId },
      select: {
        division: true,
        course: { select: { id: true, name: true, subject: true, type: true, division: true } },
        teacherAssignments: { where: { teacherId: opts.teacherId }, select: { subject: true }, take: 1 },
      },
    })
    if (group?.course) {
      const subject = group.course.subject?.trim() || group.teacherAssignments[0]?.subject?.trim()
      return rewardContextFromCourse(group.course, opts.feedbackCourseType, { subject, division: group.division || group.course.division })
    }
  }
  const teacher = await prisma.teacher.findUnique({ where: { id: opts.teacherId }, select: { division: true } })
  return rewardContextFromCourse(null, opts.feedbackCourseType, { division: teacher?.division })
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
  const rewardContext = await resolveFeedbackRewardContext({
    teacherId: opts.teacherId,
    lessonId: opts.lessonId,
    groupId: opts.groupId,
    feedbackCourseType: opts.feedbackCourseType,
    prismaClient: prisma,
  })
  const { courseBucket, courseKey, courseLabel, subjectKey, subjectLabel } = rewardContext
  const cfg = await getTeacherSalaryConfig(opts.teacherId, prisma)
  const rate = courseBucket === 'ONE_ON_ONE' ? cfg.feedbackRateOneOne : cfg.feedbackRateGroup

  const rewardedStudentIds = new Set<string>()
  let rewardModel = feedbackRewardModel(prisma)
  if (rewardModel) {
    try {
      const records = await rewardModel.findMany({
        where: { teacherId: opts.teacherId, subjectKey, isActive: true, studentId: { in: selectedIds } },
        select: { studentId: true },
      })
      records.forEach((record) => rewardedStudentIds.add(record.studentId))
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
      if (code !== 'P2021' && code !== 'P2022') throw error
      rewardModel = null
    }
  }
  if (!rewardModel) {
    // Safe compatibility before the reviewed migration is deployed.
    const previousBonuses = await prisma.teacherSalaryTransaction.findMany({
      where: { teacherId: opts.teacherId, type: 'FEEDBACK_BONUS' },
      select: { feedbackId: true },
    })
    const feedbackIds = previousBonuses.map((item) => item.feedbackId).filter((id): id is string => Boolean(id && id !== opts.excludeFeedbackId))
    if (feedbackIds.length) {
      const feedbacks = await prisma.classroomFeedback.findMany({
        where: { id: { in: feedbackIds } },
        select: { id: true, studentIds: true, classLessonId: true, feedbackGroupId: true, feedbackCourseType: true },
      })
      for (const fb of feedbacks) {
        const historicalContext = await resolveFeedbackRewardContext({
          teacherId: opts.teacherId,
          lessonId: fb.classLessonId,
          groupId: fb.feedbackGroupId,
          feedbackCourseType: fb.feedbackCourseType,
          prismaClient: prisma,
        })
        if (historicalContext.subjectKey === subjectKey) {
          fb.studentIds.forEach((id: string) => rewardedStudentIds.add(id))
        }
      }
    }
  }

  const eligibleStudentIds = selectedIds.filter((id) => !rewardedStudentIds.has(id))
  const duplicateStudentIds = selectedIds.filter((id) => rewardedStudentIds.has(id))
  const selectedStudents = selectedIds.length
    ? await prisma.student.findMany({ where: { id: { in: selectedIds } }, select: { id: true, name: true } })
    : []
  const studentNameMap = new Map(selectedStudents.map((student) => [student.id, student.name]))
  const eligibleStudentNames = eligibleStudentIds.map((id) => studentNameMap.get(id) || id)
  const duplicateStudentNames = duplicateStudentIds.map((id) => studentNameMap.get(id) || id)
  const label = `${courseLabel} · ${feedbackBucketLabel(courseBucket)}`
  const total = Number((eligibleStudentIds.length * rate).toFixed(4))
  const message = duplicateStudentIds.length
    ? `${label} · ${formatMoney(rate)}元/人；首次奖励：${eligibleStudentNames.join('、') || '无'}；仅记录反馈：${duplicateStudentNames.join('、')}`
    : `${label} · ${formatMoney(rate)}元/人；${eligibleStudentNames.join('、') || '所选学生'}可获得该教师首次反馈奖励，预计${formatMoney(total)}元`

  return {
    courseBucket,
    courseKey,
    courseLabel,
    subjectKey,
    subjectLabel,
    rewardLedgerAvailable: Boolean(rewardModel),
    label,
    rate,
    selectedCount: selectedIds.length,
    eligibleCount: eligibleStudentIds.length,
    duplicateCount: duplicateStudentIds.length,
    total,
    eligibleStudentIds,
    eligibleStudentNames,
    duplicateStudentIds,
    duplicateStudentNames,
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
    if (feedback && feedback.source === 'admin') {
      console.warn('[salary] 管理端代发不计薪资', feedbackId)
      return { success: false, error: '管理端代发反馈不计入薪资' }
    }
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
      subjectKey: preview.subjectKey,
      rate: preview.rate,
      allStudentIds: feedback.studentIds,
      eligibleIds: preview.eligibleStudentIds,
      duplicateIds: preview.duplicateStudentIds,
    })

    if (preview.eligibleCount === 0) {
      console.warn(`[salary] triggerFeedbackBonus: all ${feedback.studentIds.length} students already rewarded for ${preview.subjectKey}`, feedbackId)
      return {
        success: true,
        courseBucket: preview.courseBucket,
        subjectKey: preview.subjectKey,
        rate: preview.rate,
        eligibleCount: 0,
        duplicateCount: preview.duplicateCount,
        amount: 0,
        message: '本次反馈已记录，该学科首次反馈奖励已发放过，本次不重复计奖',
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const txExisting = await tx.teacherSalaryTransaction.findFirst({
        where: { feedbackId, type: 'FEEDBACK_BONUS' },
        select: { id: true },
      })
      if (txExisting) return { success: true }

      let awardedCount = preview.eligibleCount
      const rewardModel = preview.rewardLedgerAvailable ? feedbackRewardModel(tx) : null
      if (rewardModel) {
        const inserted = await rewardModel.createMany({
          data: preview.eligibleStudentIds.map((studentId) => ({
            feedbackId,
            studentId,
            teacherId,
            subjectKey: preview.subjectKey,
            subjectLabel: preview.subjectLabel,
            courseKey: preview.courseKey,
            courseLabel: preview.courseLabel,
            amount: preview.rate,
            isFirstFeedback: true,
            isActive: true,
          })),
          skipDuplicates: true,
        })
        awardedCount = inserted.count
      }
      const finalAmount = Number((awardedCount * preview.rate).toFixed(4))
      if (finalAmount <= 0) return { success: true, awardedCount: 0, amount: 0 }

      const typeLabel = feedbackBucketShortLabel(preview.courseBucket)
      const descParts = [`课堂反馈奖励：${preview.courseLabel} · ${typeLabel}，首次${awardedCount}人`]
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
      await tx.activityLog.create({
        data: {
          teacherId,
          action: 'SALARY_FEEDBACK_BONUS',
          entityType: 'TeacherSalaryTransaction',
          entityId: feedbackId,
          detail: `反馈奖励 ¥${finalAmount}：${preview.courseLabel} ${awardedCount}人 × ¥${formatMoney(preview.rate)}`,
          metadata: { feedbackId, amount: finalAmount, eligibleCount: awardedCount, duplicateCount: feedback.studentIds.length - awardedCount, rate: preview.rate, courseBucket: preview.courseBucket, courseKey: preview.courseKey, subjectKey: preview.subjectKey, subjectLabel: preview.subjectLabel },
        },
      })
      return { success: true, awardedCount, amount: finalAmount }
    })
    if (!result.success) return result
    return {
      success: true,
      courseBucket: preview.courseBucket,
      courseKey: preview.courseKey,
      subjectKey: preview.subjectKey,
      rate: preview.rate,
      eligibleCount: result.awardedCount ?? 0,
      duplicateCount: feedback.studentIds.length - (result.awardedCount ?? 0),
      amount: result.amount ?? 0,
      eligibleStudentNames: preview.eligibleStudentNames.slice(0, result.awardedCount ?? 0),
      duplicateStudentNames: preview.duplicateStudentNames,
      message: (result.awardedCount ?? 0) > 0
        ? `首次奖励：${preview.eligibleStudentNames.slice(0, result.awardedCount ?? 0).join('、')}，共${formatMoney(result.amount ?? 0)}元${preview.duplicateStudentNames.length ? `；仅记录反馈：${preview.duplicateStudentNames.join('、')}` : ''}`
        : `本次反馈已记录；${preview.duplicateStudentNames.join('、') || '所选学生'}已获得${preview.subjectLabel}首次反馈奖励，本次不重复计奖`,
    }
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      console.warn('[salary] triggerFeedbackBonus: concurrent duplicate skipped', feedbackId)
      return {
        success: true,
        skipped: true,
        message: '本次反馈已记录，奖励流水已存在',
      }
    }
    console.error('[salary] triggerFeedbackBonus failed:', feedbackId, err instanceof Error ? err.message : err)
    Sentry.captureException(err, { extra: { feedbackId, location: 'triggerFeedbackBonus' } })
    return { success: false, error: err instanceof Error ? err.message : '反馈奖励计算失败' }
  }
}
