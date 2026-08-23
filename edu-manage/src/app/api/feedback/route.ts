import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { requireCurrentTeacher, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'
import { triggerFeedbackBonus } from '@/lib/teacher-salary'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'
import { resolveUserForTeacher } from '@/lib/teacher-account-binding'
import type { Prisma } from '@prisma/client'
import {
  canViewFeedback,
  filterStudentRatingsForStudents,
  getParentFeedbackStudentIds,
  hasRequiredLessonContent,
  hasMeaningfulFeedbackContent,
  normalizeLessonContent,
  parseFeedbackCourseType,
  redactFeedbackForParent,
  resolveTeacherFeedbackCreationScope,
} from '@/lib/classroom-feedback/access'

export const dynamic = 'force-dynamic'

function asArr(v: unknown, limit = 20): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, limit)
    : []
}

function isMissingFeedbackContextColumn(error: unknown) {
  const err = error as { code?: string; meta?: { column?: string }; message?: string }
  const text = `${err?.meta?.column || ''} ${err?.message || ''}`
  return err?.code === 'P2022' && /feedbackCourseType|feedbackGroupId|termId/.test(text)
}

async function createClassroomFeedbackCompat(tx: Prisma.TransactionClient, data: Prisma.ClassroomFeedbackUncheckedCreateInput) {
  try {
    return await tx.classroomFeedback.create({ data })
  } catch (error) {
    if (!isMissingFeedbackContextColumn(error)) throw error
    const legacyData = { ...data }
    delete legacyData.feedbackCourseType
    delete legacyData.feedbackGroupId
    delete legacyData.termId
    console.warn('[feedback] ClassroomFeedback course context columns missing; creating legacy feedback without course context')
    return tx.classroomFeedback.create({ data: legacyData })
  }
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

  const where: Prisma.ClassroomFeedbackWhereInput = { status: 'PUBLISHED' }
  if (feedbackId) where.id = feedbackId
  let prisma = await getRequestPrisma()
  let parentStudentIds: string[] = []
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
    if (!parentStudentIds.length) {
      return feedbackId || requestedStudentId
        ? NextResponse.json({ error: '无权查看该反馈' }, { status: 403 })
        : NextResponse.json({ feedbacks: [] })
    }
    if (requestedStudentId && !parentStudentIds.includes(requestedStudentId)) {
      return NextResponse.json({ error: '无权查看该学生反馈' }, { status: 403 })
    }
    where.studentIds = { hasSome: requestedStudentId ? [requestedStudentId] : parentStudentIds }
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
      classLesson: { include: { group: { include: { course: { select: { name: true, subject: true, type: true } } } } } },
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
    .filter((feedback) => canViewFeedback(actor, feedback, parentStudentIds))
    .map((feedback) => ({
      ...feedback,
      students: feedback.studentIds.flatMap((id) => {
        const student = studentMap.get(id)
        return student ? [student] : []
      }),
    }))
  return NextResponse.json({
    feedbacks: role === 'parent'
      ? scopedFeedbacks.map((feedback) => redactFeedbackForParent(feedback, parentStudentIds))
      : scopedFeedbacks,
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
  const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
  const classLessonId = typeof body.classLessonId === 'string' && body.classLessonId ? body.classLessonId : null
  const rawCourseType = body.feedbackCourseType ?? body.courseType ?? body.classType
  const submittedCourseType = parseFeedbackCourseType(rawCourseType)
  if (!submittedCourseType) {
    return NextResponse.json({ error: '反馈课程类型不合法' }, { status: 400 })
  }
  let feedbackCourseType = submittedCourseType
  let feedbackGroupId = typeof body.feedbackGroupId === 'string' && body.feedbackGroupId ? body.feedbackGroupId : typeof body.groupId === 'string' && body.groupId ? body.groupId : null
  const studentIds = asArr(body.studentIds)
  const lessonContent = normalizeLessonContent(body.lessonContent)
  const knowledgePoints = asArr(body.knowledgePoints, 10)
  const imageUrls = asArr(body.imageUrls, 9)
  const tags = asArr(body.tags, 15)
  const homework = Array.isArray(body.homework) ? body.homework : []
  const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 500) : ''
  const overallComment = typeof body.overallComment === 'string' ? body.overallComment.trim().slice(0, 400) : ''
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
        select: { teacherId: true, groupId: true, group: { select: { intensiveMode: true, course: { select: { type: true } } } } },
      })
      teacherId = lesson?.teacherId || body.teacherId || ''
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
      submittedCourseType,
    })
    if (!scope.allowed) {
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
    const lesson = await prisma.classLesson.findFirst({
      where: { id: classLessonId },
      include: { group: { include: { course: { select: { type: true } }, enrollments: { where: { status: 'ACTIVE' }, include: { student: { select: { id: true } } } } } }, lessonStudents: { select: { studentId: true } } },
    })
    if (!lesson) return NextResponse.json({ error: '课次不存在' }, { status: 404 })
    const lessonStudentIds = lesson.group.intensiveMode === 'INTENSIVE'
      ? lesson.lessonStudents.map((item) => item.studentId)
      : lesson.group.enrollments.map(e => e.student.id)
    if (studentIds.some((studentId) => !lessonStudentIds.includes(studentId))) {
      return NextResponse.json({ error: '包含不属于该课次的学员' }, { status: 403 })
    }
    resolvedStudentIds = studentIds.length ? studentIds : lessonStudentIds
    feedbackGroupId = lesson.groupId || feedbackGroupId
    feedbackTermId = lesson.group.termId
    feedbackCourseType = lesson.group.intensiveMode === 'INTENSIVE' || lesson.group.course?.type === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : 'GROUP'
  }
  if (!resolvedStudentIds.length) {
    return NextResponse.json({ error: '请选择学员' }, { status: 400 })
  }

  if (isTeacher && resolvedStudentIds.length > 3) {
    return NextResponse.json({ error: '一次最多反馈3名学生' }, { status: 400 })
  }

  const resolvedStudentRatings = filterStudentRatingsForStudents(studentRatings, resolvedStudentIds)

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

  const feedback = await prisma.$transaction(async (tx) => {
    const created = await createClassroomFeedbackCompat(tx, {
        termId: feedbackTermId,
        teacherId,
        classLessonId,
        feedbackCourseType,
        feedbackGroupId,
        source: isAdmin ? 'admin' : 'teacher',
        targetType: body.targetType === 'STUDENT' ? 'STUDENT' : 'CLASS',
        studentIds: resolvedStudentIds,
        lessonContent: lessonContent || null,
        knowledgePoints,
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
      })

    if (status === 'PUBLISHED') {
      for (const student of studentsData) {
        const parentUserId = student.parentId || student.parentUserId
        if (!parentUserId) continue
        await tx.notification.create({
          data: {
            userId: parentUserId,
            type: 'CLASSROOM_FEEDBACK',
            title: `${teacherName}老师发布了成长反馈`,
            content: `${student.name}: ${overallComment || lessonContent || summary || knowledgePoints.join('、') || badge || '课堂反馈已更新'}`.slice(0, 80),
            link: '/parent/class-feedback',
            relatedType: 'CLASSROOM_FEEDBACK',
            relatedId: created.id,
            href: `/parent/class-feedback/${created.id}`,
          },
        })
      }
    }

    await tx.activityLog.create({
      data: {
        userId: user.id,
        teacherId,
        action: status === 'PUBLISHED' ? TEACHER_LOG_ACTIONS.CLASSROOM_FEEDBACK_PUBLISH : TEACHER_LOG_ACTIONS.CLASSROOM_FEEDBACK_DRAFT,
        detail: `${resolvedStudentIds.length}名学员 · ${knowledgePoints.join('/') || overallComment || lessonContent || '成长反馈'}`,
        entityType: 'ClassroomFeedback',
        entityId: created.id,
        metadata: { status, source: isAdmin ? 'admin' : 'teacher', studentCount: resolvedStudentIds.length, feedbackCourseType, feedbackGroupId },
      },
    })

    return created
  })

  let bonus: Awaited<ReturnType<typeof triggerFeedbackBonus>> | null = null
  if (status === 'PUBLISHED' && !isAdmin) {
    bonus = await triggerFeedbackBonus(feedback.id)
    if (!bonus.success) {
      console.warn('[feedback] triggerFeedbackBonus failed:', feedback.id, bonus.error)
    }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/parent/archive')
  return NextResponse.json({ feedback, bonus }, { status: 201 })
})

// PATCH: parent reply or admin reply
export const PATCH = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id: string; role: string; teacherId?: string | null } | undefined
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { id, parentReply, adminReply, markRead } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少反馈 ID' }, { status: 400 })

  if (user.role === 'parent' && (parentReply !== undefined || markRead === true)) {
    // Verify parent is linked to a student in this feedback
    const feedback = await prisma.classroomFeedback.findUnique({
      where: { id },
      select: { studentIds: true, id: true, parentReadAt: true },
    })
    if (!feedback) return NextResponse.json({ error: '反馈不存在' }, { status: 404 })
    const linkedCount = await prisma.student.count({
      where: { id: { in: feedback.studentIds }, ...parentLinkedStudentWhere(user.id) },
    })
    if (linkedCount === 0) return NextResponse.json({ error: '无权操作此反馈' }, { status: 403 })

    if (parentReply !== undefined) {
      await prisma.classroomFeedback.update({
        where: { id },
        data: {
          parentReply: String(parentReply).slice(0, 300) || null,
          parentRepliedAt: parentReply ? new Date() : null,
        },
      })
    }

    if (markRead === true && !feedback.parentReadAt) {
      await prisma.classroomFeedback.updateMany({
        where: { id, parentReadAt: null },
        data: { parentReadAt: new Date() },
      })
    }

    // Notify teacher of parent reply
    if (parentReply) {
      const fb = await prisma.classroomFeedback.findUnique({
        where: { id },
        select: { teacherId: true, studentIds: true },
      })
      if (fb?.teacherId) {
        const teacherUser = await resolveUserForTeacher(prisma, fb.teacherId)
        if (teacherUser) {
          const student = await prisma.student.findFirst({
            where: { id: { in: fb.studentIds }, parentUserId: user.id },
            select: { name: true },
          })
          await prisma.notification.create({
            data: {
              userId: teacherUser.id,
              type: 'CLASSROOM_FEEDBACK',
              title: '家长回复了课堂反馈',
              content: `${student?.name || '家长'} 回复了你发布的课堂反馈`,
              link: '/teacher/feedback',
              relatedType: 'CLASSROOM_FEEDBACK',
              relatedId: id,
              href: `/teacher/feedback?feedbackId=${id}`,
            },
          })
        }
      }
    }
  } else if ((user.role === 'admin' || user.role === 'teacher') && adminReply !== undefined) {
    const feedback = await prisma.classroomFeedback.findUnique({
      where: { id },
      select: { studentIds: true, teacherId: true },
    })
    if (!feedback) return NextResponse.json({ error: '反馈不存在' }, { status: 404 })
    if (user.role === 'teacher' && (!user.teacherId || feedback.teacherId !== user.teacherId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.classroomFeedback.update({
      where: { id },
      data: {
        adminReply: String(adminReply).slice(0, 300) || null,
        adminRepliedAt: adminReply ? new Date() : null,
      },
    })

    if (adminReply) {
      const students = await prisma.student.findMany({
        where: { id: { in: feedback.studentIds } },
        select: { name: true, parentId: true, parentUserId: true },
      })
      const notifiedParentIds = new Set<string>()
      for (const student of students) {
        const parentUserId = student.parentId || student.parentUserId
        if (!parentUserId || notifiedParentIds.has(parentUserId)) continue
        notifiedParentIds.add(parentUserId)
        await prisma.notification.create({
          data: {
            userId: parentUserId,
            type: 'CLASSROOM_FEEDBACK',
            title: '老师回复了课堂反馈',
            content: `${student.name}的课堂反馈有了新回复`,
            link: `/parent/class-feedback/${id}`,
            relatedType: 'CLASSROOM_FEEDBACK',
            relatedId: id,
            href: `/parent/class-feedback/${id}`,
          },
        })
      }
    }
  } else {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
})
