import type { PrismaClient } from '@prisma/client'
import { getParentFeedbackDisplaySections } from '@/lib/classroom-feedback/parent-feedback-content'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { filterStudentRatingsForStudents } from '@/lib/classroom-feedback/access'
import { getConfiguredPublicOrigin } from '@/lib/public-origin'
import { truncateUtf8Bytes, utf8ByteLength } from '@/lib/utf8'

type DailyDigestCard = { title: string; desc: string; url: string; picUrl?: string }
type FeedbackDigestCard = DailyDigestCard & {
  feedbackIds: string[]
  studentIds: string[]
  studentNames: string[]
}

const DEFAULT_DIGEST_IMAGE_PATH = '/brand/logo-export.jpg'

function defaultDigestImageUrl() {
  return new URL(DEFAULT_DIGEST_IMAGE_PATH, getConfiguredPublicOrigin()).toString()
}

function feedbackRatingForStudent(ratings: unknown, studentId: string) {
  const filtered = filterStudentRatingsForStudents(ratings, [studentId])
  if (Array.isArray(filtered)) {
    const row = filtered[0]
    if (row && typeof row === 'object' && 'rating' in row) return (row as { rating?: unknown }).rating
    return row ?? null
  }
  if (filtered && typeof filtered === 'object') return (filtered as Record<string, unknown>)[studentId] ?? null
  return null
}

/** 考勤状态中文映射 */
const ATT_LABEL: Record<string, string> = {
  PRESENT: '出勤',
  LEAVE: '请假',
  ABSENT: '缺勤',
  MAKEUP: '补课',
}

/**
 * 生成「当日学习汇总」卡片内容（短期方案：企微家长群发同日合并）。
 * 聚合孩子当天整体信息：考勤、教师反馈、系统通知。
 */
export async function buildDailyDigest(
  prisma: PrismaClient,
  studentId: string,
  studentName: string,
): Promise<{ title: string; desc: string; url: string }> {
  const { start: todayStart, end: todayEnd } = getLocalDayRange(todayLocal())

  const lines: string[] = []

  // 1) 今日考勤（按课时日期）
  const attendances = await prisma.attendance.findMany({
    where: {
      studentId,
      lesson: { lessonDate: { gte: todayStart, lt: todayEnd } },
    },
    include: { lesson: { select: { subject: true, startTime: true, endTime: true } } },
    orderBy: { createdAt: 'asc' },
  })
  if (attendances.length > 0) {
    const parts = attendances.map((a) => {
      const subject = a.lesson?.subject || '课程'
      const time = a.lesson ? `${a.lesson.startTime}-${a.lesson.endTime}` : ''
      return `${subject}${time ? `(${time})` : ''}·${ATT_LABEL[a.status] || a.status}`
    })
    lines.push(`【今日考勤】${parts.join('；')}`)
  }

  // 2) 今日教师反馈（已发布；按反馈创建时间或所属课时日期）
  const feedbacks = await prisma.classroomFeedback.findMany({
    where: {
      studentIds: { has: studentId },
      status: 'PUBLISHED',
      deletedAt: null,
      createdAt: { gte: todayStart, lt: todayEnd },
    },
    include: {
      teacher: { select: { name: true } },
      classLesson: { select: { subject: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  if (feedbacks.length > 0) {
    const brief = feedbacks.map((f) => {
      const who = f.teacher?.name || (f.classLesson?.subject ? `${f.classLesson.subject}老师` : '老师')
      // Reuse the exact parent-visible content projection. lessonContent and
      // summary can contain internal mastery notes or details about siblings.
      const text = getParentFeedbackDisplaySections({
        lessonContent: f.lessonContent,
        overallComment: f.overallComment,
        summary: f.summary,
        knowledgePoints: f.knowledgePoints,
        homework: f.homework,
        tags: f.tags,
        studentRating: feedbackRatingForStudent(f.studentRatings, studentId),
        studentName,
      }).map((section) => section.content).join(' ').replace(/\s+/g, ' ').trim()
      const excerpt = text.length > 26 ? `${text.slice(0, 26)}…` : text
      return `${who}：${excerpt || '已提交反馈'}`
    })
    lines.push(`【教师反馈】${feedbacks.length} 条。${brief.join('；')}`)
  }

  // 3) 今日系统通知（管理员/教师发送）
  const sentToday = await prisma.notification.count({
    where: {
      studentId,
      senderId: { not: null },
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  })
  if (sentToday > 0) {
    lines.push(`【今日通知】${sentToday} 条，请查看详情。`)
  }

  if (lines.length === 0) {
    lines.push(`今天没有新的课堂记录，点击查看 ${studentName} 的学习档案。`)
  }

  const desc = `${studentName} 今日学习汇总：\n${lines.join('\n')}`.slice(0, 500)
  const url = new URL(`/parent/dashboard?childId=${encodeURIComponent(studentId)}`, getConfiguredPublicOrigin()).toString()
  return { title: `牧哲学堂 · ${studentName} 今日学习动态`, desc, url }
}

/** Build a parent-safe card from one published feedback record for one parent. */
export async function buildFeedbackDigest(
  prisma: PrismaClient,
  feedbackId: string,
  parentUserId: string,
): Promise<FeedbackDigestCard | null> {
  const feedback = await prisma.classroomFeedback.findFirst({
    where: { id: feedbackId, status: 'PUBLISHED', deletedAt: null },
    select: {
      id: true,
      studentIds: true,
    },
  })
  if (!feedback) return null

  const students = await prisma.student.findMany({
    where: { id: { in: feedback.studentIds }, ...parentLinkedStudentWhere(parentUserId) },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  if (!students.length) return null

  const query = students.length === 1 ? `?childId=${encodeURIComponent(students[0].id)}` : ''
  const url = new URL(`/parent/class-feedback/${feedback.id}${query}`, getConfiguredPublicOrigin()).toString()
  return {
    title: '课上状态反馈',
    desc: '教师已更新课上状态反馈，请点击卡片查看详情。',
    url,
    picUrl: defaultDigestImageUrl(),
    feedbackIds: [feedback.id],
    studentIds: students.map((student) => student.id),
    studentNames: students.map((student) => student.name),
  }
}

/** Combine the parent's published feedback records from one local day into one link card. */
export async function buildParentDailyFeedbackDigest(
  prisma: PrismaClient,
  parentUserId: string,
  date = todayLocal(),
): Promise<FeedbackDigestCard | null> {
  const students = await prisma.student.findMany({
    where: parentLinkedStudentWhere(parentUserId),
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  if (!students.length) return null

  const { start, end } = getLocalDayRange(date)
  const studentIds = students.map((student) => student.id)
  const feedbacks = await prisma.classroomFeedback.findMany({
    where: {
      studentIds: { hasSome: studentIds },
      status: 'PUBLISHED',
      deletedAt: null,
      createdAt: { gte: start, lt: end },
    },
    select: {
      id: true,
      studentIds: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  if (!feedbacks.length) return null

  const latest = feedbacks[0]
  const latestStudents = students.filter((student) => latest.studentIds.includes(student.id))
  const query = latestStudents.length === 1 ? `?childId=${encodeURIComponent(latestStudents[0].id)}` : ''
  const url = new URL(`/parent/class-feedback/${latest.id}${query}`, getConfiguredPublicOrigin()).toString()
  const feedbackStudentIds = [...new Set(feedbacks.flatMap((feedback) => feedback.studentIds)
    .filter((studentId) => students.some((student) => student.id === studentId)))]
  const feedbackStudents = students.filter((student) => feedbackStudentIds.includes(student.id))
  return {
    title: '课上状态反馈',
    desc: '教师已更新课上状态反馈，请点击卡片查看详情。',
    url,
    picUrl: defaultDigestImageUrl(),
    feedbackIds: feedbacks.map((feedback) => feedback.id),
    studentIds: feedbackStudents.map((student) => student.id),
    studentNames: feedbackStudents.map((student) => student.name),
  }
}

/** Build the single daily card from this parent's pending WeCom notifications and feedback. */
export async function buildParentDailyDigest(
  prisma: PrismaClient,
  parentUserId: string,
  date: string,
  pendingTeacherActionCount = 0,
): Promise<DailyDigestCard | null> {
  const { start, end } = getLocalDayRange(date)
  const pendingNotifications = await prisma.notification.findMany({
    where: {
      userId: parentUserId,
      status: 'ACTIVE',
      deletedAt: null,
      pushStatus: 'processing',
      qywxProcessingAt: { not: null },
    },
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      href: true,
      link: true,
      studentId: true,
      relatedType: true,
      relatedId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const linkedStudents = await prisma.student.findMany({
    where: parentLinkedStudentWhere(parentUserId),
    select: { id: true, name: true },
  })
  const linkedStudentIds = linkedStudents.map((student) => student.id)
  const attendanceRecords = linkedStudentIds.length
    ? await prisma.attendance.findMany({
      where: {
        studentId: { in: linkedStudentIds },
        deletedAt: null,
        lesson: {
          is: {
            lessonDate: { gte: start, lt: end },
            deletedAt: null,
            status: { notIn: ['CANCELLED', 'POSTPONED'] },
          },
        },
      },
      select: {
        studentId: true,
        status: true,
        lesson: { select: { subject: true, startTime: true, endTime: true, lessonDate: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    : []
  const studentNameById = new Map(linkedStudents.map((student) => [student.id, student.name]))
  const attendanceDetails = attendanceRecords
    .slice()
    .sort((a, b) => {
      const dateDifference = (a.lesson?.lessonDate.getTime() ?? 0) - (b.lesson?.lessonDate.getTime() ?? 0)
      return dateDifference || (a.lesson?.startTime ?? '').localeCompare(b.lesson?.startTime ?? '')
    })
    .map((attendance) => {
      const studentName = studentNameById.get(attendance.studentId) || '学员'
      const subject = attendance.lesson?.subject || '课程'
      const time = attendance.lesson ? `${attendance.lesson.startTime}-${attendance.lesson.endTime}` : ''
      const status = ATT_LABEL[attendance.status] || attendance.status
      return `${studentName} ${subject}${time ? `(${time})` : ''}·${status}`
    })
  const attendanceLine = attendanceDetails.length
    ? `【今日上课】${attendanceDetails.slice(0, 8).join('；')}${attendanceDetails.length > 8 ? `；另有 ${attendanceDetails.length - 8} 节详见家长端` : ''}`
    : ''
  const currentDayFeedback = linkedStudentIds.length
    ? await buildParentDailyFeedbackDigest(prisma, parentUserId, date)
    : null
  const currentDayFeedbackIds = new Set(linkedStudentIds.length
    ? (await prisma.classroomFeedback.findMany({
      where: {
        studentIds: { hasSome: linkedStudentIds },
        status: 'PUBLISHED',
        deletedAt: null,
        createdAt: { gte: start, lt: end },
      },
      select: { id: true },
    })).map((feedback) => feedback.id)
    : [])

  const notificationFeedbackStudentIds = [...new Set(pendingNotifications
    .filter((notification) => notification.type === 'wxpusher_feedback' && notification.studentId)
    .map((notification) => notification.studentId as string)
    .filter((studentId) => linkedStudentIds.includes(studentId))) ]
  const legacyFeedbackRefs = notificationFeedbackStudentIds.length
    ? await prisma.classroomFeedback.findMany({
        where: {
          studentIds: { hasSome: notificationFeedbackStudentIds },
          status: 'PUBLISHED',
          deletedAt: null,
        },
        select: { id: true, studentIds: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    : []
  const coveredLegacyFeedbackStudents = new Set<string>()
  const latestLegacyFeedbackIds: string[] = []
  for (const feedback of legacyFeedbackRefs) {
    const matchingStudents = feedback.studentIds.filter((studentId) =>
      notificationFeedbackStudentIds.includes(studentId) && !coveredLegacyFeedbackStudents.has(studentId))
    if (!matchingStudents.length) continue
    latestLegacyFeedbackIds.push(feedback.id)
    matchingStudents.forEach((studentId) => coveredLegacyFeedbackStudents.add(studentId))
  }

  const olderFeedbackIds = [...new Set([
    ...pendingNotifications
    .filter((notification) => notification.relatedType === 'CLASSROOM_FEEDBACK' && notification.relatedId)
    .filter((notification) => !currentDayFeedbackIds.has(notification.relatedId!))
    .map((notification) => notification.relatedId as string),
    ...latestLegacyFeedbackIds.filter((feedbackId) => !currentDayFeedbackIds.has(feedbackId)),
  ])]
  const olderFeedbackDigests = (await Promise.all(
    olderFeedbackIds.slice(0, 10).map((feedbackId) => buildFeedbackDigest(prisma, feedbackId, parentUserId)),
  )).filter((digest): digest is NonNullable<typeof digest> => Boolean(digest))

  const feedbackCards = [currentDayFeedback, ...olderFeedbackDigests]
    .filter((card): card is FeedbackDigestCard => Boolean(card))
  if (feedbackCards.length > 0 || notificationFeedbackStudentIds.length > 0) {
    const feedbackStudentIds = [...new Set([
      ...feedbackCards.flatMap((card) => card.studentIds),
      ...notificationFeedbackStudentIds,
    ])]
    const feedbackStudents = linkedStudents.filter((student) => feedbackStudentIds.includes(student.id))
    const names = [...new Set(feedbackStudents.map((student) => student.name))]
    const studentLabel = names.length === 1
      ? `${names[0]}同学`
      : names.length > 1
        ? `${names.slice(0, 2).join('、')}${names.length > 2 ? `等${names.length}名` : ''}同学`
        : '学员'
    const feedbackIds = [...new Set(feedbackCards.flatMap((card) => card.feedbackIds))]
    const oneFeedbackCard = feedbackCards.find((card) => card.feedbackIds.length === 1)
    const hasOtherUpdates = attendanceDetails.length > 0
      || pendingTeacherActionCount > 0
      || pendingNotifications.some((notification) =>
        notification.type !== 'wxpusher_feedback' && notification.relatedType !== 'CLASSROOM_FEEDBACK')
    const dashboardPath = linkedStudentIds.length === 1
      ? `/parent/dashboard?childId=${encodeURIComponent(linkedStudentIds[0])}`
      : '/parent/dashboard'
    const feedbackUrl = feedbackIds.length === 1 && oneFeedbackCard && !hasOtherUpdates
      ? oneFeedbackCard.url
      : new URL(dashboardPath, getConfiguredPublicOrigin()).toString()
    return {
      title: `${date} · ${studentLabel}课上状态反馈，请点击查看`,
      desc: '教师已更新课上状态反馈，请点击卡片查看详情。',
      url: feedbackUrl,
      picUrl: defaultDigestImageUrl(),
    }
  }

  const feedbackLines = [currentDayFeedback?.desc, ...olderFeedbackDigests.map((digest) => digest.desc)]
    .filter((value): value is string => Boolean(value))
  const otherNotifications = pendingNotifications.filter((notification) => {
    if (notification.type === 'wxpusher_feedback'
      && notification.studentId
      && coveredLegacyFeedbackStudents.has(notification.studentId)) return false
    if (notification.relatedType !== 'CLASSROOM_FEEDBACK') return true
    // Published feedback details are already included above. Preserve standalone
    // feedback conversation/review notifications, which use other related types.
    return !/发布了|同学的课堂反馈/.test(notification.title)
  })
  const notificationLines = otherNotifications.map((notification) => {
    const content = notification.content?.replace(/\s+/g, ' ').trim()
    return `【家校消息】${notification.title}${content ? `：${content}` : ''}`
  })

  if (!attendanceLine && feedbackLines.length === 0 && notificationLines.length === 0 && pendingTeacherActionCount === 0) return null

  const lines = [`【${date} 牧哲学堂学习与家校简报】`, attendanceLine, ...feedbackLines, ...notificationLines].filter(Boolean)
  const pendingLine = pendingTeacherActionCount > 0
    ? `还有 ${pendingTeacherActionCount} 项课堂记录（考勤/反馈）待老师补充，更新后可在家长端查看。`
    : ''
  const boundedPendingLine = pendingLine ? truncateUtf8Bytes(pendingLine, 200) : ''
  const pendingFooter = boundedPendingLine ? `\n${boundedPendingLine}` : ''
  const bodyLimit = Math.max(0, 500 - utf8ByteLength(pendingFooter))
  const body = truncateUtf8Bytes(lines.join('\n'), bodyLimit)
  const desc = `${body}${pendingFooter}`

  const parentDashboardPath = linkedStudentIds.length === 1
    ? `/parent/dashboard?childId=${encodeURIComponent(linkedStudentIds[0])}`
    : '/parent/dashboard'
  const url = new URL(parentDashboardPath, getConfiguredPublicOrigin()).toString()

  return {
    title: `${date} · 牧哲学堂家校简报`,
    desc,
    url,
    picUrl: defaultDigestImageUrl(),
  }
}
