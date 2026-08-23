import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, attendanceEligibleLessonWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { searchParams } = new URL(req.url)
  const teacherId = searchParams.get('teacherId')
  const dateStr = searchParams.get('date')

  const queryDate = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date()
  const todayStart = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)

  const division = getRequestDivision(user, searchParams.get('division'))
  const selectedTerm = user.role === 'admin'
    ? await resolveAdminTermScope(prisma, division, req)
    : await getActiveAcademicTerm(prisma, division)
  const where: Record<string, unknown> = {
    lessonDate: { gte: todayStart, lt: todayEnd },
    ...attendanceEligibleLessonWhere,
    ...(user.role === 'admin' ? { division } : {}),
    group: { termId: selectedTerm?.id || '__NO_SELECTED_TERM__' },
  }
  if (teacherId) {
    where.OR = [
      { teacherId },
      { teacherId: null, group: { termId: selectedTerm?.id || '__NO_SELECTED_TERM__', teacherId } },
      { teacherId: null, group: { termId: selectedTerm?.id || '__NO_SELECTED_TERM__', teacherAssignments: { some: { teacherId } } } },
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
            include: {
              student: { select: { id: true, name: true, phone: true, status: true } },
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
      lessonStudents: { include: { student: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { startTime: 'asc' },
  })

  const displayedStudentIds = [...new Set(lessons.flatMap((lesson) =>
    lesson.group.intensiveMode === 'INTENSIVE'
      ? lesson.lessonStudents.map((snapshot) => snapshot.studentId)
      : lesson.group.enrollments
          .filter((enrollment) => enrollment.status === 'ACTIVE' && enrollment.student.status !== 'INACTIVE')
          .map((enrollment) => enrollment.studentId),
  ))]
  const mealDate = new Date(`${selectedDateKey(queryDate)}T00:00:00.000Z`)
  const mealRecords = displayedStudentIds.length > 0
    ? await prisma.studentMealAttendance.findMany({
        where: { studentId: { in: displayedStudentIds }, mealDate },
        select: { studentId: true },
      })
    : []
  const eatingStudentIds = new Set(mealRecords.map((record) => record.studentId))

  const result = lessons.map((lesson) => {
    const displayEnrollments = lesson.group.intensiveMode === 'INTENSIVE'
      ? lesson.lessonStudents
          .map((snapshot) => lesson.group.enrollments.find((enrollment) => enrollment.studentId === snapshot.studentId))
          .filter((enrollment): enrollment is NonNullable<typeof enrollment> => Boolean(enrollment))
      : lesson.group.enrollments.filter((enrollment) => enrollment.status === 'ACTIVE' && enrollment.student.status !== 'INACTIVE')
    return ({
    id: lesson.id,
    lessonDate: lesson.lessonDate,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    status: lesson.status,
    intensiveMode: lesson.group.intensiveMode,
    teachingType: lesson.group.teachingType,
    plannedMinutes: lesson.plannedMinutes,
    actualMinutes: lesson.actualMinutes,
    settlementStatus: lesson.settlementStatus,
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
    students: displayEnrollments.map((e) => ({
      studentId: e.student.id,
      studentName: e.student.name,
      enrollmentId: e.id,
      remainHours: e.remainHours,
      status: lesson.attendances.find((a) => a.studentId === e.student.id)?.status || null,
      eating: eatingStudentIds.has(e.student.id),
    })),
    attendanceCount: lesson.attendances.length,
    totalStudents: displayEnrollments.length,
  })})

  return NextResponse.json(result)
})

function selectedDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
