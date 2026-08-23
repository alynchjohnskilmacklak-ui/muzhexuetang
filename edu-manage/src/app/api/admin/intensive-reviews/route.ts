import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '仅管理员可以审核个性化课程' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, request.nextUrl.searchParams.get('division'))
  const selectedTerm = await resolveAdminTermScope(prisma, division, request)
  const termId = selectedTerm?.id || '__NO_SELECTED_TERM__'
  const requestedStatus = request.nextUrl.searchParams.get('status')
  const status = requestedStatus === 'APPROVED' || requestedStatus === 'REJECTED'
    ? requestedStatus
    : 'PENDING'

  const [reviews, pendingCount] = await Promise.all([
    prisma.intensiveLessonReview.findMany({
      where: {
        status,
        lesson: {
          division,
          group: { intensiveMode: 'INTENSIVE', termId },
        },
      },
      include: {
        lesson: {
          include: {
            group: {
              include: {
                course: { select: { name: true, subject: true, grade: true } },
              },
            },
            teacher: { select: { id: true, name: true } },
            attendances: {
              include: {
                student: { select: { id: true, name: true, grade: true } },
                enrollment: { select: { remainHours: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    }),
    prisma.intensiveLessonReview.count({
      where: {
        status: 'PENDING',
        lesson: {
          division,
          group: { intensiveMode: 'INTENSIVE', termId },
        },
      },
    }),
  ])

  return NextResponse.json({
    division,
    term: selectedTerm,
    status,
    pendingCount,
    reviews: reviews.map((review) => ({
      id: review.id,
      lessonId: review.lessonId,
      revision: review.revision,
      status: review.status,
      teacherId: review.teacherId,
      teacherName: review.lesson.teacher?.name || review.lesson.group.teacherId,
      groupName: review.lesson.group.name,
      subject: review.lesson.subject || review.lesson.group.course.subject,
      grade: review.lesson.group.course.grade,
      lessonDate: review.lesson.lessonDate,
      startTime: review.lesson.startTime,
      endTime: review.lesson.endTime,
      plannedMinutes: review.lesson.plannedMinutes,
      actualMinutes: review.actualMinutes,
      teacherNote: review.teacherNote,
      submittedAt: review.submittedAt,
      reviewedAt: review.reviewedAt,
      reviewNote: review.reviewNote,
      students: review.lesson.attendances.map((attendance) => ({
        id: attendance.student.id,
        name: attendance.student.name,
        grade: attendance.student.grade,
        status: attendance.status,
        remainHours: attendance.enrollment?.remainHours || 0,
      })),
    })),
  })
})
