import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { calculateAttendanceDeductHours, shouldCreateMakeupRequest } from '@/lib/attendance-hours'
import { postAttendanceHours } from '@/lib/attendance-hour-posting'
import { roundHours } from '@/lib/hours'
import { syncStudentHourSnapshot } from '@/lib/student-hour-snapshot'

export const dynamic = 'force-dynamic'

const VALID_STATUS = ['PRESENT', 'LEAVE', 'ABSENT', 'MAKEUP'] as const
type AdjustStatus = (typeof VALID_STATUS)[number]

const STATUS_LABEL: Record<AdjustStatus, string> = {
  PRESENT: '出勤',
  LEAVE: '请假',
  ABSENT: '缺勤',
  MAKEUP: '补课',
}

/**
 * 管理端更正单个学生考勤。
 * 场景：教师把没来的学生记成了出勤，管理发现后改成缺勤，并把这节课已扣的课时退还。
 * - 改成 ABSENT：该生这节课课时一律不扣；已扣的全额退还（预付费退回剩余课时，累计制冲减已用课时）。
 * - 其他状态：按原扣课规则处理（首次补扣；若已扣但新状态不该扣则退还）。
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '仅管理员可更正考勤' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const lessonId = typeof body.lessonId === 'string' ? body.lessonId : ''
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const newStatus = String(body.newStatus || '').toUpperCase() as AdjustStatus
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null

  if (!lessonId || !studentId || !VALID_STATUS.includes(newStatus)) {
    return NextResponse.json({ error: '参数不完整或考勤状态非法' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()

  const attendance = await prisma.attendance.findFirst({
    where: { lessonId, studentId, deletedAt: null },
    include: {
      student: { select: { name: true } },
      enrollment: { select: { id: true, totalHours: true } },
    },
  })
  if (!attendance) {
    return NextResponse.json({ error: '未找到该生本节课的考勤记录' }, { status: 404 })
  }

  const lesson = await prisma.classLesson.findUnique({
    where: { id: lessonId },
    include: {
      group: { select: { name: true, lessonMinutes: true, intensiveMode: true, course: { select: { type: true } } } },
    },
  })
  if (!lesson) {
    return NextResponse.json({ error: '课次不存在' }, { status: 404 })
  }

  const oldStatus = attendance.status as AdjustStatus
  if (oldStatus === newStatus) {
    return NextResponse.json({ error: '考勤状态未变化' }, { status: 400 })
  }

  const oldDeducted = roundHours(Number(attendance.hoursDeducted || 0))
  const group = lesson.group

  // 新状态该不该扣课时；ABSENT 一律不扣（学生没来不应扣课时）
  const newShouldDeduct = newStatus === 'ABSENT'
    ? 0
    : calculateAttendanceDeductHours({
        status: newStatus,
        courseType: group.course?.type,
        lessonMinutes: group.lessonMinutes,
        actualMinutes: attendance.actualMinutes,
        intensiveMode: group.intensiveMode,
      })

  let refunded = 0
  let deductedNow = 0
  let balanceBefore = 0
  let balanceAfter = 0

  await prisma.$transaction(async (tx) => {
    // 1) 退还：已扣课时但新状态不该扣（ABSENT 或新规则下不扣）
    if (oldDeducted > 0 && newShouldDeduct <= 0) {
      const enrollment = await tx.enrollment.findUnique({
        where: { id: attendance.enrollmentId || undefined },
        select: { remainHours: true, usedHours: true, totalHours: true },
      })
      if (!enrollment || !attendance.enrollmentId) throw new Error('ENROLLMENT_NOT_FOUND')

      const enrollmentPk = attendance.enrollmentId
      const isPrepaid = Number(enrollment.totalHours || 0) > 0
      balanceBefore = isPrepaid ? roundHours(Number(enrollment.remainHours || 0)) : roundHours(Number(enrollment.usedHours || 0))

      if (isPrepaid) {
        await tx.enrollment.update({
          where: { id: enrollmentPk },
          data: {
            remainHours: { increment: oldDeducted },
            usedHours: { decrement: oldDeducted },
          },
        })
        balanceAfter = roundHours(balanceBefore + oldDeducted)
      } else {
        await tx.enrollment.update({
          where: { id: enrollmentPk },
          data: { usedHours: { decrement: oldDeducted } },
        })
        balanceAfter = roundHours(Math.max(0, balanceBefore - oldDeducted))
      }
      refunded = oldDeducted

      await tx.attendance.update({
        where: { id: attendance.id },
        data: { hoursDeducted: 0 },
      })
      await tx.hourTransaction.create({
        data: {
          studentId: attendance.studentId,
          enrollmentId: attendance.enrollmentId,
          lessonId,
          amount: oldDeducted,
          beforeHours: balanceBefore,
          afterHours: balanceAfter,
          type: 'ATTENDANCE_REFUND',
          reason: `管理更正考勤（${STATUS_LABEL[oldStatus]}→${STATUS_LABEL[newStatus]}）退还课时${reason ? `：${reason}` : ''}`,
          operatorId: user.id,
        },
      })
    }

    // 2) 补扣：之前没扣，但新状态该扣（如 ABSENT 改回 PRESENT）
    if (oldDeducted <= 0 && newShouldDeduct > 0 && attendance.enrollmentId) {
      const enrollment = await tx.enrollment.findUnique({
        where: { id: attendance.enrollmentId },
        select: { totalHours: true },
      })
      const posting = await postAttendanceHours(tx, {
        attendanceId: attendance.id,
        enrollmentId: attendance.enrollmentId,
        enrollmentTotalHours: Number(enrollment?.totalHours || 0),
        studentId,
        lessonId,
        groupName: group.name,
        operatorId: user.id,
        hours: newShouldDeduct,
      })
      deductedNow = posting.posted ? posting.amount : 0
    }

    // 3) 更新状态
    await tx.attendance.update({
      where: { id: attendance.id },
      data: { status: newStatus },
    })

    // 4) 请假/缺勤生成补课申请（与教师端规则一致）
    if (shouldCreateMakeupRequest({ status: newStatus, courseType: group.course?.type, intensiveMode: group.intensiveMode })) {
      const existingMakeup = await tx.makeupRequest.findFirst({ where: { attendanceId: attendance.id } })
      if (!existingMakeup) {
        await tx.makeupRequest.create({
          data: { attendanceId: attendance.id, studentId, status: 'PENDING' },
        })
      }
    }

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_ATTENDANCE_ADJUST',
        detail: `${attendance.student?.name || '学员'} · ${group.name}：${STATUS_LABEL[oldStatus]}→${STATUS_LABEL[newStatus]}${refunded > 0 ? `（退还${refunded}课时）` : ''}${reason ? `：${reason}` : ''}`,
        entityType: 'Attendance',
        entityId: attendance.id,
        metadata: { lessonId, oldStatus, newStatus, oldDeducted, refunded, deductedNow, reason },
      },
    })
    if (refunded > 0 || deductedNow > 0) await syncStudentHourSnapshot(tx, studentId)
  })

  return NextResponse.json({
    success: true,
    message: refunded > 0
      ? `已更正为「${STATUS_LABEL[newStatus]}」，并退还 ${refunded} 课时`
      : deductedNow > 0
        ? `已更正为「${STATUS_LABEL[newStatus]}」，补扣 ${deductedNow} 课时`
        : `已更正为「${STATUS_LABEL[newStatus]}」`,
    refunded,
    deductedNow,
  })
})
