import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher, teacherStudentWhere } from '@/lib/teacher-portal'
import { createNotification } from '@/lib/notifications'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'
import { calculateAttendanceDeductHours, termKindToBillingMode } from '@/lib/attendance-hours'
import { postAttendanceHours, refundAttendanceHours } from '@/lib/attendance-hour-posting'
import { roundHours } from '@/lib/hours'
import type { Prisma } from '@prisma/client'

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || !['admin', 'teacher'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const prisma = await getRequestPrisma()
  const { id } = await params
  const userId = user.id
  const role = user.role
  const body = await req.json().catch(() => ({}))
  const { status } = body as { status?: unknown }
  const replyNote = typeof body.replyNote === 'string' ? body.replyNote.trim() : ''

  if (typeof status !== 'string' || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: '无效的状态' }, { status: 400 })
  }
  if (replyNote.length > 1000) return NextResponse.json({ error: '审批说明不能超过1000字' }, { status: 400 })

  const teacherScope: Prisma.LeaveRequestWhereInput = role === 'teacher'
    ? { student: teacherStudentWhere((await requireCurrentTeacher()).teacher.id) }
    : { student: { division: user.division } }

  const target = await prisma.leaveRequest.findFirst({
    where: { id, deletedAt: null, ...teacherScope },
    select: { id: true, status: true },
  })
  if (!target) {
    return NextResponse.json({ error: '请假申请不存在或无权限处理' }, { status: 404 })
  }
  if (target.status !== 'pending') {
    return NextResponse.json({ error: '该请假申请已处理，请刷新列表' }, { status: 409 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.leaveRequest.updateMany({
      where: { id: target.id, deletedAt: null, status: 'pending', ...teacherScope },
      data: {
        status,
        replyNote: replyNote || null,
        repliedAt: new Date(),
        repliedBy: userId,
      },
    })
    if (claimed.count !== 1) return null

    const approved = await tx.leaveRequest.findFirst({
      where: { id: target.id, deletedAt: null },
      include: {
        student: { select: { id: true, name: true, parentId: true, parentUserId: true } },
        lesson: {
          select: {
            id: true,
            lessonDate: true,
            startTime: true,
            group: {
              select: {
                name: true,
                lessonMinutes: true,
                intensiveMode: true,
                course: { select: { name: true, type: true } },
                term: { select: { kind: true } },
              },
            },
          },
        },
      },
    })
    if (!approved) throw new Error('请假申请更新后无法读取')

    // Approved leave overrides a previous PRESENT result. Reconcile the
    // existing posting with the batch's leave rule inside this transaction:
    // weekend batches refund the already charged hours; holiday batches keep
    // their monthly charge.
    if (status === 'approved') {
      const leaveDay = getLocalDayRange(localDateKey(approved.leaveDate))
      const attendanceWhere: Prisma.AttendanceWhereInput = {
        studentId: approved.student.id,
        deletedAt: null,
        status: { in: ['PRESENT', 'LEAVE'] },
        ...(approved.lessonId ? { lessonId: approved.lessonId } : {}),
        lesson: {
          is: {
            ...(approved.lessonId ? {} : { lessonDate: { gte: leaveDay.start, lt: leaveDay.end } }),
            deletedAt: null,
            status: { notIn: ['CANCELLED', 'POSTPONED'] },
          },
        },
      }
      const attendanceRows = await tx.attendance.findMany({
        where: attendanceWhere,
        include: {
          enrollment: { select: { id: true, totalHours: true } },
          lesson: {
            select: {
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
          },
        },
      })

      for (const attendance of attendanceRows) {
        const attendanceLessonId = attendance.lessonId
        if (!attendanceLessonId) throw new Error('ATTENDANCE_LESSON_NOT_FOUND')
        const group = attendance.lesson?.group
        const targetHours = group ? calculateAttendanceDeductHours({
          status: 'LEAVE',
          courseType: group.course?.type,
          lessonMinutes: group.lessonMinutes,
          actualMinutes: attendance.actualMinutes,
          intensiveMode: group.intensiveMode,
          billingMode: termKindToBillingMode(group.term?.kind),
        }) : 0
        const previousHours = roundHours(Number(attendance.hoursDeducted || 0))
        const normalizedTarget = roundHours(targetHours)
        let recordedHours = previousHours

        if (previousHours > normalizedTarget) {
          if (!attendance.enrollmentId) throw new Error('ENROLLMENT_NOT_FOUND')
          await refundAttendanceHours(tx, {
            attendanceId: attendance.id,
            enrollmentId: attendance.enrollmentId,
            studentId: approved.student.id,
            lessonId: attendanceLessonId,
            operatorId: userId,
            previousHours,
            targetHours: normalizedTarget,
            reason: `批准请假（${group?.name || '课堂'}）退还课时`,
          })
          recordedHours = normalizedTarget
        } else if (previousHours < normalizedTarget && attendance.enrollmentId && group) {
          const posting = await postAttendanceHours(tx, {
            attendanceId: attendance.id,
            enrollmentId: attendance.enrollmentId,
            enrollmentTotalHours: Number(attendance.enrollment?.totalHours || 0),
            studentId: approved.student.id,
            lessonId: attendanceLessonId,
            groupName: group.name,
            operatorId: userId,
            hours: roundHours(normalizedTarget - previousHours),
          })
          if (posting.posted) recordedHours = roundHours(previousHours + posting.amount)
        }

        await tx.attendance.update({
          where: { id: attendance.id },
          data: { status: 'LEAVE', hoursDeducted: recordedHours },
        })
      }
    }

    const parentUserId = approved.student.parentId || approved.student.parentUserId
    if (parentUserId) {
      await createNotification(tx, {
        userId: parentUserId,
        title: status === 'approved' ? '请假申请已批准' : '请假申请未通过',
        content: `${approved.student.name} ${new Date(approved.leaveDate).toLocaleDateString('zh-CN')} 的请假申请${status === 'approved' ? '已批准' : '未通过'}。${replyNote ? `回执：${replyNote}` : ''}`,
        type: 'leave',
        studentId: approved.student.id,
        senderId: userId,
        relatedType: 'LEAVE_REQUEST',
        relatedId: approved.id,
        href: '/parent/leave',
        pushStatus: 'none',
      })
    }

    await tx.activityLog.create({
      data: {
        userId,
        action: status === 'approved' ? '批准请假' : '拒绝请假',
        detail: `${approved.student.name} - ${approved.reason}`,
        entityType: 'LeaveRequest',
        entityId: id,
      },
    })

    return approved
  })

  if (!updated) return NextResponse.json({ error: '该请假申请已被其他操作处理，请刷新列表' }, { status: 409 })
  return NextResponse.json(updated)
})
