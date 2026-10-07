import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { calculateAttendanceDeductHours } from '@/lib/attendance-hours'
import { createLessonPayInTransaction } from '@/lib/teacher-salary'
import { postAttendanceHours } from '@/lib/attendance-hour-posting'
import { normalizeAttendanceRecordStatus } from '@/lib/attendance-status'
import { resolveIntensiveActualMinutes } from '@/lib/intensive-class'
import { createIntensiveLessonPayInTransaction } from '@/lib/intensive-settlement'
import { isClassLessonInActiveTerm } from '@/lib/admin-term-scope'
import { syncAutomaticMealAttendance } from '@/lib/meal-attendance-sync'
import { isFirstTeachingPeriod, normalizeSchedulePeriods } from '@/lib/schedule-periods'
import { hasAttendingStudent } from '@/lib/attendance-submission'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()

  const { lessonId, records, mealStudentIds } = await req.json() as {
    lessonId?: string
    records?: { studentId?: string; status?: string; actualMinutes?: number }[]
    mealStudentIds?: string[]
  }

  if (!lessonId || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: '缺少 lessonId 或考勤记录' }, { status: 400 })
  }
  if (!await isClassLessonInActiveTerm(prisma, lessonId)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能补交或修改考勤' }, { status: 409 })
  }

  const lesson = await prisma.classLesson.findFirst({
    where: { id: lessonId, status: { not: 'CANCELLED' } },
    include: {
      group: {
        include: {
          course: true,
          teacher: { select: { id: true, name: true } },
          teacherAssignments: { select: { teacherId: true, subject: true } },
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null, student: { status: { not: 'INACTIVE' } } },
          },
        },
      },
      lessonStudents: { select: { studentId: true } },
      teacher: { select: { id: true, name: true } },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: '课次不存在或已取消' }, { status: 404 })
  }

  const teacherId = lesson.teacherId || lesson.group.teacherId
  if (Array.isArray(mealStudentIds)) {
    const scheduleConfig = await prisma.systemConfig.findUnique({
      where: { id: 'singleton' },
      select: { schedulePeriods: true },
    })
    const isSystemFirstPeriod = isFirstTeachingPeriod(
      normalizeSchedulePeriods(scheduleConfig?.schedulePeriods),
      lesson.startTime,
    )
    if (!isSystemFirstPeriod) {
      return NextResponse.json({ error: '就餐只能随系统第一课节登记' }, { status: 400 })
    }
  }

  const [lessonHour, lessonMinute = 0] = (lesson.startTime || '00:00').split(':').map(Number)
  const lessonStart = new Date(lesson.lessonDate)
  lessonStart.setHours(lessonHour, lessonMinute, 0, 0)
  const earliestAllowed = new Date(lessonStart.getTime() - 30 * 60 * 1000)
  if (new Date() < earliestAllowed) {
    return NextResponse.json(
      { error: `未到考勤时间，课程 ${lesson.startTime} 开始，最早 30 分钟前可提交` },
      { status: 400 }
    )
  }

  const isIntensive = lesson.group.intensiveMode === 'INTENSIVE'
  if (isIntensive && lesson.settlementStatus !== 'UNSETTLED') {
    return NextResponse.json({ error: '该突击班课次已经结算，如需修改实际分钟请使用结算调整流程' }, { status: 409 })
  }
  if (isIntensive && lesson.intensiveReviewStatus === 'PENDING') {
    return NextResponse.json({ error: '教师已经提交授课审核，请在个性化课程审核区处理，不能绕过审核直接结算' }, { status: 409 })
  }
  const lessonSubject = lesson.subject
    || lesson.group.teacherAssignments.find((assignment) => assignment.teacherId === teacherId)?.subject
    || lesson.group.course.subject
  const rosterStudentIds = new Set(resolveSubjectLessonStudentIds(
    lesson.lessonStudents.map((item) => item.studentId),
    lesson.group.enrollments,
    lessonSubject,
    lesson.lessonDate,
  ))
  const enrollmentByStudentId = new Map(lesson.group.enrollments.map((enrollment) => [enrollment.studentId, enrollment]))
  const validRecords = records.filter((record) => typeof record.studentId === 'string'
    && enrollmentByStudentId.has(record.studentId)
    && rosterStudentIds.has(record.studentId))
  if (validRecords.length === 0) {
    return NextResponse.json({ error: '没有本节学科的有效考勤记录，请先核对学员报名学科与课次名单' }, { status: 400 })
  }
  if (!hasAttendingStudent(validRecords)) {
    return NextResponse.json({ error: '本次课没有实际出勤学员，不能提交已上课考勤；请取消或调整课次' }, { status: 400 })
  }

  const alreadyDeducted = !isIntensive && (
    !!lesson.hoursDeductedAt || await prisma.attendance.count({
      where: { lessonId, hoursDeducted: { gt: 0 } },
    }) > 0
  )
  let processedCount = 0
  let presentCount = 0
  let deductedCount = 0
  let mealCount = 0
  const now = new Date()
  const intensiveActualMinutes = isIntensive
    ? resolveIntensiveActualMinutes(
        lesson.plannedMinutes || lesson.group.lessonMinutes,
        validRecords.map((record) => record.actualMinutes),
      )
    : null

  try {
    await prisma.$transaction(async (tx) => {
    if (isIntensive) {
      const claimed = await tx.classLesson.updateMany({
        where: { id: lessonId, settlementStatus: 'UNSETTLED' },
        data: { settlementStatus: 'SETTLED' },
      })
      if (claimed.count !== 1) throw new Error('INTENSIVE_SETTLEMENT_LOCKED')
    }

    for (const record of validRecords) {
      const studentId = typeof record.studentId === 'string' ? record.studentId : ''
      const enrollment = enrollmentByStudentId.get(studentId)
      if (!enrollment) continue

      const status = normalizeAttendanceRecordStatus(record.status)
      const actualMinutes = isIntensive ? intensiveActualMinutes : Number(record.actualMinutes) || null
      processedCount += 1
      if (status === 'PRESENT') presentCount += 1

      const attendance = await tx.attendance.upsert({
        where: {
          attendance_lesson_student_unique: {
            lessonId,
            studentId,
          },
        },
        update: { status, enrollmentId: enrollment.id, actualMinutes },
        create: { lessonId, studentId, enrollmentId: enrollment.id, status, actualMinutes },
      })

      if (!alreadyDeducted) {
        const hoursDeducted = calculateAttendanceDeductHours({
          status,
          courseType: lesson.group.course.type,
          lessonMinutes: lesson.group.lessonMinutes,
          actualMinutes,
          intensiveMode: lesson.group.intensiveMode,
        })
        if (hoursDeducted > 0 && (!attendance.hoursDeducted || attendance.hoursDeducted <= 0)) {
          const posting = await postAttendanceHours(tx, {
            attendanceId: attendance.id,
            enrollmentId: enrollment.id,
            enrollmentTotalHours: Number(enrollment.totalHours || 0),
            studentId,
            lessonId,
            groupName: lesson.group.name,
            operatorId: user.id,
            hours: hoursDeducted,
          })
          if (!posting.posted) continue
          deductedCount += 1
        }
      }
    }
    if (presentCount === 0) {
      throw new Error('NO_ATTENDING_STUDENTS')
    }
    if (Array.isArray(mealStudentIds)) {
      const eligibleStudentIds = validRecords
        .map((record) => record.studentId)
        .filter((studentId): studentId is string => typeof studentId === 'string')
      const selectedMealIds = [...new Set(mealStudentIds)].filter((studentId) => eligibleStudentIds.includes(studentId))
      const mealDate = new Date(`${lesson.lessonDate.toISOString().slice(0, 10)}T00:00:00.000Z`)
      await syncAutomaticMealAttendance(tx, {
        eligibleStudentIds,
        eatingStudentIds: selectedMealIds,
        mealDate,
        division: lesson.division,
        recordedBy: user.id,
        groupId: lesson.group.id,
        groupName: lesson.group.name,
        lessonId: lesson.id,
        teacherId: teacherId || lesson.group.teacher.id,
        teacherName: lesson.teacher?.name || lesson.group.teacher.name,
        notes: '考勤首节课同步上报',
      })
      mealCount = selectedMealIds.length
    }
    await tx.classLesson.update({
      where: { id: lessonId },
      data: {
        status: 'COMPLETED',
        attendanceSubmittedAt: now,
        actualMinutes: isIntensive ? intensiveActualMinutes : undefined,
        settlementStatus: isIntensive ? 'SETTLED' : undefined,
        intensiveReviewStatus: isIntensive ? 'APPROVED' : undefined,
        hoursDeductedAt: alreadyDeducted
          ? lesson.hoursDeductedAt || now
          : deductedCount > 0
            ? now
            : null,
      },
    })

    if (!isIntensive) {
      const lessonPay = await createLessonPayInTransaction(tx, lessonId)
      if (!lessonPay.success) throw new Error(lessonPay.error || 'LESSON_PAY_FAILED')
    }

    if (isIntensive) {
      const latestReview = await tx.intensiveLessonReview.findFirst({
        where: { lessonId },
        select: { revision: true },
        orderBy: { revision: 'desc' },
      })
      const review = await tx.intensiveLessonReview.create({
        data: {
          lessonId,
          revision: (latestReview?.revision || 0) + 1,
          teacherId: lesson.teacherId || lesson.group.teacherId,
          submittedById: user.id,
          actualMinutes: Number(intensiveActualMinutes),
          attendanceSnapshot: validRecords.map((record) => ({
            studentId: record.studentId,
            status: normalizeAttendanceRecordStatus(record.status),
          })),
          teacherNote: '管理员直接登记并审核',
          status: 'APPROVED',
          reviewedById: user.id,
          reviewedAt: now,
          reviewNote: '管理员直接登记并审核',
        },
      })
      await createIntensiveLessonPayInTransaction(tx, lessonId)
      await tx.activityLog.create({
        data: {
          userId: user.id,
          teacherId: lesson.teacherId || lesson.group.teacherId,
          action: 'INTENSIVE_ADMIN_DIRECT_APPROVE',
          detail: `${lesson.group.name} · 管理员直接登记并审核${intensiveActualMinutes}分钟`,
          entityType: 'IntensiveLessonReview',
          entityId: review.id,
          metadata: { lessonId, actualMinutes: intensiveActualMinutes },
        },
      })
    }
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ATTENDING_STUDENTS') {
      return NextResponse.json({ error: '本次课没有实际出勤学员，不能提交已上课考勤；请取消或调整课次' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'INTENSIVE_SETTLEMENT_LOCKED') {
      return NextResponse.json({ error: '该突击班课次已被结算，请刷新后通过结算调整流程修改' }, { status: 409 })
    }
    throw error
  }

  return NextResponse.json({ success: true, count: processedCount, mealCount })
})
