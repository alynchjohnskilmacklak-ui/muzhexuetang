import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, attendanceEligibleLessonWhere, parentLinkedStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { loadLessonFeedbackBlockReasons } from '@/lib/classroom-feedback/lesson-eligibility'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if (!['admin', 'teacher', 'parent'].includes(user.role)) return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { searchParams } = new URL(req.url)
  const teacherId = searchParams.get('teacherId')
  const dateStr = searchParams.get('date')

  const localDate = dateStr || todayLocal()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return NextResponse.json({ error: '日期格式无效' }, { status: 400 })
  let dayRange: ReturnType<typeof getLocalDayRange>
  try {
    dayRange = getLocalDayRange(localDate)
  } catch {
    return NextResponse.json({ error: '日期格式无效' }, { status: 400 })
  }
  const division = getRequestDivision(user, searchParams.get('division'))
  const selectedTerm = user.role === 'admin'
    ? await resolveAdminTermScope(prisma, division, req)
    : await getActiveAcademicTerm(prisma, division)
  const where: Record<string, unknown> = {
    lessonDate: { gte: dayRange.start, lt: dayRange.end },
    ...attendanceEligibleLessonWhere,
    ...(user.role === 'admin' ? { division } : {}),
    group: { ...attendanceEligibleLessonWhere.group, termId: selectedTerm?.id || '__NO_SELECTED_TERM__' },
  }
  if (user.role === 'teacher') {
    if (!user.teacherId) return NextResponse.json({ error: '未绑定教师档案' }, { status: 403 })
    where.OR = [
      { teacherId: user.teacherId },
      { teacherId: null, group: { termId: selectedTerm?.id || '__NO_SELECTED_TERM__', teacherId: user.teacherId } },
      { teacherId: null, group: { termId: selectedTerm?.id || '__NO_SELECTED_TERM__', teacherAssignments: { some: { teacherId: user.teacherId } } } },
    ]
  } else if (user.role === 'parent') {
    const parentStudent = parentLinkedStudentWhere(user.id)
    where.OR = [
      { lessonStudents: { some: { student: parentStudent } } },
      { group: { enrollments: { some: { ...activeEnrollmentWhere, student: parentStudent } } } },
    ]
  } else if (teacherId) {
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
          teacherAssignments: { select: { teacherId: true, subject: true, teacher: { select: { id: true, name: true } } } },
          enrollments: {
            where: user.role === 'parent'
              ? { ...activeEnrollmentWhere, student: parentLinkedStudentWhere(user.id) }
              : activeEnrollmentWhere,
            include: {
              student: { select: { id: true, name: true, phone: true, status: true, deletedAt: true } },
            },
          },
        },
      },
      attendances: {
        where: {
          deletedAt: null,
          ...(user.role === 'parent'
            ? { student: parentLinkedStudentWhere(user.id) }
            : {}),
        },
        include: {
          student: { select: { id: true, name: true } },
          makeupRequest: true,
        },
      },
      teacher: { select: { id: true, name: true } },
      lessonStudents: {
        ...(user.role === 'parent' ? { where: { student: parentLinkedStudentWhere(user.id) } } : {}),
        include: { student: { select: { id: true, name: true, phone: true, status: true, deletedAt: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { startTime: 'asc' },
  })

  const rosterByLessonId = new Map(lessons.map((lesson) => {
    const lessonTeacherId = user.role === 'admin'
      ? teacherId
      : user.role === 'teacher'
        ? user.teacherId
        : lesson.teacherId || lesson.group.teacherId
    const selectedTeacherAssignment = lesson.group.teacherAssignments.find((assignment) => assignment.teacherId === lessonTeacherId)
    const subject = lesson.subject
      || lesson.group.teacherAssignments.find((assignment) => assignment.teacherId === lessonTeacherId)?.subject
      || lesson.group.course.subject
    const studentIds = new Set(resolveSubjectLessonStudentIds(
      lesson.lessonStudents.map((snapshot) => snapshot.studentId),
      lesson.group.enrollments.map((enrollment) => ({ studentId: enrollment.studentId, subjects: enrollment.subjects })),
      subject,
      lesson.lessonDate,
    ))
    return [lesson.id, { subject, studentIds, selectedTeacherAssignment }] as const
  }))
  const feedbackBlockReasonsByLesson = await loadLessonFeedbackBlockReasons(prisma, lessons.map((lesson) => ({
    id: lesson.id,
    lessonDate: lesson.lessonDate,
    studentIds: [...(rosterByLessonId.get(lesson.id)?.studentIds || [])],
  })), {
    attendanceRecords: lessons.flatMap((lesson) => lesson.attendances.map((attendance) => ({
      lessonId: lesson.id,
      studentId: attendance.studentId,
      status: attendance.status,
    }))),
  })
  const displayedStudentIds = [...new Set(lessons.flatMap((lesson) =>
    [...(rosterByLessonId.get(lesson.id)?.studentIds || [])],
  ))]
  const mealDate = new Date(`${localDate}T00:00:00.000Z`)
  const mealRecords = displayedStudentIds.length > 0
    ? await prisma.studentMealAttendance.findMany({
        where: { studentId: { in: displayedStudentIds }, mealDate },
        select: { studentId: true },
      })
    : []
  const eatingStudentIds = new Set(mealRecords.map((record) => record.studentId))

  const result = lessons.map((lesson) => {
    const lessonRoster = rosterByLessonId.get(lesson.id)
    const rosterStudentIds = lessonRoster?.studentIds || new Set<string>()
    const enrollmentByStudentId = new Map(lesson.group.enrollments.map((enrollment) => [enrollment.studentId, enrollment]))
    const snapshotStudentById = new Map(lesson.lessonStudents
      .filter((snapshot) => snapshot.student && (snapshot.student.deletedAt === null || snapshot.student.deletedAt === undefined))
      .map((snapshot) => [snapshot.studentId, snapshot.student]))
    const displayStudents = [...rosterStudentIds].flatMap((studentId) => {
      const enrollment = enrollmentByStudentId.get(studentId)
      const student = snapshotStudentById.get(studentId) || enrollment?.student
      return student && (student.deletedAt === null || student.deletedAt === undefined) ? [{ student, enrollment }] : []
    })
    const displayAttendances = lesson.attendances.filter((attendance) => rosterStudentIds.has(attendance.studentId))
    const feedbackBlockReasons = feedbackBlockReasonsByLesson.get(lesson.id) || {}
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
      subject: lessonRoster?.subject || '',
      type: lesson.group.course.type,
      color: lesson.group.course.color,
      teacherId: (user.role === 'admin' && teacherId) || lesson.teacher?.id || lesson.group.teacher.id,
      teacherName: lesson.teacher?.name || lessonRoster?.selectedTeacherAssignment?.teacher.name || lesson.group.teacher.name,
      primaryTeacherName: lesson.group.teacher.name,
      roomName: lesson.group.room?.name || '未分配',
    },
    students: displayStudents.map(({ student, enrollment }) => ({
      studentId: student.id,
      studentName: student.name,
      enrollmentId: enrollment?.id || null,
      remainHours: enrollment?.remainHours || 0,
      status: lesson.attendances.find((attendance) => attendance.studentId === student.id)?.status
        || (feedbackBlockReasons[student.id] === 'LEAVE' ? 'LEAVE' : null),
      eating: eatingStudentIds.has(student.id),
    })),
    attendanceCount: displayAttendances.length,
    totalStudents: displayStudents.length,
  })})

  return NextResponse.json(result)
})
