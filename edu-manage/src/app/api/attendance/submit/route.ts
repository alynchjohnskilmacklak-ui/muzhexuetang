import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { activeEnrollmentWhere, attendanceEligibleLessonWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'
import { calculateAttendanceDeductHours } from '@/lib/attendance-hours'
import { formatHours } from '@/lib/format'

type AttendanceStatus = 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP'

const ATTENDANCE_STATUSES = new Set<string>(['PRESENT', 'LEAVE', 'ABSENT', 'MAKEUP'])

function isAttendanceStatus(status: string): status is AttendanceStatus {
  return ATTENDANCE_STATUSES.has(status)
}

const submittingLessons = new Set<string>()

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const body = await req.json()
  const { lessonId, records } = body as {
    lessonId: string
    records: { studentId: string; enrollmentId: string; status: string; actualMinutes?: number }[]
  }

  if (!lessonId || !records?.length) {
    return NextResponse.json({ error: '缺少课次ID或考勤记录' }, { status: 400 })
  }

  if (submittingLessons.has(lessonId)) {
    return NextResponse.json({ error: '该课次正在提交中，请勿重复操作' }, { status: 409 })
  }
  submittingLessons.add(lessonId)
  try {

  const lesson = await prisma.classLesson.findFirst({
    where: { id: lessonId, ...attendanceEligibleLessonWhere },
    include: { group: { include: { course: true } } },
  })
  if (!lesson) return NextResponse.json({ error: '课次不存在' }, { status: 404 })

  const group = lesson.group
  let processedCount = 0
    let deductedCount = 0
    let alreadyDeducted = false
    await prisma.$transaction(async (tx) => {
      // Check inside transaction to prevent concurrent double-deduction
      const existingDeductedCount = await tx.attendance.count({
        where: { lessonId, hoursDeducted: { gt: 0 } },
      })
      const currentLesson = await tx.classLesson.findUnique({
        where: { id: lessonId },
        select: { hoursDeductedAt: true },
      })
      alreadyDeducted = !!currentLesson?.hoursDeductedAt || existingDeductedCount > 0
      const deductedByStudent = new Map<string, number>()
      const notificationItems: Array<{
        attendanceId: string
        studentId: string
        status: AttendanceStatus
        oldStatus?: string | null
        firstNotice: boolean
        hoursToDeduct: number
      }> = []

      for (const rec of records) {
        if (!isAttendanceStatus(rec.status)) {
          throw new Error(`Invalid attendance status: ${rec.status}`)
        }

        const status = rec.status
        const actualMinutes = rec.actualMinutes != null ? Number(rec.actualMinutes) : null
        const enrollment = await tx.enrollment.findFirst({
          where: { studentId: rec.studentId, groupId: group.id, ...activeEnrollmentWhere },
        })
        if (!enrollment) continue

        const hoursToDeduct = alreadyDeducted ? 0 : calculateAttendanceDeductHours({
          status,
          courseType: group.course.type,
          lessonMinutes: group.lessonMinutes,
          actualMinutes,
        })
        deductedByStudent.set(rec.studentId, hoursToDeduct)

        const existing = await tx.attendance.findUnique({
          where: {
            attendance_lesson_student_unique: {
              lessonId,
              studentId: rec.studentId,
            },
          },
        })

        const attendance = await tx.attendance.upsert({
          where: {
            attendance_lesson_student_unique: {
              lessonId,
              studentId: rec.studentId,
            },
          },
          update: {
            status,
            enrollmentId: enrollment.id,
            actualMinutes,
            ...(alreadyDeducted ? {} : { hoursDeducted: hoursToDeduct }),
          },
          create: {
            lessonId,
            studentId: rec.studentId,
            enrollmentId: enrollment.id,
            status,
            actualMinutes,
            hoursDeducted: alreadyDeducted ? 0 : hoursToDeduct,
          },
        })
        processedCount += 1

        if (!alreadyDeducted && hoursToDeduct > 0) {
          const safeDeduct = Math.min(hoursToDeduct, enrollment.remainHours)
          if (safeDeduct <= 0) continue
          deductedCount += 1
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: {
              usedHours: { increment: safeDeduct },
              remainHours: { decrement: safeDeduct },
            },
          })
          await tx.hourTransaction.create({
            data: {
              studentId: rec.studentId,
              enrollmentId: enrollment.id,
              lessonId,
              amount: -safeDeduct,
              beforeHours: enrollment.remainHours,
              afterHours: enrollment.remainHours - safeDeduct,
              type: 'ATTENDANCE_DEDUCT',
              reason: `${group.name} 考勤扣课时`,
              operatorId: user.id,
            },
          })
        }

        if (status === 'LEAVE' && group.course.type === 'ONE_ON_ONE') {
          const existingMakeup = await tx.makeupRequest.findFirst({
            where: { attendanceId: attendance.id },
          })
          if (!existingMakeup) {
            await tx.makeupRequest.create({
              data: {
                attendanceId: attendance.id,
                studentId: rec.studentId,
                status: 'PENDING',
              },
            })
          }
        }

        const statusChanged = !!existing?.status && existing.status !== status
        const firstNotice = !existing?.notifySent
        if (firstNotice || statusChanged) {
          notificationItems.push({
            attendanceId: attendance.id,
            studentId: rec.studentId,
            status,
            oldStatus: existing?.status,
            firstNotice,
            hoursToDeduct,
          })
        }
      }

      if (processedCount === 0) {
        throw new Error('NO_VALID_ATTENDANCE_RECORDS')
      }

      const now = new Date()
      await tx.classLesson.update({
        where: { id: lessonId },
        data: {
          status: 'COMPLETED',
          attendanceSubmittedAt: now,
          hoursDeductedAt: alreadyDeducted
            ? lesson.hoursDeductedAt || now
            : deductedCount > 0
              ? now
              : null,
        },
      })

      // Notify parents of attendance records
      const studentIds = notificationItems.map((item) => item.studentId)
      const students = await tx.student.findMany({
        where: { id: { in: studentIds }, OR: [{ parentId: { not: null } }, { parentUserId: { not: null } }], ...visibleStudentWhere },
        select: { id: true, name: true, parentId: true, parentUserId: true },
      })
      const studentMap = new Map(students.map((s) => [s.id, s]))
      const statusLabel: Record<string, string> = { PRESENT: '出勤', LEAVE: '请假', ABSENT: '旷课', MAKEUP: '补课' }
      const dateStr = lesson.lessonDate.toISOString().slice(0, 10)

      for (const item of notificationItems) {
        const stu = studentMap.get(item.studentId)
        const parentUserId = stu?.parentId || stu?.parentUserId
        if (!stu || !parentUserId) continue
        const st = statusLabel[item.status] || item.status
        const oldSt = item.oldStatus ? statusLabel[item.oldStatus] || item.oldStatus : ''
        const hoursToDeduct = alreadyDeducted ? 0 : deductedByStudent.get(item.studentId) || 0
        await tx.notification.create({
          data: {
            userId: parentUserId,
            title: item.firstNotice ? '考勤通知' : '考勤已更新',
            content: item.firstNotice
              ? `${stu.name} ${dateStr}「${group.name}」${st}${hoursToDeduct > 0 ? `，扣 ${formatHours(hoursToDeduct)} 课时` : '，未扣课时'}`
              : `${stu.name} ${dateStr}「${group.name}」考勤由 ${oldSt} 修改为 ${st}`,
            type: 'ATTENDANCE',
            relatedType: 'ATTENDANCE',
            relatedId: item.attendanceId,
            studentId: item.studentId,
          },
        })
        await tx.attendance.update({
          where: { id: item.attendanceId },
          data: { notifySent: true },
        })
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: TEACHER_LOG_ACTIONS.ATTENDANCE_SUBMIT,
          detail: `${group.name} ${dateStr}，共${processedCount}人`,
          entityType: 'ClassLesson',
          entityId: lessonId,
        },
      })
    })

    return NextResponse.json({
      success: true,
      alreadyDeducted,
      processedCount,
      message: alreadyDeducted
        ? '考勤已更新，本节课已结算课时，未重复扣课时'
        : deductedCount > 0
          ? '考勤已提交，课时已结算'
          : '考勤已提交，本节课无需扣课时',
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'NO_VALID_ATTENDANCE_RECORDS') {
      return NextResponse.json({ error: '没有有效考勤记录，请检查学生是否仍在班级中' }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : '考勤提交失败' }, { status: 500 })
  } finally {
    submittingLessons.delete(lessonId)
  }
})
