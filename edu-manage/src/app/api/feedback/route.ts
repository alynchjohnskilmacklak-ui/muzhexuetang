import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { triggerFeedbackBonus } from '@/lib/teacher-salary'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { createParentFeedbackMessage } from '@/lib/feedback-conversation'
import { createNotification } from '@/lib/notifications'
import { qywxEnabled } from '@/lib/qywx'
import {
  canViewFeedback,
  filterStudentRatingsForStudents,
  getParentFeedbackStudentIds,
  hasRequiredLessonContent,
  hasMeaningfulFeedbackContent,
  feedbackStudentLimitError,
  normalizeLessonContent,
  parseFeedbackCourseType,
  redactFeedbackForParent,
  resolveTeacherFeedbackCreationScope,
} from '@/lib/classroom-feedback/access'
import { createClassroomFeedbackWithSideEffects } from '@/lib/classroom-feedback/create'
import { resolveParentFeedbackReadAt } from '@/lib/classroom-feedback/read-state'
import { createFeedbackOnce, hashFeedbackPayload, parseFeedbackClientRequestId } from '@/lib/classroom-feedback/idempotency'
import { resetFeedbackReadReceiptsForParents } from '@/lib/classroom-feedback/notification-read-sync'
import { mergeStudentFeedbackRating, normalizePracticeCheckin } from '@/lib/classroom-feedback/feedback-followup'
import { getMissingStudentRatingTagCategories } from '@/lib/classroom-feedback/student-feedback-tags'
import { localDateKey, todayLocal } from '@/lib/date/local-day'

export const dynamic = 'force-dynamic'

function asArr(v: unknown, limit = 20): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, limit)
    : []
}

// GET: list feedbacks scoped to the current role.
export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id: string; role: string } | undefined
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const feedbackId = sp.get('id') || undefined
  const requestedStudentId = sp.get('studentId') || undefined
  const teacherId = sp.get('teacherId') || undefined
  const date = sp.get('date') || undefined
  const all = sp.get('all') === '1'
  const division = sp.get('division')
  const limit = Math.min(200, Number(sp.get('limit') || 50))

  const role = String(user.role || '').toLowerCase()
  if (!['admin', 'teacher', 'parent'].includes(role)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const where: Prisma.ClassroomFeedbackWhereInput = { status: 'PUBLISHED', deletedAt: null }
  if (feedbackId) where.id = feedbackId
  let prisma = await getRequestPrisma()
  let parentStudentIds: string[] = []
  const directParentFeedbackIds = new Set<string>()
  let actorTeacherId: string | null = null
  if (role === 'teacher') {
    const { teacher, prisma: tPrisma } = await requireCurrentTeacher()
    prisma = tPrisma
    actorTeacherId = teacher.id
    where.OR = [
      { teacherId: teacher.id },
      { classLesson: { teacherId: teacher.id } },
    ]
  } else if (role === 'parent') {
    parentStudentIds = await getParentFeedbackStudentIds(prisma, user.id)
    if (requestedStudentId && !parentStudentIds.includes(requestedStudentId)) {
      return NextResponse.json({ error: '无权查看该学生反馈' }, { status: 403 })
    }
    const parentReceipts = await prisma.feedbackParentReadReceipt.findMany({
      where: {
        parentUserId: user.id,
        feedback: { status: 'PUBLISHED', deletedAt: null, isSingleSession: true, studentIds: { isEmpty: true } },
      },
      select: { feedbackId: true },
    })
    for (const receipt of parentReceipts) directParentFeedbackIds.add(receipt.feedbackId)
    const allowedFeedbackScopes: Prisma.ClassroomFeedbackWhereInput[] = []
    const visibleStudentIds = requestedStudentId ? [requestedStudentId] : parentStudentIds
    if (visibleStudentIds.length) allowedFeedbackScopes.push({ studentIds: { hasSome: visibleStudentIds } })
    if (directParentFeedbackIds.size) allowedFeedbackScopes.push({ id: { in: [...directParentFeedbackIds] } })
    if (!allowedFeedbackScopes.length) {
      return feedbackId || requestedStudentId
        ? NextResponse.json({ error: '无权查看该反馈' }, { status: 403 })
        : NextResponse.json({ feedbacks: [] })
    }
    where.OR = allowedFeedbackScopes
  } else if (teacherId) {
    where.teacherId = teacherId
  } else if (division && division !== 'ALL') {
    where.classLesson = { division }
  }
  if (date && !all) {
    const d = new Date(date)
    where.createdAt = { gte: new Date(d.setHours(0, 0, 0, 0)), lte: new Date(d.setHours(23, 59, 59, 999)) }
  }
  if (requestedStudentId && role !== 'parent') {
    where.studentIds = { has: requestedStudentId }
  }

  const feedbacks = await prisma.classroomFeedback.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true, avatar: true } },
      classLesson: {
        select: {
          id: true,
          teacherId: true,
          groupId: true,
          lessonDate: true,
          startTime: true,
          endTime: true,
          subject: true,
          group: {
            select: {
              id: true,
              name: true,
              teacherId: true,
              course: { select: { name: true, subject: true, type: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  if (feedbackId && feedbacks.length === 0) {
    return NextResponse.json({ error: '无权查看该反馈' }, { status: role === 'admin' ? 404 : 403 })
  }

  const allStudentIds = [...new Set(feedbacks.flatMap(f => f.studentIds))]
  const students = allStudentIds.length
    ? await prisma.student.findMany({ where: { id: { in: allStudentIds } }, select: { id: true, name: true, grade: true } })
    : []
  const studentMap = new Map(students.map(s => [s.id, s]))

  const actor = { id: user.id, role, teacherId: actorTeacherId }
  const scopedFeedbacks = feedbacks
    .filter((feedback) => canViewFeedback(actor, feedback, parentStudentIds) || (
      role === 'parent'
      && feedback.isSingleSession
      && feedback.studentIds.length === 0
      && directParentFeedbackIds.has(feedback.id)
    ))
    .map((feedback) => ({
      ...feedback,
      ...((role === 'parent' && feedback.isSingleSession && feedback.studentIds.length === 0 && directParentFeedbackIds.has(feedback.id))
        ? redactFeedbackForParent(feedback, ['__single_session_manual__'])
        : {}),
      students: feedback.studentIds.flatMap((id) => {
        const student = studentMap.get(id)
        return student ? [student] : []
      }),
    }))
  if (role !== 'parent') return NextResponse.json({ feedbacks: scopedFeedbacks })

  const feedbackIds = scopedFeedbacks.map((feedback) => feedback.id)
  const parentReceipts = feedbackIds.length
    ? await prisma.feedbackParentReadReceipt.findMany({
        where: { parentUserId: user.id, feedbackId: { in: feedbackIds } },
        select: { feedbackId: true, readAt: true, createdAt: true },
      })
    : []
  const receiptsByFeedback = new Map<string, typeof parentReceipts>()
  for (const receipt of parentReceipts) {
    const receipts = receiptsByFeedback.get(receipt.feedbackId) || []
    receipts.push(receipt)
    receiptsByFeedback.set(receipt.feedbackId, receipts)
  }

  return NextResponse.json({
    feedbacks: scopedFeedbacks.map((feedback) => redactFeedbackForParent({
      ...feedback,
      parentReadAt: resolveParentFeedbackReadAt(feedback.parentReadAt, (receiptsByFeedback.get(feedback.id) || []).map((receipt) => ({
        read: receipt.readAt !== null,
        readAt: receipt.readAt,
        createdAt: receipt.createdAt,
      }))),
    }, feedback.isSingleSession && feedback.studentIds.length === 0 && directParentFeedbackIds.has(feedback.id)
      ? ['__single_session_manual__']
      : parentStudentIds)),
  })
})

// POST: create feedback (teacher or admin)
export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id: string; role: string; name?: string | null } | undefined
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const isAdmin = user.role === 'admin'
  const isTeacher = user.role === 'teacher'
  if (!isAdmin && !isTeacher) return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const clientRequestId = parseFeedbackClientRequestId(body?.clientRequestId)
  if (clientRequestId === false) return NextResponse.json({ error: '提交请求编号无效，请刷新页面后重试' }, { status: 400 })
  if (isTeacher && !clientRequestId) return NextResponse.json({ error: '提交请求编号缺失，请刷新页面后重试' }, { status: 400 })
  const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
  const classLessonId = typeof body.classLessonId === 'string' && body.classLessonId ? body.classLessonId : null
  const isSingleSession = isTeacher && body.isSingleSession === true
  if (isSingleSession && status === 'PUBLISHED') {
    return NextResponse.json({ error: '单次课程反馈仅保存为分享图素材，不直接发布给家长' }, { status: 400 })
  }
  const subjectSnapshot = isSingleSession && typeof body.subject === 'string' ? body.subject.trim().slice(0, 40) : null
  let sessionDate: Date | null = null
  if (isSingleSession) {
    const dateValue = typeof body.sessionDate === 'string' ? body.sessionDate.trim() : ''
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? new Date(`${dateValue}T12:00:00+08:00`) : null
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || localDateKey(parsedDate) !== dateValue) {
      return NextResponse.json({ error: '请选择有效的上课日期' }, { status: 400 })
    }
    if (dateValue > todayLocal()) return NextResponse.json({ error: '单次反馈日期不能晚于今天' }, { status: 400 })
    sessionDate = parsedDate
  }
  const rawCourseType = body.feedbackCourseType ?? body.courseType ?? body.classType
  const submittedCourseType = parseFeedbackCourseType(rawCourseType)
  if (!submittedCourseType) {
    return NextResponse.json({ error: '反馈课程类型不合法' }, { status: 400 })
  }
  let feedbackCourseType = submittedCourseType
  let feedbackGroupId = typeof body.feedbackGroupId === 'string' && body.feedbackGroupId ? body.feedbackGroupId : typeof body.groupId === 'string' && body.groupId ? body.groupId : null
  const additionalLessonIds = asArr(body.additionalLessonIds, 10)
  const studentIds = asArr(body.studentIds)
  const lessonContent = normalizeLessonContent(body.lessonContent)
  const knowledgePoints = asArr(body.knowledgePoints, 10)
  const knowledgeCard = parseStoredKnowledgeCard(body.knowledgeCard)
  const imageUrls = asArr(body.imageUrls, 9)
  const tags = asArr(body.tags, 15)
  const homework = Array.isArray(body.homework) ? body.homework : []
  const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 500) : ''
  const overallComment = typeof body.overallComment === 'string' ? body.overallComment.trim().slice(0, 1400) : ''
  const mood = ['GREAT', 'GOOD', 'OKAY', 'NEEDS_ATTENTION'].includes(body.mood) ? body.mood : 'GOOD'
  const badge = typeof body.badge === 'string' ? body.badge.trim().slice(0, 30) : ''
  const studentRatings = body.studentRatings && typeof body.studentRatings === 'object' ? body.studentRatings : {}

  if (status === 'PUBLISHED' && !hasRequiredLessonContent(lessonContent)) {
    return NextResponse.json({ error: '请填写课堂反馈内容（至少10个字）' }, { status: 400 })
  }

  if (!hasMeaningfulFeedbackContent({ lessonContent, overallComment, summary, knowledgePoints, homework, studentRatings, badge, tags })) {
    return NextResponse.json({ error: '反馈内容不能为空' }, { status: 400 })
  }

  // Determine teacherId
  let teacherId: string
  let teacherName: string
  let prisma = await getRequestPrisma()
  if (isTeacher) {
    const { teacher, prisma: tPrisma } = await requireCurrentTeacher()
    prisma = tPrisma
    teacherId = teacher.id
    teacherName = teacher.name
  } else {
    if (classLessonId) {
      const lesson = await prisma.classLesson.findUnique({
        where: { id: classLessonId },
        select: {
          teacherId: true,
          groupId: true,
          group: {
            select: {
              teacherId: true,
              teacherAssignments: { select: { teacherId: true, subject: true } },
              intensiveMode: true,
              course: { select: { type: true } },
            },
          },
        },
      })
      teacherId = lesson?.teacherId
        || body.teacherId
        || lesson?.group.teacherAssignments.find((assignment) => assignment.subject === body.subject)?.teacherId
        || lesson?.group.teacherId
        || lesson?.group.teacherAssignments[0]?.teacherId
        || ''
      feedbackGroupId = lesson?.groupId || feedbackGroupId
      feedbackCourseType = lesson?.group?.intensiveMode === 'INTENSIVE' || lesson?.group?.course?.type === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : feedbackCourseType
    } else {
      teacherId = body.teacherId || ''
    }
    if (!teacherId) return NextResponse.json({ error: '请指定关联教师' }, { status: 400 })
    teacherName = (await prisma.teacher.findUnique({ where: { id: teacherId }, select: { name: true } }))?.name || '管理员'
  }

  // Resolve every teacher-controlled relationship from the database. Never
  // trust studentIds, groupId, lessonId or teacherId supplied by the client.
  let resolvedStudentIds = studentIds
  let feedbackTermId: string | null = null
  let scopedStudents: Array<{ id: string; name: string; parentId: string | null; parentUserId: string | null }> | null = null
  if (isTeacher) {
    const scope = await resolveTeacherFeedbackCreationScope(prisma, {
      teacherId,
      classLessonId,
      feedbackGroupId,
      requestedStudentIds: studentIds,
      expandClassTarget: false,
      isSingleSession,
      requireLesson: !isSingleSession && status === 'PUBLISHED',
      requireAttendanceSubmitted: !isSingleSession && status === 'PUBLISHED',
      submittedCourseType,
      requestedSubject: typeof body.subject === 'string' ? body.subject : null,
    })
    if (!scope.allowed) {
      if (scope.reason === 'blocked') {
        return NextResponse.json({ error: '该学员本节课已请假或未到校，不能提交课堂反馈' }, { status: 409 })
      }
      if (scope.reason === 'lesson-required') {
        return NextResponse.json({ error: '发布课堂反馈前，请先选择具体课次并完成考勤' }, { status: 409 })
      }
      if (scope.reason === 'attendance-required') {
        return NextResponse.json({ error: '本节课考勤尚未提交，完成考勤后才能发布反馈' }, { status: 409 })
      }
      const message = scope.reason === 'group'
        ? '班级不存在或无权操作'
        : scope.reason === 'lesson'
          ? '课次不存在或无权操作'
          : '包含不属于当前教师授课范围的学员'
      return NextResponse.json({ error: message }, { status: 403 })
    }
    scopedStudents = scope.students
    resolvedStudentIds = scope.students.map((student) => student.id)
    feedbackGroupId = scope.feedbackGroupId
    feedbackCourseType = scope.feedbackCourseType
    feedbackTermId = scope.termId
  } else if (classLessonId) {
    const expandClassTarget = studentIds.length === 0 && body.targetType !== 'STUDENT'
    const scope = await resolveTeacherFeedbackCreationScope(prisma, {
      teacherId,
      classLessonId,
      feedbackGroupId,
      requestedStudentIds: studentIds,
      expandClassTarget,
      requireLesson: true,
      requireAttendanceSubmitted: status === 'PUBLISHED',
      submittedCourseType,
      requestedSubject: typeof body.subject === 'string' ? body.subject : null,
    })
    if (!scope.allowed) {
      if (scope.reason === 'blocked') {
        return NextResponse.json({ error: '该学员本节课已请假或未到校，不能提交课堂反馈' }, { status: 409 })
      }
      if (scope.reason === 'attendance-required') {
        return NextResponse.json({ error: '本节课考勤尚未提交，完成考勤后才能发布反馈' }, { status: 409 })
      }
      if (scope.reason === 'lesson-required') {
        return NextResponse.json({ error: '发布课堂反馈前，请先选择具体课次并完成考勤' }, { status: 409 })
      }
      const message = scope.reason === 'lesson'
        ? '课次不存在、已取消或无权操作'
        : '包含不属于该课次学科名单的学员'
      return NextResponse.json({ error: message }, { status: 403 })
    }
    scopedStudents = scope.students
    resolvedStudentIds = scope.students.map((student) => student.id)
    feedbackGroupId = scope.feedbackGroupId
    feedbackCourseType = scope.feedbackCourseType
    feedbackTermId = scope.termId
  }
  if (!resolvedStudentIds.length) {
    return NextResponse.json({ error: '请选择学员' }, { status: 400 })
  }

  const studentLimitError = feedbackStudentLimitError(user.role, resolvedStudentIds.length)
  if (studentLimitError) return NextResponse.json({ error: studentLimitError }, { status: 400 })

  const resolvedStudentRatings = filterStudentRatingsForStudents(studentRatings, resolvedStudentIds)
  if (isTeacher && status === 'PUBLISHED') {
    const tagIssues = getMissingStudentRatingTagCategories(resolvedStudentRatings, resolvedStudentIds)
    if (tagIssues.length) {
      const firstIssue = tagIssues[0]
      const studentName = scopedStudents?.find((student) => student.id === firstIssue.studentId)?.name || '该学员'
      return NextResponse.json({ error: `${studentName}还需选择：${firstIssue.missing.join('、')}，每组至少选择 1 项${tagIssues.length > 1 ? `；另有 ${tagIssues.length - 1} 名学员未完成` : ''}` }, { status: 400 })
    }
  }
  if (!feedbackTermId && feedbackGroupId) {
    feedbackTermId = (await prisma.classGroup.findUnique({
      where: { id: feedbackGroupId },
      select: { termId: true },
    }))?.termId || null
  }

  // Get student-parent mapping for notifications
  const studentsData = scopedStudents ?? await prisma.student.findMany({
    where: { id: { in: resolvedStudentIds } },
    select: { id: true, name: true, parentId: true, parentUserId: true },
  })

  const feedbackResult = await prisma.$transaction(async (tx) => createFeedbackOnce(tx, {
    clientRequestId,
    actorUserId: user.id,
    payloadHash: hashFeedbackPayload({ ...body, clientRequestId: undefined, resolvedStudentIds }),
  }, () => createClassroomFeedbackWithSideEffects(tx, {
      data: {
        termId: feedbackTermId,
        teacherId,
        classLessonId,
        isSingleSession,
        subjectSnapshot,
        sessionDate,
        feedbackCourseType,
        feedbackGroupId,
        source: isAdmin ? 'admin' : 'teacher',
        targetType: isSingleSession || body.targetType === 'STUDENT' ? 'STUDENT' : 'CLASS',
        studentIds: resolvedStudentIds,
        lessonContent: lessonContent || null,
        knowledgePoints,
        knowledgeCard: knowledgeCard as Prisma.InputJsonValue || undefined,
        summary: summary || null,
        overallComment: overallComment || null,
        homework,
        imageUrls,
        tags,
        mood,
        badge: badge || null,
        studentRatings: resolvedStudentRatings as Prisma.InputJsonValue,
        status,
        notifySent: status === 'PUBLISHED',
      },
      actorUserId: user.id,
      teacherName,
      students: studentsData,
      knowledgePoints,
      imageUrls,
      status,
      source: isAdmin ? 'admin' : 'teacher',
      detailFallback: '成长反馈',
      notificationLabel: '成长反馈',
      notificationContent: overallComment || lessonContent || summary || knowledgePoints.join('、') || badge || '课堂反馈已更新',
      additionalLessonIds,
  })))
  if (!feedbackResult.ok) {
    const message = feedbackResult.conflict === 'PAYLOAD_CHANGED'
      ? '这次提交内容与已处理的请求不同，请检查反馈记录后重新提交'
      : feedbackResult.conflict === 'RESULT_MISSING'
        ? '提交仍在处理中，请稍后刷新反馈列表'
        : '提交编号已被使用，请刷新页面后重试'
    return NextResponse.json({ error: message }, { status: 409 })
  }
  const feedback = feedbackResult.feedback

  let bonus: Awaited<ReturnType<typeof triggerFeedbackBonus>> | null = null
  if (status === 'PUBLISHED' && !isAdmin && !isSingleSession && !feedbackResult.replayed) {
    bonus = await triggerFeedbackBonus(feedback.id)
    if (!bonus.success) {
      console.warn('[feedback] triggerFeedbackBonus failed:', feedback.id, bonus.error)
    }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/parent/archive')
  return NextResponse.json({ feedback, bonus, replayed: feedbackResult.replayed }, { status: feedbackResult.replayed ? 200 : 201 })
})

// PATCH: parent reply or admin reply
export const PATCH = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id: string; role: string; name?: string | null; teacherId?: string | null; division?: string | null } | undefined
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const body = await req.json()
  const { id, parentReply, adminReply, markRead } = body
  const practiceCheckin = body.practiceCheckin
  const edits = body.edits as {
    summary?: string | null
    lessonContent?: string | null
    knowledgePoints?: string[]
    homework?: unknown[]
    tags?: string[]
  } | undefined
  if (!id) return NextResponse.json({ error: '缺少反馈 ID' }, { status: 400 })
  let savedPracticeCheckin: { studentId: string; status: string; note: string; updatedAt: string } | null = null

  // 管理员修改正文
  if (edits && user.role === 'admin') {
    const updateData: Record<string, unknown> = {}
    if (typeof edits.summary === 'string') updateData.summary = edits.summary.trim() || null
    if (typeof edits.lessonContent === 'string') updateData.lessonContent = edits.lessonContent.trim() || null
    if (Array.isArray(edits.knowledgePoints)) updateData.knowledgePoints = edits.knowledgePoints
    if (Array.isArray(edits.homework)) updateData.homework = edits.homework
    if (Array.isArray(edits.tags)) updateData.tags = edits.tags
    await prisma.classroomFeedback.update({ where: { id }, data: updateData })
    return NextResponse.json({ ok: true })
  }

  if (user.role === 'parent' && (parentReply !== undefined || markRead === true || practiceCheckin !== undefined)) {
    // Verify parent is linked to a student in this feedback
    const feedback = await prisma.classroomFeedback.findUnique({
      where: { id },
      select: { studentIds: true, id: true, parentReadAt: true, studentRatings: true, status: true, isSingleSession: true },
    })
    if (!feedback) return NextResponse.json({ error: '反馈不存在' }, { status: 404 })
    const linkedCount = await prisma.student.count({
      where: { id: { in: feedback.studentIds }, ...parentLinkedStudentWhere(user.id) },
    })
    const directManualReceipt = feedback.isSingleSession && feedback.studentIds.length === 0
      ? await prisma.feedbackParentReadReceipt.findUnique({
          where: { feedbackId_parentUserId: { feedbackId: id, parentUserId: user.id } },
          select: { feedbackId: true },
        })
      : null
    if (linkedCount === 0 && !directManualReceipt) return NextResponse.json({ error: '无权操作此反馈' }, { status: 403 })
    if (practiceCheckin !== undefined && linkedCount === 0) return NextResponse.json({ error: '该单次反馈未关联学员档案，无法登记练习回传' }, { status: 409 })

    if (practiceCheckin !== undefined) {
      if (feedback.status !== 'PUBLISHED') return NextResponse.json({ error: '反馈发布后才能回传练习情况' }, { status: 409 })
      if (!practiceCheckin || typeof practiceCheckin !== 'object' || Array.isArray(practiceCheckin)) {
        return NextResponse.json({ error: '练习情况格式不正确' }, { status: 400 })
      }
      const requestedStudentId = typeof practiceCheckin.studentId === 'string' ? practiceCheckin.studentId.trim() : ''
      const rawNote = practiceCheckin.note
      if (!requestedStudentId || (rawNote !== undefined && typeof rawNote !== 'string')) {
        return NextResponse.json({ error: '请选择对应学员并填写有效的补充内容' }, { status: 400 })
      }
      if (!feedback.studentIds.includes(requestedStudentId)) return NextResponse.json({ error: '此学员不属于该反馈' }, { status: 403 })
      const requestedLinkedCount = await prisma.student.count({
        where: { id: requestedStudentId, ...parentLinkedStudentWhere(user.id) },
      })
      if (requestedLinkedCount === 0) return NextResponse.json({ error: '无权为此学员回传练习情况' }, { status: 403 })

      const updatedAt = new Date().toISOString()
      const normalized = normalizePracticeCheckin({
        status: practiceCheckin.status,
        note: typeof rawNote === 'string' ? rawNote.slice(0, 240) : '',
        updatedAt,
      })
      if (!normalized) return NextResponse.json({ error: '练习情况选项无效' }, { status: 400 })
      const mergedRatings = mergeStudentFeedbackRating(feedback.studentRatings, requestedStudentId, feedback.studentIds, {
        practiceCheckin: normalized,
      })
      await prisma.classroomFeedback.update({
        where: { id },
        data: { studentRatings: mergedRatings as Prisma.InputJsonValue },
      })
      savedPracticeCheckin = {
        studentId: requestedStudentId,
        status: normalized.status,
        note: normalized.note,
        updatedAt: normalized.updatedAt || updatedAt,
      }
    }

    if (parentReply !== undefined) {
      const content = String(parentReply).trim().slice(0, 300)
      if (content) {
        try {
          await createParentFeedbackMessage({
            prisma,
            feedbackId: id,
            parentId: user.id,
            parentName: user.name || '家长',
            content,
          })
        } catch (error) {
          if (error instanceof Error && error.message === 'FEEDBACK_NOT_FOUND') {
            return NextResponse.json({ error: '反馈不存在' }, { status: 404 })
          }
          if (error instanceof Error && error.message === 'FEEDBACK_PARENT_FORBIDDEN') {
            return NextResponse.json({ error: '无权操作此反馈' }, { status: 403 })
          }
          throw error
        }
      } else {
        // Empty legacy replies only clear the compatibility projection. Message
        // history is append-only and remains available in the conversation.
        await prisma.classroomFeedback.update({
          where: { id },
          data: { parentReply: null, parentRepliedAt: null },
        })
      }
    }

    if (markRead === true) {
      const readAt = new Date()
      await prisma.$transaction(async (tx) => {
        await tx.feedbackParentReadReceipt.upsert({
          where: { feedbackId_parentUserId: { feedbackId: id, parentUserId: user.id } },
          create: { feedbackId: id, parentUserId: user.id, readAt },
          update: { readAt },
        })
        await tx.notification.updateMany({
          where: {
            userId: user.id,
            relatedType: 'CLASSROOM_FEEDBACK',
            relatedId: id,
            status: { in: ['ACTIVE', 'ARCHIVED'] },
            deletedAt: null,
            read: false,
          },
          data: { read: true, readAt },
        })
      })
    }

  } else if ((user.role === 'admin' || user.role === 'teacher') && adminReply !== undefined) {
    const actorDivision = user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
    const replyContent = String(adminReply ?? '').trim().slice(0, 300)
    const outcome = await prisma.$transaction(async (tx) => {
      const feedback = await tx.classroomFeedback.findFirst({
        where: {
          id,
          status: 'PUBLISHED',
          deletedAt: null,
          OR: [{ classLessonId: null }, { classLesson: { division: actorDivision } }],
        },
        select: { studentIds: true, teacherId: true },
      })
      if (!feedback) return 'NOT_FOUND' as const
      if (user.role === 'teacher' && (!user.teacherId || feedback.teacherId !== user.teacherId)) {
        return 'FORBIDDEN' as const
      }

      const students = await tx.student.findMany({
        where: {
          id: { in: feedback.studentIds },
          division: actorDivision,
          status: { not: 'INACTIVE' },
          deletedAt: null,
        },
        select: { id: true, name: true, parentId: true, parentUserId: true },
      })
      if (students.length === 0) return 'NOT_FOUND' as const

      const updateResult = await tx.classroomFeedback.updateMany({
        where: { id, status: 'PUBLISHED', deletedAt: null },
        data: {
          adminReply: replyContent || null,
          adminRepliedAt: replyContent ? new Date() : null,
        },
      })
      if (updateResult.count === 0) return 'NOT_FOUND' as const

      if (replyContent) {
        const parents = new Map<string, { names: Set<string>; studentIds: string[] }>()
        for (const student of students) {
          const parentUserId = student.parentId || student.parentUserId
          if (!parentUserId) continue
          const parent = parents.get(parentUserId) || { names: new Set<string>(), studentIds: [] }
          parent.names.add(student.name)
          parent.studentIds.push(student.id)
          parents.set(parentUserId, parent)
        }

        await resetFeedbackReadReceiptsForParents(tx, id, [...parents.keys()])
        for (const [parentUserId, parent] of parents) {
          await createNotification(tx, {
            userId: parentUserId,
            type: 'CLASSROOM_FEEDBACK',
            title: '老师回复了课堂反馈',
            content: `${[...parent.names].join('、')}的课堂反馈有了新回复`,
            relatedType: 'CLASSROOM_FEEDBACK',
            relatedId: id,
            studentId: parent.studentIds[0],
            href: `/parent/class-feedback/${id}`,
            pushStatus: qywxEnabled() ? 'queued' : 'none',
          })
        }
      }
      return 'OK' as const
    })

    if (outcome === 'NOT_FOUND') return NextResponse.json({ error: '反馈不存在' }, { status: 404 })
    if (outcome === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, ...(savedPracticeCheckin ? { practiceCheckin: savedPracticeCheckin } : {}) })
})
