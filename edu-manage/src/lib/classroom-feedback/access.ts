import type { PrismaClient } from '@prisma/client'
import { extractUploadStorageKey } from '@/lib/upload-url'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'

export type FeedbackAccessActor = {
  id: string
  role: string
  teacherId?: string | null
}

export type FeedbackAccessRecord = {
  teacherId: string
  status?: string | null
  studentIds: string[]
  classLesson?: { teacherId?: string | null } | null
}

export type FeedbackContentInput = {
  lessonContent?: unknown
  overallComment?: unknown
  summary?: unknown
  knowledgePoints?: unknown
  homework?: unknown
  studentRatings?: unknown
  badge?: unknown
  tags?: unknown
}

export const LESSON_CONTENT_MIN_LENGTH = 10
export const LESSON_CONTENT_MAX_LENGTH = 500

export function normalizeLessonContent(value: unknown) {
  return nonEmptyText(value).slice(0, LESSON_CONTENT_MAX_LENGTH)
}

export function hasRequiredLessonContent(value: unknown) {
  return normalizeLessonContent(value).replace(/\s+/g, '').length >= LESSON_CONTENT_MIN_LENGTH
}

type FeedbackCreationScopeInput = {
  teacherId: string
  classLessonId?: string | null
  feedbackGroupId?: string | null
  requestedStudentIds: string[]
  expandClassTarget?: boolean
  submittedCourseType?: 'GROUP' | 'ONE_ON_ONE'
  requestedSubject?: string | null
}

type ScopedStudent = {
  id: string
  name: string
  parentId: string | null
  parentUserId: string | null
}

export type FeedbackCreationScope = {
  allowed: boolean
  reason?: 'lesson' | 'group' | 'student'
  students: ScopedStudent[]
  feedbackGroupId: string | null
  feedbackCourseType: 'GROUP' | 'ONE_ON_ONE'
  termId: string | null
}

type FeedbackImageAccessResult = {
  allowed: boolean
  reason: 'admin' | 'feedback' | 'study-hall' | 'unattached-owner' | 'legacy-non-feedback' | 'forbidden'
}

function normalizeRole(role: string | null | undefined) {
  return String(role || '').toLowerCase()
}

function nonEmptyText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function meaningfulArray(value: unknown) {
  return Array.isArray(value) && value.some((item) => {
    if (typeof item === 'string') return item.trim().length > 0
    if (!item || typeof item !== 'object') return false
    return Object.values(item as Record<string, unknown>).some((entry) => nonEmptyText(entry).length > 0)
  })
}

function ratingText(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const rows = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>)
  return rows.flatMap((row) => {
    if (typeof row === 'string') return [row]
    if (!row || typeof row !== 'object') return []
    const record = row as Record<string, unknown>
    return [record.rating, record.teacherRemark, record.masteryLevel]
      .map(nonEmptyText)
      .filter(Boolean)
  }).join('')
}

/**
 * Published feedback must contain either two independent signals or at least
 * 20 characters of substantive text. Images are deliberately optional.
 */
export function hasMeaningfulFeedbackContent(input: FeedbackContentInput) {
  const lessonContent = normalizeLessonContent(input.lessonContent)
  const overallComment = nonEmptyText(input.overallComment)
  const summary = nonEmptyText(input.summary)
  const knowledgePoints = Array.isArray(input.knowledgePoints)
    ? input.knowledgePoints.map(nonEmptyText).filter(Boolean)
    : []
  const homework = Array.isArray(input.homework) ? input.homework : []
  const studentRatingText = ratingText(input.studentRatings)
  const badge = nonEmptyText(input.badge)
  const tags = Array.isArray(input.tags) ? input.tags.map(nonEmptyText).filter(Boolean) : []

  const signals = [
    lessonContent.length > 0,
    overallComment.length > 0,
    summary.length > 0,
    knowledgePoints.length > 0,
    meaningfulArray(homework),
    studentRatingText.length > 0,
    badge.length > 0 || tags.length > 0,
  ].filter(Boolean).length

  const textLength = [
    lessonContent,
    overallComment,
    summary,
    knowledgePoints.join(''),
    homework.map((item) => {
      if (typeof item === 'string') return item
      if (!item || typeof item !== 'object') return ''
      return Object.values(item as Record<string, unknown>).map(nonEmptyText).join('')
    }).join(''),
    studentRatingText,
    badge,
    tags.join(''),
  ].join('').replace(/\s+/g, '').length

  return signals >= 2 || textLength >= 20
}

export function parseFeedbackCourseType(value: unknown): 'GROUP' | 'ONE_ON_ONE' | null {
  if (value === undefined || value === null || value === '') return 'GROUP'
  if (value === 'GROUP' || value === 'ONE_ON_ONE') return value
  return null
}

export function canViewFeedback(
  actor: FeedbackAccessActor,
  feedback: FeedbackAccessRecord,
  parentStudentIds: string[] = [],
) {
  const role = normalizeRole(actor.role)
  if (role === 'admin') return true
  if (role === 'teacher') {
    return Boolean(actor.teacherId) && (
      feedback.teacherId === actor.teacherId || feedback.classLesson?.teacherId === actor.teacherId
    )
  }
  if (role === 'parent') {
    const allowed = new Set(parentStudentIds)
    return feedback.status === 'PUBLISHED' && feedback.studentIds.some((studentId) => allowed.has(studentId))
  }
  return false
}

export function canCreateFeedback(requestedStudentIds: string[], allowedStudentIds: string[]) {
  if (!requestedStudentIds.length) return false
  const allowed = new Set(allowedStudentIds)
  return new Set(requestedStudentIds).size === requestedStudentIds.length
    && requestedStudentIds.every((studentId) => allowed.has(studentId))
}

export async function getParentFeedbackStudentIds(
  prisma: PrismaClient,
  parentId: string,
) {
  const students = await prisma.student.findMany({
    where: {
      OR: [{ parentId }, { parentUserId: parentId }],
      status: { not: 'INACTIVE' },
    },
    select: { id: true },
  })
  return students.map((student) => student.id)
}

/** Resolve and validate all teacher-controlled relationship fields server-side. */
export async function resolveTeacherFeedbackCreationScope(
  prisma: PrismaClient,
  input: FeedbackCreationScopeInput,
): Promise<FeedbackCreationScope> {
  const studentSelect = { id: true, name: true, parentId: true, parentUserId: true } as const
  let allowedStudents: ScopedStudent[] = []
  let feedbackGroupId = input.feedbackGroupId || null
  let feedbackCourseType = input.submittedCourseType || 'GROUP'
  let termId: string | null = null
  let reason: FeedbackCreationScope['reason'] = 'student'

  if (input.classLessonId) {
    reason = 'lesson'
    const lesson = await prisma.classLesson.findFirst({
      where: {
        id: input.classLessonId,
        OR: [
          { teacherId: input.teacherId },
          { teacherId: null, group: { teacherId: input.teacherId } },
          { teacherId: null, group: { teacherAssignments: { some: { teacherId: input.teacherId } } } },
        ],
      },
      include: {
        group: {
          include: {
            course: { select: { type: true, subject: true } },
            enrollments: {
              where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
              include: { student: { select: studentSelect } },
            },
          },
        },
        lessonStudents: { include: { student: { select: studentSelect } } },
      },
    })
    if (!lesson) {
      return { allowed: false, reason, students: [], feedbackGroupId, feedbackCourseType, termId }
    }
    // 按学科报名：普通班课也优先用课次快照（lessonStudents），未报该学科的学生不出现；
    // 快照为空时才兜底用全班 ACTIVE 报名（兼容老数据）。
    const lessonSubject = lesson.subject || lesson.group.course.subject
    const eligibleEnrollments = lesson.group.enrollments
      .filter((row) => enrollmentIncludesSubject(row.subjects, lessonSubject))
    const eligibleStudentIds = new Set(eligibleEnrollments.map((row) => row.studentId))
    allowedStudents = lesson.lessonStudents.length
      ? lesson.lessonStudents
        .filter((row) => eligibleStudentIds.has(row.student.id))
        .map((row) => row.student)
      : eligibleEnrollments.map((row) => row.student)
    feedbackGroupId = lesson.groupId
    termId = lesson.group.termId
    feedbackCourseType = lesson.group.intensiveMode === 'INTENSIVE' || lesson.group.course.type === 'ONE_ON_ONE'
      ? 'ONE_ON_ONE'
      : 'GROUP'
  } else if (input.feedbackGroupId) {
    reason = 'group'
    const group = await prisma.classGroup.findFirst({
      where: {
        id: input.feedbackGroupId,
        status: { not: 'ARCHIVED' },
        OR: [
          { teacherId: input.teacherId },
          { teacherAssignments: { some: { teacherId: input.teacherId } } },
        ],
      },
      include: {
        course: { select: { type: true, subject: true } },
        teacherAssignments: { where: { teacherId: input.teacherId }, select: { subject: true } },
        enrollments: {
          where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
          include: { student: { select: studentSelect } },
        },
      },
    })
    if (!group) {
      return { allowed: false, reason, students: [], feedbackGroupId, feedbackCourseType, termId }
    }
    const teacherSubjects = group.teacherAssignments.map((assignment) => assignment.subject).filter((subject): subject is string => Boolean(subject))
    if (!teacherSubjects.length) teacherSubjects.push(group.course.subject)
    const requestedSubject = input.requestedSubject?.trim() || null
    const scopedSubject = requestedSubject || (teacherSubjects.length === 1 ? teacherSubjects[0] : null)
    if (!scopedSubject || !teacherSubjects.includes(scopedSubject)) {
      return { allowed: false, reason, students: [], feedbackGroupId, feedbackCourseType, termId }
    }
    allowedStudents = group.enrollments
      .filter((row) => enrollmentIncludesSubject(row.subjects, scopedSubject))
      .map((row) => row.student)
    termId = group.termId
    feedbackCourseType = group.intensiveMode === 'INTENSIVE' || group.course.type === 'ONE_ON_ONE'
      ? 'ONE_ON_ONE'
      : 'GROUP'
  } else if (input.requestedStudentIds.length) {
    allowedStudents = await prisma.student.findMany({
      where: {
        id: { in: input.requestedStudentIds },
        status: { not: 'INACTIVE' },
        enrollments: {
          some: {
            status: 'ACTIVE',
            group: {
              status: { not: 'ARCHIVED' },
              OR: [
                { teacherId: input.teacherId },
                { teacherAssignments: { some: { teacherId: input.teacherId } } },
              ],
            },
          },
        },
      },
      select: studentSelect,
    })
  }

  const requestedStudentIds = input.expandClassTarget
    ? allowedStudents.map((student) => student.id)
    : input.requestedStudentIds
  const allowed = canCreateFeedback(requestedStudentIds, allowedStudents.map((student) => student.id))
  const selected = allowed
    ? allowedStudents.filter((student) => requestedStudentIds.includes(student.id))
    : []

  if (allowed && !termId && selected.length > 0) {
    const activeGroup = await prisma.classGroup.findFirst({
      where: {
        term: { status: 'ACTIVE' },
        status: { not: 'ARCHIVED' },
        enrollments: { some: { status: 'ACTIVE', studentId: { in: selected.map((student) => student.id) } } },
        OR: [
          { teacherId: input.teacherId },
          { teacherAssignments: { some: { teacherId: input.teacherId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: { termId: true },
    })
    termId = activeGroup?.termId || null
  }

  return { allowed, reason, students: selected, feedbackGroupId, feedbackCourseType, termId }
}

export function filterStudentRatingsForStudents(value: unknown, studentIds: string[]) {
  const allowedStudentIds = new Set(studentIds)
  if (Array.isArray(value)) {
    return value.filter((row) => {
      if (!row || typeof row !== 'object') return false
      const studentId = (row as Record<string, unknown>).studentId
      return typeof studentId === 'string' && allowedStudentIds.has(studentId)
    })
  }
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  if (typeof record.studentId === 'string') {
    return allowedStudentIds.has(record.studentId) ? record : null
  }
  return Object.fromEntries(Object.entries(record).filter(([studentId]) => allowedStudentIds.has(studentId)))
}

/** Remove every other student's identifier and per-student rating before serialization. */
export function redactFeedbackForParent<
  T extends { studentIds: string[]; studentRatings?: unknown; students?: Array<{ id: string }> },
>(feedback: T, parentStudentIds: string[]) {
  const parentIds = new Set(parentStudentIds)
  const visibleStudentIds = feedback.studentIds.filter((studentId) => parentIds.has(studentId))
  const studentRatings = filterStudentRatingsForStudents(feedback.studentRatings, visibleStudentIds)
  const firstRating = Array.isArray(studentRatings)
    ? studentRatings[0] ?? null
    : visibleStudentIds.length && studentRatings && typeof studentRatings === 'object'
      ? (studentRatings as Record<string, unknown>)[visibleStudentIds[0]] ?? studentRatings
      : null

  return {
    ...feedback,
    studentIds: visibleStudentIds,
    studentId: visibleStudentIds[0] ?? null,
    studentRatings,
    studentRating: firstRating,
    ...(feedback.students
      ? { students: feedback.students.filter((student) => parentIds.has(student.id)) }
      : {}),
  }
}

function looksLikeFeedbackKey(value: string) {
  const key = extractUploadStorageKey(value)
  return /^(feedback|teacher-feedback)(?:-|\/)/i.test(key)
}

function imageIdentifierVariants(value: string) {
  const raw = value.trim()
  const key = extractUploadStorageKey(raw)
  return new Set([
    raw,
    key,
    key ? `/api/uploads/${key}` : '',
    key ? `/uploads/${key}` : '',
  ].filter(Boolean))
}

/**
 * Authorize a batch before signing or streaming. Non-feedback assets keep their
 * existing behavior; feedback assets are always checked against feedback scope.
 */
export async function canAccessFeedbackImage(
  prisma: PrismaClient,
  actor: FeedbackAccessActor,
  values: string[],
): Promise<Map<string, FeedbackImageAccessResult>> {
  const uniqueValues = [...new Set(values.map((value) => value?.trim()).filter(Boolean))]
  const results = new Map<string, FeedbackImageAccessResult>()
  if (!uniqueValues.length) return results
  if (normalizeRole(actor.role) === 'admin') {
    uniqueValues.forEach((value) => results.set(value, { allowed: true, reason: 'admin' }))
    return results
  }

  const searchableValues = [...new Set(uniqueValues.flatMap((value) => [...imageIdentifierVariants(value)]))]
  const assets = await prisma.fileAsset.findMany({
    where: {
      deletedAt: null,
      OR: [
        { storageKey: { in: searchableValues } },
        { url: { in: searchableValues } },
        { previewUrl: { in: searchableValues } },
        { thumbnailUrl: { in: searchableValues } },
      ],
    },
    select: {
      id: true,
      storageKey: true,
      url: true,
      previewUrl: true,
      thumbnailUrl: true,
      ownerType: true,
      feedbackId: true,
      uploadedById: true,
    },
  })

  const assetCandidates = new Map<string, Set<string>>()
  for (const value of uniqueValues) assetCandidates.set(value, imageIdentifierVariants(value))
  for (const asset of assets) {
    const assetValues = [asset.storageKey, asset.url, asset.previewUrl, asset.thumbnailUrl].filter((item): item is string => Boolean(item))
    const expandedAssetValues = new Set(assetValues.flatMap((item) => [...imageIdentifierVariants(item)]))
    for (const requested of uniqueValues) {
      const requestedValues = imageIdentifierVariants(requested)
      if ([...requestedValues].some((item) => expandedAssetValues.has(item))) {
        assetCandidates.set(requested, new Set([...expandedAssetValues, ...requestedValues]))
      }
    }
  }
  const allCandidates = [...new Set([...assetCandidates.values()].flatMap((set) => [...set]))]
  const feedbackIds = assets.map((asset) => asset.feedbackId).filter((id): id is string => Boolean(id))
  const feedbacks = await prisma.classroomFeedback.findMany({
    where: {
      OR: [
        ...(feedbackIds.length ? [{ id: { in: feedbackIds } }] : []),
        ...(allCandidates.length ? [{ imageUrls: { hasSome: allCandidates } }] : []),
      ],
    },
    select: {
      id: true,
      teacherId: true,
      status: true,
      studentIds: true,
      imageUrls: true,
      classLesson: { select: { teacherId: true } },
    },
  })
  // 晚托作业沿用教师反馈上传通道，但图片归属保存在作业登记中，
  // 并不会关联 ClassroomFeedback。这里从业务记录反查授权，既兼容
  // 已上传的历史图片，也避免把未关联的教师私有图片直接暴露给家长。
  const studyHallEntries = await prisma.studyHallHomeworkEntry.findMany({
    where: {
      OR: [
        { beforeImageUrls: { hasSome: allCandidates } },
        { afterImageUrls: { hasSome: allCandidates } },
        { lessonImageUrls: { hasSome: allCandidates } },
        { imageUrls: { hasSome: allCandidates } },
      ],
    },
    select: {
      studentId: true,
      beforeImageUrls: true,
      afterImageUrls: true,
      lessonImageUrls: true,
      imageUrls: true,
      classRecord: {
        select: {
          recordedById: true,
          studyClass: {
            select: {
              teachers: {
                where: { active: true },
                select: { teacherId: true },
              },
            },
          },
        },
      },
    },
  })
  const parentStudentIds = normalizeRole(actor.role) === 'parent'
    ? await getParentFeedbackStudentIds(prisma, actor.id)
    : []
  const parentStudentIdSet = new Set(parentStudentIds)
  const actorRole = normalizeRole(actor.role)

  for (const value of uniqueValues) {
    const candidates = assetCandidates.get(value) || imageIdentifierVariants(value)
    const matchingAssets = assets.filter((asset) => (
      [asset.storageKey, asset.url, asset.previewUrl, asset.thumbnailUrl]
        .filter((item): item is string => Boolean(item))
        .some((item) => [...imageIdentifierVariants(item)].some((candidate) => candidates.has(candidate)))
    ))
    const matchingFeedbacks = feedbacks.filter((feedback) => (
      matchingAssets.some((asset) => asset.feedbackId === feedback.id)
      || feedback.imageUrls.some((imageUrl) => candidates.has(imageUrl))
    ))
    if (matchingFeedbacks.some((feedback) => canViewFeedback(actor, feedback, parentStudentIds))) {
      results.set(value, { allowed: true, reason: 'feedback' })
      continue
    }

    const matchingStudyHallEntries = studyHallEntries.filter((entry) => (
      [
        ...entry.beforeImageUrls,
        ...entry.afterImageUrls,
        ...entry.lessonImageUrls,
        ...entry.imageUrls,
      ].some((imageUrl) => [...imageIdentifierVariants(imageUrl)].some((candidate) => candidates.has(candidate)))
    ))
    const canViewStudyHallImage = matchingStudyHallEntries.some((entry) => {
      if (actorRole === 'parent') return parentStudentIdSet.has(entry.studentId)
      if (actorRole !== 'teacher') return false
      return entry.classRecord.recordedById === actor.id
        || entry.classRecord.studyClass.teachers.some((teacher) => teacher.teacherId === actor.id)
    })
    if (canViewStudyHallImage) {
      results.set(value, { allowed: true, reason: 'study-hall' })
      continue
    }

    const isFeedbackAsset = matchingAssets.some((asset) => asset.ownerType === 'feedback') || looksLikeFeedbackKey(value)
    const ownsUnattachedFeedbackAsset = matchingFeedbacks.length === 0
      && normalizeRole(actor.role) === 'teacher'
      && matchingAssets.some((asset) => asset.ownerType === 'feedback' && asset.uploadedById === actor.id)
    if (ownsUnattachedFeedbackAsset) {
      results.set(value, { allowed: true, reason: 'unattached-owner' })
    } else if (!isFeedbackAsset) {
      results.set(value, { allowed: true, reason: 'legacy-non-feedback' })
    } else {
      results.set(value, { allowed: false, reason: 'forbidden' })
    }
  }
  return results
}
