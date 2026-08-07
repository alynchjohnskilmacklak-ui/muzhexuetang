import type { PrismaClient } from '@prisma/client'
import {
  canViewFeedback,
  filterStudentRatingsForStudents,
  getParentFeedbackStudentIds,
  type FeedbackAccessActor,
} from './access'
import { resolveFeedbackImageVariants, variantsForFeedback } from '@/lib/file-asset-variants'

export interface FeedbackArchiveQuery {
  studentId: string
  startDate?: Date
  endDate?: Date
  subject?: string
  teacherId?: string
  page?: number
  pageSize?: number
  includeImages?: boolean
}

export interface FeedbackArchiveActor extends FeedbackAccessActor {
  division?: string
}

export type FeedbackArchiveImage = {
  assetId: string | null
  thumbnailUrl: string
  previewUrl: string
}

export type FeedbackArchiveItem = {
  id: string
  date: string
  teacher: { id: string; name: string }
  subject: string
  course: string | null
  className: string | null
  lessonContent: string | null
  overallComment: string | null
  summary: string | null
  knowledgePoints: string[]
  homework: unknown
  tags: string[]
  badge: string | null
  studentRating: unknown
  images: FeedbackArchiveImage[]
  parentReply: string | null
  replyTime: string | null
  teacherReply: string | null
  teacherReplyTime: string | null
  createdAt: string
}

export type FeedbackArchiveResult = {
  student: { id: string; name: string; grade: string | null }
  summary: {
    totalCount: number
    subjectCount: number
    teacherCount: number
    firstFeedbackDate: string | null
    latestFeedbackDate: string | null
  }
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  items: FeedbackArchiveItem[]
}

export type FeedbackArchiveDetail = FeedbackArchiveItem & {
  students: Array<{ id: string; name: string; grade: string | null; studentRating: unknown }>
  lesson: { id: string; date: string; startTime: string; endTime: string } | null
  mood: string | null
  status: string
  adminReply: string | null
  parentMessages: Array<{
    id: string
    title: string
    status: string
    createdAt: string
    replies: Array<{
      id: string
      authorName: string
      role: string
      content: string
      createdAt: string
    }>
  }>
  images: Array<FeedbackArchiveImage & { originalUrl: string }>
}

export class FeedbackArchiveAccessError extends Error {
  status: number

  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

type GroupContext = {
  id: string
  name: string
  course: { name: string; subject: string | null } | null
  teacherAssignments: Array<{ teacherId: string; subject: string | null }>
}

type FeedbackContextSource = {
  teacherId: string
  createdAt: Date
  feedbackGroupId: string | null
  classLesson: {
    id?: string
    teacherId: string | null
    subject: string | null
    lessonDate: Date
    startTime?: string
    endTime?: string
    group: GroupContext
  } | null
}

function clampPositiveInteger(value: number | undefined, fallback: number, maximum: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(maximum, Math.max(1, Math.trunc(value as number)))
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || null
}

function resolveContext(source: FeedbackContextSource, groupMap: Map<string, GroupContext>) {
  const group = source.classLesson?.group
    ?? (source.feedbackGroupId ? groupMap.get(source.feedbackGroupId) : undefined)
  const assignedSubject = group?.teacherAssignments.find(
    (assignment) => assignment.teacherId === source.teacherId && normalizeText(assignment.subject),
  )?.subject
  const subject = normalizeText(source.classLesson?.subject)
    ?? normalizeText(assignedSubject)
    ?? normalizeText(group?.course?.subject)
    ?? '未设置'

  return {
    date: source.classLesson?.lessonDate ?? source.createdAt,
    subject,
    course: normalizeText(group?.course?.name),
    className: normalizeText(group?.name),
  }
}

function dateInRange(value: Date, startDate?: Date, endDate?: Date) {
  if (startDate && value < startDate) return false
  if (endDate && value > endDate) return false
  return true
}

function matchesSubject(actual: string, requested?: string) {
  const filter = requested?.trim().toLocaleLowerCase('zh-CN')
  if (!filter) return true
  return actual.toLocaleLowerCase('zh-CN').includes(filter)
}

function extractStudentRating(value: unknown, studentId: string) {
  const filtered = filterStudentRatingsForStudents(value, [studentId])
  if (Array.isArray(filtered)) {
    const row = filtered[0]
    if (row && typeof row === 'object' && 'rating' in row) return row.rating
    return row ?? null
  }
  if (filtered && typeof filtered === 'object') {
    return (filtered as Record<string, unknown>)[studentId] ?? null
  }
  return null
}

type CommunicationReply = { role: string; content: string; createdAt: Date }

function resolveCommunication(
  legacyParentReply: string | null,
  legacyParentRepliedAt: Date | null,
  messages: Array<{ replies: CommunicationReply[] }>,
) {
  const replies = messages.flatMap((message) => message.replies)
  const parentReply = replies.filter((reply) => reply.role.toLowerCase() === 'parent').at(-1)
  const teacherReply = replies.filter((reply) => reply.role.toLowerCase() === 'teacher').at(-1)
  return {
    parentReply: parentReply?.content || legacyParentReply,
    replyTime: (parentReply?.createdAt || legacyParentRepliedAt)?.toISOString() || null,
    teacherReply: teacherReply?.content || null,
    teacherReplyTime: teacherReply?.createdAt.toISOString() || null,
  }
}

async function loadGroupMap(prisma: PrismaClient, groupIds: string[]) {
  if (!groupIds.length) return new Map<string, GroupContext>()
  const groups = await prisma.classGroup.findMany({
    where: { id: { in: [...new Set(groupIds)] } },
    select: {
      id: true,
      name: true,
      course: { select: { name: true, subject: true } },
      teacherAssignments: { select: { teacherId: true, subject: true } },
    },
  })
  return new Map(groups.map((group) => [group.id, group]))
}

async function authorizeStudent(
  prisma: PrismaClient,
  actor: FeedbackArchiveActor,
  studentId: string,
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, grade: true, division: true },
  })
  if (!student) throw new FeedbackArchiveAccessError('学生不存在', 404)

  if (actor.role === 'admin') {
    if (actor.division && student.division !== actor.division) {
      throw new FeedbackArchiveAccessError('无权查看其他学部学生')
    }
    return { student, parentStudentIds: [] as string[] }
  }

  if (actor.role === 'parent') {
    const parentStudentIds = await getParentFeedbackStudentIds(prisma, actor.id)
    if (!parentStudentIds.includes(studentId)) {
      throw new FeedbackArchiveAccessError('无权查看该学生反馈')
    }
    return { student, parentStudentIds }
  }

  if (actor.role === 'teacher' && actor.teacherId) {
    const ownFeedback = await prisma.classroomFeedback.findFirst({
      where: { teacherId: actor.teacherId, studentIds: { has: studentId } },
      select: { id: true },
    })
    if (!ownFeedback) throw new FeedbackArchiveAccessError('无权查看该学生反馈')
    return { student, parentStudentIds: [] as string[] }
  }

  throw new FeedbackArchiveAccessError('无权查看反馈档案')
}

const contextSelect = {
  id: true,
  teacherId: true,
  feedbackGroupId: true,
  createdAt: true,
  classLesson: {
    select: {
      teacherId: true,
      subject: true,
      lessonDate: true,
      group: {
        select: {
          id: true,
          name: true,
          course: { select: { name: true, subject: true } },
          teacherAssignments: { select: { teacherId: true, subject: true } },
        },
      },
    },
  },
} as const

export async function getFeedbackArchive(
  prisma: PrismaClient,
  actor: FeedbackArchiveActor,
  query: FeedbackArchiveQuery,
): Promise<FeedbackArchiveResult> {
  const page = clampPositiveInteger(query.page, 1, Number.MAX_SAFE_INTEGER)
  const pageSize = clampPositiveInteger(query.pageSize, 20, 100)
  const { student, parentStudentIds } = await authorizeStudent(prisma, actor, query.studentId)
  const actorTeacherId = actor.role === 'teacher' ? actor.teacherId || undefined : undefined
  const teacherFilterDenied = Boolean(actorTeacherId && query.teacherId && query.teacherId !== actorTeacherId)
  const effectiveTeacherId = actorTeacherId ?? query.teacherId

  const metadata = teacherFilterDenied ? [] : await prisma.classroomFeedback.findMany({
    where: {
      status: 'PUBLISHED',
      studentIds: { has: query.studentId },
      ...(effectiveTeacherId ? { teacherId: effectiveTeacherId } : {}),
    },
    select: contextSelect,
  })
  const groupMap = await loadGroupMap(
    prisma,
    metadata.flatMap((feedback) => feedback.feedbackGroupId ? [feedback.feedbackGroupId] : []),
  )

  const authorized = metadata
    .filter((feedback) => canViewFeedback(actor, {
      teacherId: feedback.teacherId,
      status: 'PUBLISHED',
      studentIds: [query.studentId],
      classLesson: feedback.classLesson ? { teacherId: feedback.classLesson.teacherId } : null,
    }, parentStudentIds))
    .map((feedback) => ({ feedback, context: resolveContext(feedback, groupMap) }))
    .filter(({ context }) => dateInRange(context.date, query.startDate, query.endDate))
    .filter(({ context }) => matchesSubject(context.subject, query.subject))
    .sort((left, right) => right.context.date.getTime() - left.context.date.getTime())

  const totalCount = authorized.length
  const pageRows = authorized.slice((page - 1) * pageSize, page * pageSize)
  const pageIds = pageRows.map(({ feedback }) => feedback.id)
  const records = pageIds.length ? await prisma.classroomFeedback.findMany({
    where: { id: { in: pageIds } },
    select: {
      id: true,
      teacherId: true,
      feedbackGroupId: true,
      studentIds: true,
      overallComment: true,
      lessonContent: true,
      summary: true,
      knowledgePoints: true,
      homework: true,
      tags: true,
      badge: true,
      studentRatings: true,
      imageUrls: true,
      parentReply: true,
      parentRepliedAt: true,
      createdAt: true,
      status: true,
      teacher: { select: { id: true, name: true } },
      classLesson: contextSelect.classLesson,
      parentMessages: {
        where: { studentId: query.studentId },
        select: {
          replies: {
            orderBy: { createdAt: 'asc' },
            select: { role: true, content: true, createdAt: true },
          },
        },
      },
    },
  }) : []
  const recordMap = new Map(records.map((record) => [record.id, record]))
  const includeImages = query.includeImages !== false
  const imageKeys = includeImages ? records.flatMap((record) => record.imageUrls) : []
  const imageVariantMap = includeImages
    ? await resolveFeedbackImageVariants(prisma, imageKeys)
    : new Map()

  const items = pageRows.flatMap(({ feedback: metadataRow, context }): FeedbackArchiveItem[] => {
    const record = recordMap.get(metadataRow.id)
    if (!record) return []
    const images = (includeImages ? variantsForFeedback(record.imageUrls, imageVariantMap) : []).map((image) => ({
      assetId: image.assetId,
      thumbnailUrl: image.thumbnailUrl,
      previewUrl: image.previewUrl,
    }))
    const communication = resolveCommunication(record.parentReply, record.parentRepliedAt, record.parentMessages)
    return [{
      id: record.id,
      date: context.date.toISOString(),
      teacher: record.teacher,
      subject: context.subject,
      course: context.course,
      className: context.className,
      overallComment: record.overallComment,
      lessonContent: record.lessonContent,
      summary: record.summary,
      knowledgePoints: record.knowledgePoints,
      homework: record.homework,
      tags: record.tags,
      badge: record.badge,
      studentRating: extractStudentRating(record.studentRatings, query.studentId),
      images,
      ...communication,
      createdAt: record.createdAt.toISOString(),
    }]
  })

  const dates = authorized.map(({ context }) => context.date.getTime())
  return {
    student: { id: student.id, name: student.name, grade: student.grade },
    summary: {
      totalCount,
      subjectCount: new Set(authorized.map(({ context }) => context.subject)).size,
      teacherCount: new Set(authorized.map(({ feedback }) => feedback.teacherId)).size,
      firstFeedbackDate: dates.length ? new Date(Math.min(...dates)).toISOString() : null,
      latestFeedbackDate: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
    },
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
    items,
  }
}

/**
 * Export helper: consume the archive's bounded pagination sequentially so large
 * histories never bypass the service or request unbounded image data at once.
 */
export async function getCompleteFeedbackArchive(
  prisma: PrismaClient,
  actor: FeedbackArchiveActor,
  query: Omit<FeedbackArchiveQuery, 'page' | 'pageSize'>,
): Promise<FeedbackArchiveResult> {
  const firstPage = await getFeedbackArchive(prisma, actor, { ...query, page: 1, pageSize: 100 })
  const items = [...firstPage.items]
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const nextPage = await getFeedbackArchive(prisma, actor, { ...query, page, pageSize: 100 })
    items.push(...nextPage.items)
  }
  return {
    ...firstPage,
    pagination: { ...firstPage.pagination, page: 1 },
    items,
  }
}

export async function getFeedbackArchiveDetail(
  prisma: PrismaClient,
  actor: FeedbackArchiveActor,
  feedbackId: string,
): Promise<FeedbackArchiveDetail> {
  const feedback = await prisma.classroomFeedback.findUnique({
    where: { id: feedbackId },
    select: {
      id: true,
      teacherId: true,
      feedbackGroupId: true,
      studentIds: true,
      overallComment: true,
      lessonContent: true,
      summary: true,
      knowledgePoints: true,
      homework: true,
      tags: true,
      badge: true,
      mood: true,
      studentRatings: true,
      imageUrls: true,
      parentReply: true,
      parentRepliedAt: true,
      adminReply: true,
      status: true,
      createdAt: true,
      teacher: { select: { id: true, name: true } },
      classLesson: {
        select: {
          id: true,
          teacherId: true,
          subject: true,
          lessonDate: true,
          startTime: true,
          endTime: true,
          group: {
            select: {
              id: true,
              name: true,
              course: { select: { name: true, subject: true } },
              teacherAssignments: { select: { teacherId: true, subject: true } },
            },
          },
        },
      },
      parentMessages: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          replies: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, authorName: true, role: true, content: true, createdAt: true },
          },
        },
      },
    },
  })
  if (!feedback) throw new FeedbackArchiveAccessError('反馈不存在', 404)

  const parentStudentIds = actor.role === 'parent'
    ? await getParentFeedbackStudentIds(prisma, actor.id)
    : []
  if (!canViewFeedback(actor, feedback, parentStudentIds)) {
    throw new FeedbackArchiveAccessError('无权查看该反馈')
  }
  if (actor.role === 'teacher' && feedback.teacherId !== actor.teacherId) {
    throw new FeedbackArchiveAccessError('无权查看其他教师反馈')
  }

  const groupMap = await loadGroupMap(prisma, feedback.feedbackGroupId ? [feedback.feedbackGroupId] : [])
  const context = resolveContext(feedback, groupMap)
  const students = await prisma.student.findMany({
    where: { id: { in: feedback.studentIds } },
    select: { id: true, name: true, grade: true },
  })
  const imageVariantMap = await resolveFeedbackImageVariants(prisma, feedback.imageUrls)
  const images = variantsForFeedback(feedback.imageUrls, imageVariantMap)
  const communication = resolveCommunication(feedback.parentReply, feedback.parentRepliedAt, feedback.parentMessages)

  return {
    id: feedback.id,
    date: context.date.toISOString(),
    teacher: feedback.teacher,
    subject: context.subject,
    course: context.course,
    className: context.className,
    overallComment: feedback.overallComment,
    lessonContent: feedback.lessonContent,
    summary: feedback.summary,
    knowledgePoints: feedback.knowledgePoints,
    homework: feedback.homework,
    tags: feedback.tags,
    badge: feedback.badge,
    studentRating: null,
    students: students.map((student) => ({
      ...student,
      studentRating: extractStudentRating(feedback.studentRatings, student.id),
    })),
    images: images.map((image) => ({
      assetId: image.assetId,
      thumbnailUrl: image.thumbnailUrl,
      previewUrl: image.previewUrl,
      originalUrl: image.originalUrl,
    })),
    ...communication,
    adminReply: feedback.adminReply,
    mood: feedback.mood,
    status: feedback.status,
    lesson: feedback.classLesson ? {
      id: feedback.classLesson.id,
      date: feedback.classLesson.lessonDate.toISOString(),
      startTime: feedback.classLesson.startTime,
      endTime: feedback.classLesson.endTime,
    } : null,
    parentMessages: feedback.parentMessages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
      replies: message.replies.map((reply) => ({ ...reply, createdAt: reply.createdAt.toISOString() })),
    })),
    createdAt: feedback.createdAt.toISOString(),
  }
}
