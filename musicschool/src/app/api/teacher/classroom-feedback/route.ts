import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { assertTeacherOwnsStudent, requireCurrentTeacher, TEACHER_LOG_ACTIONS, teacherLessonWhere } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

function asStringArray(value: unknown, limit = 100) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit) : []
}

export const GET = apiHandler(async (req: NextRequest) => {
  const { teacher } = await requireCurrentTeacher()
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 10)))
  const feedbacks = await prisma.classroomFeedback.findMany({
    where: { teacherId: teacher.id },
    include: {
      classLesson: { include: { group: { include: { course: true } } } },
      teacher: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json({ feedbacks })
})

export const POST = apiHandler(async (req: NextRequest) => {
  try {
    const { user, teacher } = await requireCurrentTeacher()
    const body = await req.json()
    const classLessonId = typeof body.classLessonId === 'string' && body.classLessonId ? body.classLessonId : null
    const targetType = body.targetType === 'STUDENT' ? 'STUDENT' : 'CLASS'
    const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
    const knowledgePoints = asStringArray(body.knowledgePoints, 10)
    const imageUrls = asStringArray(body.imageUrls, 9)
    const studentIds = asStringArray(body.studentIds)
    const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 500) : ''
    const homework = Array.isArray(body.homework) ? body.homework : []
    const imageTypes = body.imageTypes && typeof body.imageTypes === 'object' ? body.imageTypes : {}
    const studentRatings = body.studentRatings && typeof body.studentRatings === 'object' ? body.studentRatings : {}

    if (!summary && !knowledgePoints.length && !homework.length && !imageUrls.length) {
      return NextResponse.json({ error: '请至少填写课堂内容、作业或上传资料' }, { status: 400 })
    }

    let lessonStudents: Array<{ id: string; name: string; parentId: string | null; parentUserId: string | null }> = []
    if (classLessonId) {
      const lesson = await prisma.classLesson.findFirst({
        where: { id: classLessonId, ...teacherLessonWhere(teacher.id) },
        include: {
          group: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
                include: { student: { select: { id: true, name: true, parentId: true, parentUserId: true } } },
              },
            },
          },
        },
      })
      if (!lesson) return NextResponse.json({ error: '课次不存在或无权限' }, { status: 403 })
      lessonStudents = lesson.group.enrollments.map((enrollment) => enrollment.student)
    }

    const targetIds = targetType === 'CLASS'
      ? lessonStudents.map((student) => student.id)
      : studentIds
    if (!targetIds.length) return NextResponse.json({ error: '请选择学员或关联一个有学员的课次' }, { status: 400 })

    const students = lessonStudents.length
      ? lessonStudents.filter((student) => targetIds.includes(student.id))
      : []
    if (!lessonStudents.length) {
      for (const studentId of targetIds) {
        const student = await assertTeacherOwnsStudent(teacher.id, studentId)
        if (!student) return NextResponse.json({ error: '包含无权操作的学员' }, { status: 403 })
        students.push(student)
      }
    }

    const feedback = await prisma.$transaction(async (tx) => {
      const created = await tx.classroomFeedback.create({
        data: {
          teacherId: teacher.id,
          classLessonId,
          targetType,
          studentIds: students.map((student) => student.id),
          knowledgePoints,
          summary: summary || null,
          homework,
          imageUrls,
          imageTypes,
          studentRatings,
          status,
          notifySent: status === 'PUBLISHED',
        },
      })

      if (status === 'PUBLISHED') {
        for (const student of students) {
          const parentUserId = student.parentId || student.parentUserId
          if (!parentUserId) continue
          await tx.notification.create({
            data: {
              userId: parentUserId,
              type: 'CLASSROOM_FEEDBACK',
              title: `${teacher.name}老师发布了课堂反馈`,
              content: `${student.name}: ${summary || knowledgePoints.join('、') || '课堂资料已更新'}`.slice(0, 80),
              link: '/parent/grades',
              relatedType: 'CLASSROOM_FEEDBACK',
              relatedId: created.id,
              href: `/parent/growth?feedbackId=${created.id}`,
            },
          })
        }
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          teacherId: teacher.id,
          action: status === 'PUBLISHED' ? TEACHER_LOG_ACTIONS.CLASSROOM_FEEDBACK_PUBLISH : TEACHER_LOG_ACTIONS.CLASSROOM_FEEDBACK_DRAFT,
          detail: `${students.length}名学员 · ${knowledgePoints.join('/') || '课堂反馈'}`,
          entityType: 'ClassroomFeedback',
          entityId: created.id,
          metadata: { status, targetType, studentCount: students.length, imageCount: imageUrls.length },
        },
      })

      return created
    })

    revalidatePath('/teacher/dashboard')
    revalidatePath('/parent/grades')
    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '保存课堂反馈失败' }, { status: 500 })
  }
})
