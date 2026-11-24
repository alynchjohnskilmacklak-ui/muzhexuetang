import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { getLocalDayRange, localDateColumnValue, localDateKey, todayLocal } from '@/lib/date/local-day'
import { visibleStudentWhere } from '@/lib/business-visibility'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { canAppendTeacherMealAttendance } from '@/lib/teacher-intensive-scheduling'
import { appendTeacherMealAttendance } from '@/lib/meal-attendance-append'
import { isCancelledOrPostponedLesson } from '@/lib/attendance-submission'
import { isFirstTeachingPeriod, normalizeSchedulePeriods } from '@/lib/schedule-periods'
import { requireCurrentTeacher, teacherLessonScopeWhere } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (request: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await request.json().catch(() => null)
  const lessonId = typeof body?.lessonId === 'string' ? body.lessonId.trim() : ''
  const rawStudentIds = body?.studentIds
  if (!lessonId || !Array.isArray(rawStudentIds) || rawStudentIds.length === 0
    || rawStudentIds.length > 300
    || rawStudentIds.some((studentId: unknown) => typeof studentId !== 'string' || !studentId.trim())) {
    return NextResponse.json({ error: '请选择要追加就餐的学员' }, { status: 400 })
  }
  const studentIds = [...new Set<string>(rawStudentIds.map((studentId: string) => studentId.trim()))]
  const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)
  if (!activeTerm) return NextResponse.json({ error: '当前没有启用的运营批次' }, { status: 409 })

  const lessonScope = await teacherLessonScopeWhere(prisma, teacher.id, activeTerm.id)
  const lesson = await prisma.classLesson.findFirst({
    where: {
      id: lessonId,
      deletedAt: null,
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      ...lessonScope,
    },
    include: {
      group: {
        include: {
          course: { select: { subject: true } },
          teacherAssignments: {
            where: { teacherId: teacher.id },
            select: { subject: true },
          },
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere },
            select: { studentId: true, subjects: true },
          },
        },
      },
      lessonStudents: { select: { studentId: true } },
      attendances: { where: { deletedAt: null }, select: { studentId: true, status: true } },
    },
  })
  if (!lesson) return NextResponse.json({ error: '不可操作此课次' }, { status: 404 })
  if (isCancelledOrPostponedLesson(lesson.status)) {
    return NextResponse.json({ error: '课次已取消或调课，不能追加就餐' }, { status: 409 })
  }

  const dateKey = localDateKey(lesson.lessonDate)
  if (dateKey !== todayLocal()) {
    return NextResponse.json({ error: '只能在当天班课中追加就餐' }, { status: 409 })
  }
  if (!canAppendTeacherMealAttendance({
    lessonDate: lesson.lessonDate,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
  })) {
    return NextResponse.json({ error: '请在当前课程进行中追加就餐' }, { status: 409 })
  }

  const { start, end } = getLocalDayRange(dateKey)
  const [scheduleConfig, dayLessons] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { id: 'singleton' }, select: { schedulePeriods: true } }),
    prisma.classLesson.findMany({
      where: {
        ...lessonScope,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        lessonDate: { gte: start, lt: end },
      },
      select: {
        id: true,
        startTime: true,
        status: true,
        attendanceSubmittedAt: true,
        hoursDeductedAt: true,
      },
    }),
  ])
  const periods = normalizeSchedulePeriods(scheduleConfig?.schedulePeriods)
  const submittedFirstPeriodIds = dayLessons
    .filter((item) => isFirstTeachingPeriod(periods, item.startTime)
      && (item.attendanceSubmittedAt || item.hoursDeductedAt || item.status === 'COMPLETED'))
    .map((item) => item.id)
  if (!submittedFirstPeriodIds.length) {
    return NextResponse.json({ error: '请先完成系统第一课节考勤及就餐上报' }, { status: 409 })
  }

  const mealDate = localDateColumnValue(dateKey)
  const firstPeriodMealReport = await prisma.studentMealAttendance.findFirst({
    where: {
      lessonId: { in: submittedFirstPeriodIds },
      mealDate,
      division: teacher.division,
    },
    select: { id: true },
  })
  if (!firstPeriodMealReport) {
    return NextResponse.json({ error: '请先完成系统第一课节考勤及就餐上报' }, { status: 409 })
  }

  const subject = lesson.subject
    || lesson.group.teacherAssignments[0]?.subject
    || lesson.group.course.subject
  const rosterStudentIds = new Set(resolveSubjectLessonStudentIds(
    lesson.lessonStudents.map((item) => item.studentId),
    lesson.group.enrollments,
    subject,
    lesson.lessonDate,
  ))
  if (studentIds.some((studentId) => !rosterStudentIds.has(studentId))) {
    return NextResponse.json({ error: '所选学员不在当前课次名单中，请刷新名单后重试' }, { status: 409 })
  }

  const ineligibleAttendanceIds = new Set(lesson.attendances
    .filter((record) => record.status !== 'PRESENT')
    .map((record) => record.studentId))
  if (studentIds.some((studentId) => ineligibleAttendanceIds.has(studentId))) {
    return NextResponse.json({ error: '已登记请假或缺勤的学员不能追加就餐' }, { status: 409 })
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    const latestAttendance = await tx.attendance.findMany({
      where: { lessonId: lesson.id, studentId: { in: studentIds }, deletedAt: null },
      select: { studentId: true, status: true },
    })
    if (latestAttendance.some((record) => record.status !== 'PRESENT')) {
      return { conflict: true as const }
    }
    const result = await appendTeacherMealAttendance(tx, {
      studentIds,
      mealDate,
      division: teacher.division,
      recordedBy: user.id,
      groupId: lesson.group.id,
      groupName: lesson.group.name,
      lessonId: lesson.id,
      teacherId: teacher.id,
      teacherName: teacher.name || '教师',
    })
    return { conflict: false as const, result }
  })
  if (transactionResult.conflict) {
    return NextResponse.json({ error: '学员考勤已更新，请刷新名单后再追加就餐' }, { status: 409 })
  }
  const result = transactionResult.result

  return NextResponse.json({
    success: true,
    ...result,
    addedCount: result.addedStudentIds.length,
    alreadyEatingCount: result.alreadyEatingStudentIds.length,
    skippedManualCount: result.skippedManualStudentIds.length,
  })
})
