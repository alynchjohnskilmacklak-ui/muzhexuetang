import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, attendanceEligibleLessonWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teacherId = searchParams.get('teacherId')
  const dateStr = searchParams.get('date')

  const queryDate = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date()
  const todayStart = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)

  const division = getRequestDivision(user, searchParams.get('division'))
  const where: Record<string, unknown> = {
    lessonDate: { gte: todayStart, lt: todayEnd },
    ...attendanceEligibleLessonWhere,
    ...(user.role === 'admin' ? { division } : {}),
  }
  if (teacherId) {
    where.OR = [
      { teacherId },
      { teacherId: null, group: { teacherId } },
      { teacherId: null, group: { teacherAssignments: { some: { teacherId } } } },
    ]
  }

  const lessons = await prisma.classLesson.findMany({
    where,
    include: {
      group: {
        include: {
          course: { select: { id: true, name: true, subject: true, type: true, color: true } },
          teacher: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          enrollments: {
            where: activeEnrollmentWhere,
            include: {
              student: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      },
      attendances: {
        where: {
          enrollment: activeEnrollmentWhere,
          student: activeEnrollmentWhere.student,
        },
        include: {
          student: { select: { id: true, name: true } },
          makeupRequest: true,
        },
      },
      teacher: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  const result = lessons.map((lesson) => ({
    id: lesson.id,
    lessonDate: lesson.lessonDate,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    status: lesson.status,
    group: {
      id: lesson.group.id,
      name: lesson.group.name,
      courseName: lesson.group.course.name,
      subject: lesson.group.course.subject,
      type: lesson.group.course.type,
      color: lesson.group.course.color,
      teacherId: lesson.teacher?.id || lesson.group.teacher.id,
      teacherName: lesson.teacher?.name || lesson.group.teacher.name,
      primaryTeacherName: lesson.group.teacher.name,
      roomName: lesson.group.room?.name || '未分配',
    },
    students: lesson.group.enrollments.map((e) => ({
      studentId: e.student.id,
      studentName: e.student.name,
      enrollmentId: e.id,
      remainHours: e.remainHours,
      status: lesson.attendances.find((a) => a.studentId === e.student.id)?.status || null,
    })),
    attendanceCount: lesson.attendances.length,
    totalStudents: lesson.group.enrollments.length,
  }))

  return NextResponse.json(result)
})
