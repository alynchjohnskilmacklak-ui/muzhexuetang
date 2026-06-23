import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { requireCurrentTeacher, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'
import { triggerFeedbackBonus } from '@/lib/teacher-salary'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function asArr(v: unknown, limit = 20): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, limit)
    : []
}

function isMissingFeedbackContextColumn(error: unknown) {
  const err = error as { code?: string; meta?: { column?: string }; message?: string }
  const text = `${err?.meta?.column || ''} ${err?.message || ''}`
  return err?.code === 'P2022' && /feedbackCourseType|feedbackGroupId/.test(text)
}

async function createClassroomFeedbackCompat(tx: any, data: Record<string, unknown>) {
  try {
    return await tx.classroomFeedback.create({ data })
  } catch (error) {
    if (!isMissingFeedbackContextColumn(error)) throw error
    const { feedbackCourseType: _feedbackCourseType, feedbackGroupId: _feedbackGroupId, ...legacyData } = data
    console.warn('[feedback] ClassroomFeedback course context columns missing; creating legacy feedback without course context')
    return tx.classroomFeedback.create({ data: legacyData })
  }
}

// GET: list feedbacks (admin sees all, teacher sees own)
export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id: string; role: string } | undefined
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const teacherId = sp.get('teacherId') || undefined
  const date = sp.get('date') || undefined
  const all = sp.get('all') === '1'
  const division = sp.get('division')
  const limit = Math.min(200, Number(sp.get('limit') || 50))

  const where: Record<string, unknown> = { status: 'PUBLISHED' }
  let prisma = await getRequestPrisma()
  if (user.role === 'teacher') {
    const { teacher, prisma: tPrisma } = await requireCurrentTeacher()
    prisma = tPrisma
    where.teacherId = teacher.id
  } else if (teacherId) {
    where.teacherId = teacherId
  } else if (user.role === 'admin' && division && division !== 'ALL') {
    where.classLesson = { division }
  }
  if (date && !all) {
    const d = new Date(date)
    where.createdAt = { gte: new Date(d.setHours(0, 0, 0, 0)), lte: new Date(d.setHours(23, 59, 59, 999)) }
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

  const allStudentIds = [...new Set(feedbacks.flatMap(f => f.studentIds))]
  const students = allStudentIds.length
    ? await prisma.student.findMany({ where: { id: { in: allStudentIds } }, select: { id: true, name: true, grade: true } })
    : []
  const studentMap = new Map(students.map(s => [s.id, s]))

  return NextResponse.json({
    feedbacks: feedbacks.map(f => ({
      ...f,
      students: f.studentIds.map(id => studentMap.get(id)).filter(Boolean),
    })),
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
  const submittedCourseType = body.feedbackCourseType === 'ONE_ON_ONE' || body.courseType === 'ONE_ON_ONE' || body.classType === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : 'GROUP'
  let feedbackCourseType = submittedCourseType
  let feedbackGroupId = typeof body.feedbackGroupId === 'string' && body.feedbackGroupId ? body.feedbackGroupId : typeof body.groupId === 'string' && body.groupId ? body.groupId : null
  const studentIds = asArr(body.studentIds)
  const knowledgePoints = asArr(body.knowledgePoints, 10)
  const imageUrls = asArr(body.imageUrls, 9)
  const tags = asArr(body.tags, 15)
  const homework = Array.isArray(body.homework) ? body.homework : []
  const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 500) : ''
  const overallComment = typeof body.overallComment === 'string' ? body.overallComment.trim().slice(0, 400) : ''
  const mood = ['GREAT', 'GOOD', 'OKAY', 'NEEDS_ATTENTION'].includes(body.mood) ? body.mood : 'GOOD'
  const badge = typeof body.badge === 'string' ? body.badge.trim().slice(0, 30) : ''
  const studentRatings = body.studentRatings && typeof body.studentRatings === 'object' ? body.studentRatings : {}

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
        select: { teacherId: true, groupId: true, group: { select: { course: { select: { type: true } } } } },
      })
      teacherId = lesson?.teacherId || body.teacherId || ''
      feedbackGroupId = lesson?.groupId || feedbackGroupId
      feedbackCourseType = lesson?.group?.course?.type === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : feedbackCourseType
    } else {
      teacherId = body.teacherId || ''
    }
    if (!teacherId) return NextResponse.json({ error: '请指定关联教师' }, { status: 400 })
    teacherName = (await prisma.teacher.findUnique({ where: { id: teacherId }, select: { name: true } }))?.name || '管理员'
  }

  // Resolve student list from lesson enrollment
  let resolvedStudentIds = studentIds
  if (classLessonId) {
    const lesson = await prisma.classLesson.findFirst({
      where: { id: classLessonId },
      include: { group: { include: { course: { select: { type: true } }, enrollments: { where: { status: 'ACTIVE' }, include: { student: { select: { id: true } } } } } } },
    })
    if (!lesson) return NextResponse.json({ error: '课次不存在' }, { status: 404 })
    const lessonStudentIds = lesson.group.enrollments.map(e => e.student.id)
    resolvedStudentIds = studentIds.length ? studentIds.filter(id => lessonStudentIds.includes(id)) : lessonStudentIds
    feedbackGroupId = lesson.groupId || feedbackGroupId
    feedbackCourseType = lesson.group.course?.type === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : 'GROUP'
  }
  if (!resolvedStudentIds.length && !summary && !knowledgePoints.length) {
    return NextResponse.json({ error: '请选择学员或填写反馈内容' }, { status: 400 })
  }

  // Get student-parent mapping for notifications
  const studentsData = resolvedStudentIds.length
    ? await prisma.student.findMany({ where: { id: { in: resolvedStudentIds } }, select: { id: true, name: true, parentId: true, parentUserId: true } })
    : []

  const feedback = await prisma.$transaction(async (tx) => {
    const created = await createClassroomFeedbackCompat(tx, {
        teacherId,
        classLessonId,
        feedbackCourseType,
        feedbackGroupId,
        source: isAdmin ? 'admin' : 'teacher',
        targetType: body.targetType === 'STUDENT' ? 'STUDENT' : 'CLASS',
        studentIds: resolvedStudentIds,
        knowledgePoints,
        summary: summary || null,
        overallComment: overallComment || null,
        homework,
        imageUrls,
        tags,
        mood,
        badge: badge || null,
        studentRatings,
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
            content: `${student.name}: ${overallComment || summary || knowledgePoints.join('、') || badge || '课堂资料已更新'}`.slice(0, 80),
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
        detail: `${resolvedStudentIds.length}名学员 · ${knowledgePoints.join('/') || overallComment || '成长反馈'}`,
        entityType: 'ClassroomFeedback',
        entityId: created.id,
        metadata: { status, source: isAdmin ? 'admin' : 'teacher', studentCount: resolvedStudentIds.length, feedbackCourseType, feedbackGroupId },
      },
    })

    return created
  })

  if (status === 'PUBLISHED' && !isAdmin) {
    const bonusResult = await triggerFeedbackBonus(feedback.id)
    if (!bonusResult.success) {
      console.warn('[feedback] triggerFeedbackBonus failed:', feedback.id, bonusResult.error)
    }
  }

  revalidatePath('/teacher/dashboard')
  revalidatePath('/parent/archive')
  return NextResponse.json(feedback, { status: 201 })
})

// PATCH: parent reply or admin reply
export const PATCH = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id: string; role: string } | undefined
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { id, parentReply, adminReply } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少反馈 ID' }, { status: 400 })

  if (user.role === 'parent' && parentReply !== undefined) {
    // Verify parent is linked to a student in this feedback
    const feedback = await prisma.classroomFeedback.findUnique({
      where: { id },
      select: { studentIds: true, id: true },
    })
    if (!feedback) return NextResponse.json({ error: '反馈不存在' }, { status: 404 })
    const linkedCount = await prisma.student.count({
      where: { id: { in: feedback.studentIds }, ...parentLinkedStudentWhere(user.id) },
    })
    if (linkedCount === 0) return NextResponse.json({ error: '无权操作此反馈' }, { status: 403 })

    await prisma.classroomFeedback.update({
      where: { id },
      data: {
        parentReply: String(parentReply).slice(0, 300) || null,
        parentRepliedAt: parentReply ? new Date() : null,
      },
    })

    // Notify teacher of parent reply
    if (parentReply) {
      const fb = await prisma.classroomFeedback.findUnique({
        where: { id },
        select: { teacherId: true, studentIds: true },
      })
      if (fb?.teacherId) {
        const teacherUser = await prisma.user.findFirst({
          where: { teacherId: fb.teacherId, role: 'teacher', status: 'ACTIVE' },
          select: { id: true },
        })
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
    await prisma.classroomFeedback.update({
      where: { id },
      data: {
        adminReply: String(adminReply).slice(0, 300) || null,
        adminRepliedAt: adminReply ? new Date() : null,
      },
    })
  } else {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
})
