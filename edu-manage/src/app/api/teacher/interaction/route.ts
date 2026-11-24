import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { ValidationError } from '@/lib/api-validate'
import { requireCurrentTeacher, teacherLessonScopeWhere } from '@/lib/teacher-portal'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'
import { loadInteractionLesson } from '@/lib/classroom-interaction-lesson'
import { isRollCallStatus } from '@/lib/classroom-interaction'
import { canWriteTeacherAttendance } from '@/lib/teacher-lesson-navigation'
import { getTeacherAttendanceSubmissionState } from '@/lib/teacher-intensive-scheduling'
import { isFirstTeachingPeriod, normalizeSchedulePeriods } from '@/lib/schedule-periods'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { visibleStudentWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

/** 点名状态 -> 考勤状态映射：迟到仍算到课，只把课堂事实记录在 rollCallStatus */
const ROLL_TO_ATTENDANCE: Record<string, 'PRESENT' | 'ABSENT'> = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'PRESENT',
}

/**
 * 教师端课堂互动 · 点名与考勤共用 Attendance。
 *
 * 设计约束（重要）：
 * 1. 点名只写 Attendance 的 status / rollCallStatus，绝不写 hoursDeducted、
 *    不创建 MakeupRequest、不设置 ClassLesson.attendanceSubmittedAt / hoursDeductedAt。
 *    课时扣减仍然只由考勤提交那一次事务完成，因此点名不会造成重复扣课时。
 * 2. 课次一旦已提交考勤（attendanceSubmittedAt 非空），点名转为只读，
 *    避免在结算之后改写考勤事实；需要修改必须走教研/管理员考勤调整。
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const lessonId = request.nextUrl.searchParams.get('lessonId')

  if (!lessonId) {
    const dateParam = request.nextUrl.searchParams.get('date')
    const dateKey = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : localDateKey(new Date())
    const { start, end } = getLocalDayRange(dateKey)
    const lessonWhere = await teacherLessonScopeWhere(prisma, teacher.id)
    const lessons = await prisma.classLesson.findMany({
      where: {
        ...lessonWhere,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        lessonDate: { gte: start, lte: end },
      },
      orderBy: [{ startTime: 'asc' }],
      select: {
        id: true,
        lessonDate: true,
        startTime: true,
        endTime: true,
        subject: true,
        status: true,
        attendanceSubmittedAt: true,
        group: {
          select: {
            name: true,
            course: { select: { name: true, subject: true } },
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
        lessonStudents: {
          select: {
            studentId: true,
            student: { select: { deletedAt: true } },
          },
        },
      },
    })
    return NextResponse.json({
      date: dateKey,
      lessons: lessons.map((lesson) => {
        const lessonSubject = lesson.subject
          || lesson.group.teacherAssignments[0]?.subject
          || lesson.group.course.subject
        const rosterStudentIds = resolveSubjectLessonStudentIds(
          lesson.lessonStudents.map((item) => item.studentId),
          lesson.group.enrollments.map((enrollment) => ({
            studentId: enrollment.studentId,
            subjects: enrollment.subjects,
          })),
          lessonSubject,
          lesson.lessonDate,
        )
        const visibleStudentIds = new Set([
          ...lesson.group.enrollments.map((enrollment) => enrollment.studentId),
          ...lesson.lessonStudents
            .filter((item) => item.student.deletedAt === null)
            .map((item) => item.studentId),
        ])

        return {
          id: lesson.id,
          lessonDate: lesson.lessonDate.toISOString(),
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          subject: lessonSubject || null,
          groupName: lesson.group.name,
          courseName: lesson.group.course.name,
          status: lesson.status,
          attendanceSubmitted: Boolean(lesson.attendanceSubmittedAt),
          studentCount: rosterStudentIds.filter((studentId) => visibleStudentIds.has(studentId)).length,
        }
      }),
    })
  }

  const bundle = await loadInteractionLesson(prisma, teacher.id, lessonId)
  if (!bundle) return NextResponse.json({ error: '不可操作此课次' }, { status: 403 })
  if (bundle.lesson.status === 'CANCELLED' || bundle.lesson.status === 'POSTPONED') {
    return NextResponse.json({ error: '课次已取消或调课，无法进入课堂互动' }, { status: 409 })
  }
  if (bundle.students.length === 0) {
    return NextResponse.json({ error: '该课次没有应到学员' }, { status: 409 })
  }

  const [lessonMeta, attendances, picks, scheduleConfig] = await Promise.all([
    prisma.classLesson.findUnique({
      where: { id: lessonId },
      select: { attendanceSubmittedAt: true, hoursDeductedAt: true, rollCallSubmittedAt: true },
    }),
    prisma.attendance.findMany({
      where: { lessonId, deletedAt: null },
      select: { studentId: true, status: true, rollCallStatus: true, rollCallMarkedAt: true },
    }),
    prisma.classroomPick.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        studentId: true,
        round: true,
        source: true,
        questionLabel: true,
        result: true,
        comment: true,
        createdAt: true,
      },
    }),
    prisma.systemConfig.findUnique({
      where: { id: 'singleton' },
      select: { schedulePeriods: true },
    }),
  ])

  const isSystemFirstPeriod = isFirstTeachingPeriod(
    normalizeSchedulePeriods(scheduleConfig?.schedulePeriods),
    bundle.lesson.startTime,
  )
  const mealDate = new Date(`${bundle.lesson.lessonDate.slice(0, 10)}T00:00:00.000Z`)
  const mealRecords = isSystemFirstPeriod
    ? await prisma.studentMealAttendance.findMany({
        where: { studentId: { in: bundle.students.map((student) => student.studentId) }, mealDate },
        select: { studentId: true, eating: true },
      })
    : []

  const submitted = Boolean(lessonMeta?.attendanceSubmittedAt)
  const settled = Boolean(lessonMeta?.hoursDeductedAt)

  return NextResponse.json({
    lesson: bundle.lesson,
    students: bundle.students,
    isSystemFirstPeriod,
    mealStudentIds: mealRecords.filter((record) => record.eating).map((record) => record.studentId),
    /// 点名直接读考勤：考勤提交后点名自动同步，无需二次录入
    attendanceSubmitted: submitted,
    attendanceSubmittedAt: lessonMeta?.attendanceSubmittedAt?.toISOString() ?? null,
    /// 点名提交是独立一步：提交前只在本地点选，提交后才写考勤并锁定点名
    rollCallSubmitted: Boolean(lessonMeta?.rollCallSubmittedAt),
    rollCallSubmittedAt: lessonMeta?.rollCallSubmittedAt?.toISOString() ?? null,
    settleLocked: settled,
    records: attendances.map((item) => ({
      studentId: item.studentId,
      status: item.status,
      rollCallStatus: item.rollCallStatus,
      markedAt: item.rollCallMarkedAt?.toISOString() ?? null,
    })),
    picks: picks.map((pick) => ({ ...pick, createdAt: pick.createdAt.toISOString() })),
    questionCount: picks.length,
    pickedCount: new Set(picks.map((pick) => pick.studentId)).size,
  })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const body = await request.json().catch(() => null) as
    | { lessonId?: string; action?: string; studentId?: string; records?: Array<{ studentId?: string; status?: string }> }
    | null
  if (!body || typeof body.lessonId !== 'string' || !body.lessonId) {
    throw new ValidationError('缺少课次')
  }
  const isReset = body.action === 'reset'
  const isLate = body.action === 'late'
  if (!isReset && !isLate && (!Array.isArray(body.records) || body.records.length === 0)) {
    throw new ValidationError('缺少点名记录')
  }

  const bundle = await loadInteractionLesson(prisma, teacher.id, body.lessonId)
  if (!bundle) return NextResponse.json({ error: '不可操作此课次' }, { status: 403 })
  if (!canWriteTeacherAttendance(bundle.lesson)) {
    const state = getTeacherAttendanceSubmissionState({
      lessonDate: bundle.lesson.lessonDate,
      startTime: bundle.lesson.startTime,
      endTime: bundle.lesson.endTime,
      intensiveMode: bundle.lesson.intensiveMode,
    })
    return NextResponse.json({
      error: state === 'CLOSED'
        ? '教师考勤需在课程当天 18:00 前提交，超时请联系管理员补录'
        : state === 'UPCOMING'
          ? '常规课程开课前 30 分钟开放考勤，突击班开课后开放'
          : '课次时间无效，暂不能提交考勤',
    }, { status: 409 })
  }

  const lesson = await prisma.classLesson.findUnique({
    where: { id: body.lessonId },
    select: { attendanceSubmittedAt: true, hoursDeductedAt: true, groupId: true, rollCallSubmittedAt: true },
  })
  if (!lesson) return NextResponse.json({ error: '课次不存在' }, { status: 404 })
  if (lesson.attendanceSubmittedAt || lesson.hoursDeductedAt) {
    return NextResponse.json(
      { error: '本节课考勤已提交，点名已锁定。如需修改请到考勤调整。' },
      { status: 409 },
    )
  }

  // 撤销提交：只解锁点名，不动已经写入的出勤事实
  if (isReset) {
    await prisma.classLesson.update({
      where: { id: body.lessonId },
      data: { rollCallSubmittedAt: null },
    })
    return NextResponse.json({ ok: true, rollCallSubmitted: false, rollCallSubmittedAt: null })
  }

  // 提交后学员才到：允许把缺勤补记成迟到，不必撤销整次点名
  if (isLate) {
    if (!lesson.rollCallSubmittedAt) {
      return NextResponse.json({ error: '点名尚未提交，直接改状态即可' }, { status: 409 })
    }
    if (typeof body.studentId !== 'string' || !body.studentId) {
      throw new ValidationError('缺少学员')
    }
    const target = await prisma.attendance.findFirst({
      where: { lessonId: body.lessonId, studentId: body.studentId, deletedAt: null },
      select: { id: true, status: true, rollCallStatus: true },
    })
    if (!target) return NextResponse.json({ error: '该学员本节课没有出勤记录' }, { status: 404 })
    if (target.rollCallStatus !== 'ABSENT' && target.status !== 'ABSENT') {
      return NextResponse.json({ error: '只有缺勤的学员可以补记为迟到' }, { status: 409 })
    }
    await prisma.attendance.update({
      where: { id: target.id },
      data: { status: 'PRESENT', rollCallStatus: 'LATE', rollCallMarkedAt: new Date() },
    })
    return NextResponse.json({ ok: true, studentId: body.studentId, status: 'PRESENT', rollCallStatus: 'LATE' })
  }

  if (lesson.rollCallSubmittedAt) {
    return NextResponse.json(
      { error: '本节课点名已提交，如需改动请先撤销提交' },
      { status: 409 },
    )
  }

  const rosterIds = new Set(bundle.students.map((student) => student.studentId))
  const rawRecords = body.records ?? []
  if (rawRecords.length > bundle.students.length) {
    throw new ValidationError('点名记录超出应到人数')
  }

  const records = rawRecords.map((record) => {
    if (!record || typeof record.studentId !== 'string' || !rosterIds.has(record.studentId)) {
      throw new ValidationError('点名名单与课次应到学员不一致')
    }
    if (!isRollCallStatus(record.status)) {
      throw new ValidationError('点名状态不合法')
    }
    return { studentId: record.studentId, rollStatus: record.status }
  })

  // 请假是家长提交的考勤事实，点名不能越过它直接改成到课
  const leaveRows = await prisma.attendance.findMany({
    where: {
      lessonId: body.lessonId,
      deletedAt: null,
      status: 'LEAVE',
      rollCallStatus: null,
      studentId: { in: records.map((record) => record.studentId) },
    },
    select: { studentId: true },
  })
  if (leaveRows.length > 0) {
    return NextResponse.json(
      { error: '名单中包含已请假的学员，点名不改动考勤；实际到课请到考勤页调整' },
      { status: 409 },
    )
  }

  const markedAt = new Date()
  const enrollmentByStudent = new Map<string, string>()
  const enrollments = await prisma.enrollment.findMany({
    where: {
      groupId: lesson.groupId,
      studentId: { in: records.map((record) => record.studentId) },
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: { id: true, studentId: true },
  })
  for (const enrollment of enrollments) enrollmentByStudent.set(enrollment.studentId, enrollment.id)

  await prisma.$transaction([
    ...records.map((record) => {
      const attendanceStatus = ROLL_TO_ATTENDANCE[record.rollStatus]
      const enrollmentId = enrollmentByStudent.get(record.studentId) ?? null
      return prisma.attendance.upsert({
        where: {
          attendance_lesson_student_unique: {
            lessonId: body.lessonId!,
            studentId: record.studentId,
          },
        },
        create: {
          lessonId: body.lessonId!,
          studentId: record.studentId,
          enrollmentId,
          status: attendanceStatus,
          rollCallStatus: record.rollStatus,
          rollCallMarkedAt: markedAt,
        },
        update: {
          status: attendanceStatus,
          rollCallStatus: record.rollStatus,
          rollCallMarkedAt: markedAt,
          ...(enrollmentId ? { enrollmentId } : {}),
        },
      })
    }),
    // 与出勤事实同一次事务落"点名已提交"，避免写一半就锁上
    prisma.classLesson.update({
      where: { id: body.lessonId },
      data: { rollCallSubmittedAt: markedAt },
    }),
  ])

  return NextResponse.json({
    ok: true,
    saved: records.length,
    markedAt: markedAt.toISOString(),
    rollCallSubmitted: true,
    rollCallSubmittedAt: markedAt.toISOString(),
    records: records.map((record) => ({
      studentId: record.studentId,
      status: ROLL_TO_ATTENDANCE[record.rollStatus],
      rollCallStatus: record.rollStatus,
    })),
  })
})
