import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { assertTeacherOwnsStudent, requireCurrentTeacher, TEACHER_LOG_ACTIONS, teacherLessonWhere } from '@/lib/teacher-portal'
import { triggerFeedbackBonus } from '@/lib/teacher-salary'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

function asStringArray(value: unknown, limit = 100) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit) : []
}

export const GET = apiHandler(async (req: NextRequest) => {
    const { teacher, prisma } = await requireCurrentTeacher()
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
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const body = await req.json()
    const classLessonId = typeof body.classLessonId === 'string' && body.classLessonId ? body.classLessonId : null
    let feedbackGroupId = typeof body.feedbackGroupId === 'string' && body.feedbackGroupId
      ? body.feedbackGroupId
      : typeof body.groupId === 'string' && body.groupId
        ? body.groupId
        : null
    let feedbackCourseType = body.feedbackCourseType === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : 'GROUP'
    const targetType = body.targetType === 'STUDENT' ? 'STUDENT' : 'CLASS'
    const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
    const knowledgePoints = asStringArray(body.knowledgePoints, 10)
    const imageUrls = asStringArray(body.imageUrls, 9)
    const studentIds = asStringArray(body.studentIds)
    const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 500) : ''
    const homework = Array.isArray(body.homework) ? body.homework : []
    const imageTypes = body.imageTypes && typeof body.imageTypes === 'object' ? body.imageTypes : {}
    const studentRatings = body.studentRatings && typeof body.studentRatings === 'object' ? body.studentRatings : {}
    
    // New fields
    const { mood, tags, badge, overallComment } = body

    if (!summary && !overallComment && !knowledgePoints.length && !homework.length && !imageUrls.length) {
      return NextResponse.json({ error: '请至少填写课堂内容、作业或上传资料' }, { status: 400 })
    }
    if (status === 'PUBLISHED' && imageUrls.length === 0) {
      return NextResponse.json({ error: '请上传课堂资料照片后提交反馈' }, { status: 400 })
    }

    let lessonStudents: Array<{ id: string; name: string; parentId: string | null; parentUserId: string | null }> = []
    if (classLessonId) {
      const lesson = await prisma.classLesson.findFirst({
        where: { id: classLessonId, ...teacherLessonWhere(teacher.id) },
        include: {
          group: {
            include: {
              course: { select: { type: true } },
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
      feedbackGroupId = lesson.groupId
      feedbackCourseType = lesson.group.course?.type === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : 'GROUP'
    } else if (feedbackGroupId) {
      const group = await prisma.classGroup.findFirst({
        where: {
          id: feedbackGroupId,
          status: { not: 'ARCHIVED' },
          OR: [
            { teacherId: teacher.id },
            { teacherAssignments: { some: { teacherId: teacher.id } } },
          ],
        },
        include: {
          course: { select: { type: true } },
          enrollments: {
            where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
            include: { student: { select: { id: true, name: true, parentId: true, parentUserId: true } } },
          },
        },
      })
      if (!group) return NextResponse.json({ error: '班级不存在或无权限' }, { status: 403 })
      lessonStudents = group.enrollments.map((enrollment) => enrollment.student)
      feedbackCourseType = group.course.type === 'ONE_ON_ONE' ? 'ONE_ON_ONE' : 'GROUP'
    }

    const targetIds = targetType === 'CLASS'
      ? lessonStudents.map((student) => student.id)
      : studentIds
    if (!targetIds.length) return NextResponse.json({ error: '请选择学员或关联一个有学员的课次' }, { status: 400 })
    if (targetIds.length > 3) return NextResponse.json({ error: '一次最多反馈3名学生' }, { status: 400 })

    const students = lessonStudents.length
      ? lessonStudents.filter((student) => targetIds.includes(student.id))
      : []
    if (lessonStudents.length && students.length !== new Set(targetIds).size) {
      return NextResponse.json({ error: '包含不属于当前班级或课次的学员' }, { status: 403 })
    }
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
          feedbackGroupId,
          feedbackCourseType,
          targetType,
          source: 'teacher',
          studentIds: students.map((student) => student.id),
          knowledgePoints,
          summary: summary || null,
          mood: mood || null,
          tags: Array.isArray(tags) ? tags : [],
          badge: badge || null,
          overallComment: overallComment || null,
          homework,
          imageUrls,
          imageTypes,
          studentRatings,
          status,
          notifySent: status === 'PUBLISHED',
        },
      })

      // 课堂反馈里的闪光徽章需要同步到成就徽章表，家长成长页才能统计到。
      if (status === 'PUBLISHED' && badge) {
        for (const student of students) {
          await tx.achievementBadge.create({
            data: {
              studentId: student.id,
              teacherId: teacher.id,
              badgeType: badge,
              description: summary || overallComment || null,
            },
          })
        }
      }

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
          teacherId: teacher.id,
          action: status === 'PUBLISHED' ? TEACHER_LOG_ACTIONS.CLASSROOM_FEEDBACK_PUBLISH : TEACHER_LOG_ACTIONS.CLASSROOM_FEEDBACK_DRAFT,
          detail: `${students.length}名学员 · ${knowledgePoints.join('/') || '课堂反馈'}`,
          entityType: 'ClassroomFeedback',
          entityId: created.id,
          metadata: { status, targetType, studentCount: students.length, imageCount: imageUrls.length, feedbackGroupId, feedbackCourseType },
        },
      })

      return created
    })

    if (status === 'PUBLISHED') {
      await triggerFeedbackBonus(feedback.id)
    }

    revalidatePath('/teacher/dashboard')
    revalidatePath('/parent/grades')
    return NextResponse.json(feedback, { status: 201 })
})
