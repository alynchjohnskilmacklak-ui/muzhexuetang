import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { requireAdminUser } from '@/lib/teacher-portal'
import { isPayableFeedback, triggerFeedbackBonus } from '@/lib/teacher-salary'
import { divisionWhere } from '@/lib/division'

import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  try {
    const { prisma } = await requireAdminUser()
    const sp = req.nextUrl.searchParams
    const teacherId = sp.get('teacherId') || undefined
    const date = sp.get('date') || new Date().toISOString().slice(0, 10)
    const all = sp.get('all') === '1'
    const division = sp.get('division')
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit') || 100)))

    const dayStart = new Date(`${date}T00:00:00`)
    const dayEnd = new Date(dayStart.getTime() + 86400000)

    const feedbacks = await prisma.classroomFeedback.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
        ...(all ? {} : { createdAt: { gte: dayStart, lt: dayEnd } }),
        ...(division && division !== 'ALL' ? { classLesson: { division } } : {}),
      },
      include: {
        teacher: { select: { id: true, name: true } },
        classLesson: {
          include: {
            group: { include: { course: { select: { name: true, subject: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const allLessons = await prisma.classLesson.findMany({
      where: {
        lessonDate: { gte: dayStart, lt: dayEnd },
        status: { not: 'CANCELLED' },
        ...divisionWhere(division),
      },
      include: {
        teacher: { select: { id: true, name: true } },
        group: {
          include: {
            course: { select: { name: true, subject: true } },
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { student: { select: { id: true, name: true, grade: true } } },
            },
          },
        },
        classroomFeedbacks: { select: { id: true } },
      },
    })

    const allStudentIds = [...new Set(feedbacks.flatMap((feedback) => feedback.studentIds))]
    const students = allStudentIds.length
      ? await prisma.student.findMany({
          where: { id: { in: allStudentIds } },
          select: { id: true, name: true, grade: true },
        })
      : []
    const studentMap = new Map(students.map((student) => [student.id, student]))

    const teachers = await prisma.teacher.findMany({
      where: teacherId ? { id: teacherId, status: 'ACTIVE' } : { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    const feedbackTeacherIds = new Set(feedbacks.map((feedback) => feedback.teacherId))
    const teachersWithoutFeedback = all
      ? []
      : teachers.filter((teacher) => !feedbackTeacherIds.has(teacher.id))

    return NextResponse.json({
      date,
      feedbacks: feedbacks.map((feedback) => ({
        id: feedback.id,
        teacherId: feedback.teacherId,
        teacherName: feedback.teacher.name,
        lessonName: feedback.classLesson?.group?.name ?? '-',
        courseName: feedback.classLesson?.group?.course?.name ?? '-',
        subject: feedback.classLesson?.group?.course?.subject ?? '-',
        status: feedback.status,
        isValid: isPayableFeedback(feedback),
        studentIds: feedback.studentIds,
        studentCount: feedback.studentIds.length,
        students: feedback.studentIds.map((studentId) => studentMap.get(studentId)).filter(Boolean),
        knowledgePoints: feedback.knowledgePoints,
        summary: feedback.summary,
        homework: feedback.homework,
        imageUrls: feedback.imageUrls,
        studentRatings: feedback.studentRatings,
        createdAt: feedback.createdAt.toISOString(),
      })),
      lessons: allLessons.map((lesson) => ({
        id: lesson.id,
        teacherId: lesson.teacherId,
        teacherName: lesson.teacher?.name || '未分配',
        groupName: lesson.group.name,
        courseName: lesson.group.course.name,
        subject: lesson.group.course.subject,
        time: `${lesson.startTime}-${lesson.endTime}`,
        hasFeedback: lesson.classroomFeedbacks.length > 0,
        students: lesson.group.enrollments.map((e) => e.student).filter(Boolean),
      })),
      teachersWithoutFeedback: teachersWithoutFeedback.map((teacher) => ({ id: teacher.id, name: teacher.name })),
    })
  } catch (err) {
    console.error('[admin:classroom-feedback:GET]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
})

export const POST = apiHandler(async (req: NextRequest) => {
  try {
    const session = await auth()
    const user = session?.user as { id: string; role: string; name?: string | null } | undefined
    if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
    const prisma = await getRequestPrisma()

    const body = await req.json()
    const { 
      teacherId, studentIds, knowledgePoints, summary, homework, imageUrls, 
      source = 'admin', status = 'DRAFT',
      mood, tags, badge, overallComment, classLessonId
    } = body

    if (!teacherId) return NextResponse.json({ error: '缺少 teacherId' }, { status: 400 })
    if (!Array.isArray(studentIds) || !studentIds.length) return NextResponse.json({ error: '请选择学员' }, { status: 400 })

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true, name: true } })
    if (!teacher) return NextResponse.json({ error: '教师不存在' }, { status: 404 })

    const studentsData = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, parentId: true, parentUserId: true },
    })

    const feedback = await prisma.$transaction(async (tx) => {
      const created = await tx.classroomFeedback.create({
        data: {
          teacherId,
          classLessonId: classLessonId || null,
          source,
          targetType: 'CLASS',
          studentIds,
          knowledgePoints: Array.isArray(knowledgePoints) ? knowledgePoints : [],
          summary: summary || null,
          homework: Array.isArray(homework) ? homework : [],
          imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
          mood: mood || null,
          tags: Array.isArray(tags) ? tags : [],
          badge: badge || null,
          overallComment: overallComment || null,
          status,
          notifySent: status === 'PUBLISHED',
        },
      })

      if (status === 'PUBLISHED') {
        for (const student of studentsData) {
          const parentUserId = student.parentId || student.parentUserId
          if (!parentUserId) continue
          await tx.notification.create({
            data: {
              userId: parentUserId,
              type: 'CLASSROOM_FEEDBACK',
              title: `${teacher.name}老师发布了课堂反馈`,
              content: `${student.name}: ${summary || knowledgePoints?.join('、') || '课堂资料已更新'}`.slice(0, 80),
              link: '/parent/class-feedback',
              relatedType: 'CLASSROOM_FEEDBACK',
              relatedId: created.id,
              href: `/parent/class-feedback/${created.id}`,
            },
          })
        }
      }
      return created
    })

    // 管理员代发并发布时，奖励金应触发一次，归属被代发的老师。
    // triggerFeedbackBonus 自带去重（同一 feedbackId 不重复发），幂等安全。
    if (status === 'PUBLISHED') {
      const bonusResult = await triggerFeedbackBonus(feedback.id)
      if (!bonusResult.success) {
        console.warn('[admin:classroom-feedback] triggerFeedbackBonus failed:', feedback.id, bonusResult.error)
      }
    }

    revalidatePath('/teacher/dashboard')
    revalidatePath('/parent/growth')
    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '创建失败' }, { status: 500 })
  }
})
