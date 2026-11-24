import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { calculateAttendanceDeductHours, shouldCreateMakeupRequest, termKindToBillingMode } from '@/lib/attendance-hours'
import { postAttendanceHours, refundAttendanceHours } from '@/lib/attendance-hour-posting'
import { roundHours } from '@/lib/hours'
import { isClassLessonInActiveTerm } from '@/lib/admin-term-scope'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID_STATUS = ['PRESENT', 'LEAVE', 'ABSENT', 'MAKEUP'] as const
type AdjustStatus = (typeof VALID_STATUS)[number]

class AttendanceAdjustmentConflict extends Error {}

const STATUS_LABEL: Record<AdjustStatus, string> = {
  PRESENT: '出勤',
  LEAVE: '请假',
  ABSENT: '缺勤',
  MAKEUP: '补课',
}

/**
 * 管理端更正单个学生考勤。
 * 管理员可以更正教师提交的单个学员状态，也可以对相同状态重新核对课时账。
 * - 新状态的扣课规则由课次所属批次决定（周末班请假/缺勤不扣，寒暑假批次请假/缺勤按现有规则扣）。
 * - 按目标课时与已记课时的差额冲销或补记，避免只处理零/全额两种情况。
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
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  if (!lessonId || !studentId || !VALID_STATUS.includes(newStatus)) {
    return NextResponse.json({ error: '参数不完整或考勤状态非法' }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: '请填写考勤更正原因' }, { status: 400 })
  }
  if (reason.length > 500) {
    return NextResponse.json({ error: '考勤更正原因不能超过500字' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  if (!await isClassLessonInActiveTerm(prisma, lessonId, user.division)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能更正考勤' }, { status: 409 })
  }

  const lessonScope: Prisma.ClassLessonWhereInput = {
    id: lessonId,
    division: user.division,
    deletedAt: null,
    status: { notIn: ['CANCELLED', 'POSTPONED'] },
    group: {
      division: user.division,
      term: { division: user.division, status: 'ACTIVE' },
    },
  }

  const lesson = await prisma.classLesson.findFirst({
    where: lessonScope,
    include: {
      group: {
        select: {
          name: true,
          lessonMinutes: true,
          intensiveMode: true,
          course: { select: { type: true } },
          term: { select: { kind: true } },
        },
      },
    },
  })
  if (!lesson) {
    return NextResponse.json({ error: '课次不存在、已取消或不在当前可操作批次' }, { status: 404 })
  }

  const attendanceScope: Prisma.AttendanceWhereInput = {
    lessonId,
    studentId,
    deletedAt: null,
    student: { division: user.division },
    lesson: { is: lessonScope },
  }

  const attendance = await prisma.attendance.findFirst({
    where: attendanceScope,
    include: {
      student: { select: { name: true } },
      enrollment: { select: { id: true, totalHours: true } },
    },
  })
  if (!attendance) {
    return NextResponse.json({ error: '未找到该生本节课的考勤记录' }, { status: 404 })
  }

  const oldStatus = attendance.status as AdjustStatus
  const oldDeducted = roundHours(Number(attendance.hoursDeducted || 0))
  const group = lesson.group

  const newShouldDeduct = calculateAttendanceDeductHours({
    status: newStatus,
    courseType: group.course?.type,
    lessonMinutes: group.lessonMinutes,
    actualMinutes: attendance.actualMinutes,
    intensiveMode: group.intensiveMode,
    billingMode: termKindToBillingMode(group.term?.kind),
  })
  if (oldDeducted < newShouldDeduct && !attendance.enrollmentId) throw new Error('ENROLLMENT_NOT_FOUND')

  let outcome: { noOp: boolean; refunded: number; deductedNow: number }
  try {
    outcome = await prisma.$transaction(async (tx) => {
      const needsMakeupRequest = shouldCreateMakeupRequest({
        status: newStatus,
        courseType: group.course?.type,
        intensiveMode: group.intensiveMode,
      })
      const desiredRollCallStatus = newStatus === 'ABSENT'
        ? 'ABSENT'
        : newStatus === 'LEAVE'
          ? null
          : oldStatus === newStatus && attendance.rollCallStatus === 'LATE'
            ? 'LATE'
            : 'PRESENT'
      const existingMakeup = await tx.makeupRequest.findUnique({
        where: { attendanceId: attendance.id },
      })
      const makeupNeedsSync = needsMakeupRequest
        ? !existingMakeup || existingMakeup.status === 'CANCELLED'
        : existingMakeup?.status === 'PENDING'
      const rollCallNeedsSync = attendance.rollCallStatus !== desiredRollCallStatus

      // Claim the exact attendance snapshot before touching its financial ledger.
      // The conditional UPDATE locks the row and PostgreSQL re-checks this
      // predicate after a concurrent correction commits.
      const claimed = await tx.attendance.updateMany({
        where: {
          ...attendanceScope,
          id: attendance.id,
          status: oldStatus,
          hoursDeducted: attendance.hoursDeducted,
          rollCallStatus: attendance.rollCallStatus,
        },
        data: { status: newStatus },
      })
      if (claimed.count !== 1) throw new AttendanceAdjustmentConflict('ATTENDANCE_ADJUST_CONFLICT')

      if (
        oldStatus === newStatus
        && oldDeducted === roundHours(newShouldDeduct)
        && !rollCallNeedsSync
        && !makeupNeedsSync
      ) {
        return { noOp: true, refunded: 0, deductedNow: 0 }
      }

      let refunded = 0
      let deductedNow = 0
      let recordedDeducted = oldDeducted

    // 1) 退还：已扣课时但新状态不该扣（ABSENT 或新规则下不扣）
    if (oldDeducted > newShouldDeduct) {
      if (!attendance.enrollmentId) throw new Error('ENROLLMENT_NOT_FOUND')
      const refund = await refundAttendanceHours(tx, {
        attendanceId: attendance.id,
        enrollmentId: attendance.enrollmentId,
        studentId,
        lessonId,
        operatorId: user.id,
        previousHours: oldDeducted,
        targetHours: newShouldDeduct,
        reason: `管理更正考勤（${STATUS_LABEL[oldStatus]}→${STATUS_LABEL[newStatus]}）退还课时${reason ? `：${reason}` : ''}`,
      })
      refunded = refund.refunded
      recordedDeducted = newShouldDeduct
    }

    // 2) 补扣：之前没扣，但新状态该扣（如 ABSENT 改回 PRESENT）
    if (oldDeducted < newShouldDeduct && attendance.enrollmentId) {
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
        hours: roundHours(newShouldDeduct - oldDeducted),
      })
      deductedNow = posting.posted ? posting.amount : 0
      recordedDeducted = roundHours(oldDeducted + deductedNow)
    }

    // 3) 更新状态
    const rollCallMarkedAt = desiredRollCallStatus
      ? desiredRollCallStatus === attendance.rollCallStatus && attendance.rollCallMarkedAt
        ? attendance.rollCallMarkedAt
        : new Date()
      : null
    await tx.attendance.update({
      where: { id: attendance.id },
      data: {
        status: newStatus,
        hoursDeducted: recordedDeducted,
        rollCallStatus: desiredRollCallStatus,
        rollCallMarkedAt,
      },
    })

    // 4) 让补课工单与更正后的考勤保持一致。
    if (needsMakeupRequest) {
      if (!existingMakeup) {
        await tx.makeupRequest.create({
          data: { attendanceId: attendance.id, studentId, status: 'PENDING' },
        })
      } else if (existingMakeup.status === 'CANCELLED') {
        await tx.makeupRequest.update({
          where: { id: existingMakeup.id },
          data: {
            status: 'PENDING',
            targetLessonId: null,
            makeupDate: null,
            resolvedAt: null,
            note: `考勤更正后重新生成：${reason}`,
          },
        })
      }
    } else if (existingMakeup?.status === 'PENDING') {
      await tx.makeupRequest.update({
        where: { id: existingMakeup.id },
        data: {
          status: 'CANCELLED',
          resolvedAt: new Date(),
          note: `考勤更正后无需补课：${reason}`,
        },
      })
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
      return { noOp: false, refunded, deductedNow }
    })
  } catch (error) {
    if (error instanceof AttendanceAdjustmentConflict) {
      return NextResponse.json({ error: '这条考勤刚被其他管理操作修改，请刷新后重试' }, { status: 409 })
    }
    throw error
  }

  if (outcome.noOp) {
    return NextResponse.json({ success: true, message: '当前考勤及课时已符合所属批次规则', refunded: 0, deductedNow: 0 })
  }
  const { refunded, deductedNow } = outcome

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
