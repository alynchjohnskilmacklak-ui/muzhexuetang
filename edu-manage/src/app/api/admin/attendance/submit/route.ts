import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { calculateAttendanceDeductHours } from '@/lib/attendance-hours'
import { triggerLessonPay } from '@/lib/teacher-salary'
import { resolveIntensiveActualMinutes } from '@/lib/intensive-class'
import { createIntensiveLessonPayInTransaction } from '@/lib/intensive-settlement'
import { isClassLessonInActiveTerm } from '@/lib/admin-term-scope'
import { syncAutomaticMealAttendance } from '@/lib/meal-attendance-sync'

export const dynamic = 'force-dynamic'

const VALID_STATUS = new Set(['PRESENT', 'LEAVE', 'ABSENT', 'MAKEUP'])

function normalizeStatus(status: unknown) {
  const value = String(status || '').toUpperCase()
  if (value === 'LATE') return 'PRESENT'
  return VALID_STATUS.has(value) ? value : 'PRESENT'
}

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
          enrollments: {
            where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
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
  const firstTeacherLesson = Array.isArray(mealStudentIds)
    ? await prisma.classLesson.findFirst({
        where: {
          lessonDate: lesson.lessonDate,
          status: { not: 'CANCELLED' },
          division: lesson.division,
          OR: [
            { teacherId },
            { teacherId: null, group: { teacherId } },
            { teacherId: null, group: { teacherAssignments: { some: { teacherId } } } },
          ],
        },
        select: { id: true },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      })
    : null
  if (Array.isArray(mealStudentIds) && firstTeacherLesson?.id !== lesson.id) {
    return NextResponse.json({ error: '就餐只能随该教师当天首节课登记' }, { status: 400 })
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
  const snapshotStudentIds = new Set(lesson.lessonStudents.map((item) => item.studentId))
  const enrollmentByStudentId = new Map(lesson.group.enrollments.map((enrollment) => [enrollment.studentId, enrollment]))
  const validRecords = records.filter((record) => typeof record.studentId === 'string'
    && enrollmentByStudentId.has(record.studentId)
    && (!isIntensive || snapshotStudentIds.has(record.studentId)))
  if (validRecords.length === 0) {
    return NextResponse.json({ error: '没有有效考勤记录，请检查学生是否仍在班级中' }, { status: 400 })
  }

  const alreadyDeducted = !isIntensive && (
    !!lesson.hoursDeductedAt || await prisma.attendance.count({
      where: { lessonId, hoursDeducted: { gt: 0 } },
    }) > 0
  )
  let processedCount = 0
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

      const status = normalizeStatus(record.status) as 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP'
      const actualMinutes = isIntensive ? intensiveActualMinutes : Number(record.actualMinutes) || null
      processedCount += 1

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
          const safeDeduct = Math.min(hoursDeducted, enrollment.remainHours)
          if (safeDeduct <= 0) continue
          deductedCount += 1
          await tx.attendance.update({
            where: { id: attendance.id },
            data: { hoursDeducted: safeDeduct },
          })
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { usedHours: { increment: safeDeduct }, remainHours: { decrement: safeDeduct } },
          })
          await tx.hourTransaction.create({
            data: {
              studentId,
              enrollmentId: enrollment.id,
              lessonId,
              amount: -safeDeduct,
              beforeHours: enrollment.remainHours,
              afterHours: enrollment.remainHours - safeDeduct,
              type: 'ATTENDANCE_DEDUCT',
              reason: `${lesson.group.name} 考勤扣课时`,
              operatorId: user.id,
            },
          })
        }
      }
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
            status: normalizeStatus(record.status),
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
    if (error instanceof Error && error.message === 'INTENSIVE_SETTLEMENT_LOCKED') {
      return NextResponse.json({ error: '该突击班课次已被结算，请刷新后通过结算调整流程修改' }, { status: 409 })
    }
    throw error
  }

  if (!isIntensive && !alreadyDeducted) {
    await triggerLessonPay(lessonId)
  }

  return NextResponse.json({ success: true, count: processedCount, mealCount })
})
