import type { Prisma, PrismaClient } from '@prisma/client'
import { calculateIntensiveDeductHours } from '@/lib/intensive-class'
import { createIntensiveLessonPayInTransaction } from '@/lib/intensive-settlement'

export type IntensiveReviewAttendanceStatus = 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP'

export interface IntensiveReviewAttendanceRecord {
  studentId: string
  status: IntensiveReviewAttendanceStatus
}

export class IntensiveReviewError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public detail?: unknown,
  ) {
    super(message)
  }
}

const VALID_STATUS = new Set<IntensiveReviewAttendanceStatus>([
  'PRESENT',
  'LEAVE',
  'ABSENT',
  'MAKEUP',
])

const roundHours = (value: number) => Number(value.toFixed(4))

function normalizeAttendanceSnapshot(value: Prisma.JsonValue): IntensiveReviewAttendanceRecord[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Prisma.JsonObject => (
      typeof item === 'object'
      && item !== null
      && !Array.isArray(item)
    ))
    .map((item) => ({
      studentId: typeof item.studentId === 'string' ? item.studentId : '',
      status: typeof item.status === 'string'
        ? item.status as IntensiveReviewAttendanceStatus
        : 'PRESENT',
    }))
    .filter((item) => item.studentId && VALID_STATUS.has(item.status))
    .sort((left, right) => left.studentId.localeCompare(right.studentId))
}

export function calculateApprovedHourSettlement(params: {
  status: string
  actualMinutes: number
  remainHours: number
}) {
  const requestedHours = calculateIntensiveDeductHours(params.status, params.actualMinutes)
  const deductedHours = roundHours(Math.min(requestedHours, Math.max(0, params.remainHours)))
  return {
    requestedHours,
    deductedHours,
    uncoveredHours: roundHours(Math.max(0, requestedHours - deductedHours)),
  }
}

export function validateIntensiveReviewSubmission(input: {
  actualMinutes: number
  records: IntensiveReviewAttendanceRecord[]
  expectedStudentIds: string[]
}) {
  if (!Number.isInteger(input.actualMinutes) || input.actualMinutes < 15 || input.actualMinutes > 600) {
    return '实际授课分钟须为15至600之间的整数'
  }
  if (!input.records.length) return '请填写学生考勤'
  if (input.records.some((record) => !record.studentId || !VALID_STATUS.has(record.status))) {
    return '考勤数据不完整'
  }
  const recordIds = input.records.map((record) => record.studentId)
  if (new Set(recordIds).size !== recordIds.length) return '学生考勤不能重复'
  const expected = [...new Set(input.expectedStudentIds)].sort()
  const submitted = [...recordIds].sort()
  if (
    expected.length !== submitted.length
    || expected.some((studentId, index) => studentId !== submitted[index])
  ) {
    return '必须提交本次课次全部学生的考勤'
  }
  return null
}

export async function submitIntensiveLessonReview(params: {
  prisma: PrismaClient
  lessonId: string
  teacherId: string
  submittedById: string
  actualMinutes: number
  records: IntensiveReviewAttendanceRecord[]
  teacherNote?: string | null
}) {
  return params.prisma.$transaction(async (tx) => {
    const lesson = await tx.classLesson.findUnique({
      where: { id: params.lessonId },
      include: {
        group: {
          include: {
            teacherAssignments: { select: { teacherId: true } },
          },
        },
        lessonStudents: { select: { studentId: true } },
      },
    })
    if (!lesson || lesson.group.intensiveMode !== 'INTENSIVE') {
      throw new IntensiveReviewError('INTENSIVE_LESSON_REQUIRED', '个性化课次不存在', 404)
    }
    const allowedTeacherIds = lesson.teacherId
      ? new Set([lesson.teacherId])
      : new Set([
          lesson.group.teacherId,
          ...lesson.group.teacherAssignments.map((assignment) => assignment.teacherId),
        ].filter(Boolean))
    if (!allowedTeacherIds.has(params.teacherId)) {
      throw new IntensiveReviewError('TEACHER_FORBIDDEN', '无权提交该课次', 403)
    }
    if (lesson.settlementStatus !== 'UNSETTLED' || lesson.intensiveReviewStatus === 'APPROVED') {
      throw new IntensiveReviewError('ALREADY_APPROVED', '该课次已经审核结算，不能重复提交', 409)
    }
    if (lesson.intensiveReviewStatus === 'PENDING') {
      throw new IntensiveReviewError('REVIEW_PENDING', '该课次正在等待管理员审核', 409)
    }

    const validationError = validateIntensiveReviewSubmission({
      actualMinutes: params.actualMinutes,
      records: params.records,
      expectedStudentIds: lesson.lessonStudents.map((student) => student.studentId),
    })
    if (validationError) {
      throw new IntensiveReviewError('INVALID_SUBMISSION', validationError)
    }

    const latestReview = await tx.intensiveLessonReview.findFirst({
      where: { lessonId: lesson.id },
      select: { revision: true },
      orderBy: { revision: 'desc' },
    })
    const revision = (latestReview?.revision || 0) + 1
    const now = new Date()

    for (const record of params.records) {
      const enrollment = await tx.enrollment.findUnique({
        where: {
          studentId_groupId: {
            studentId: record.studentId,
            groupId: lesson.groupId,
          },
        },
        select: { id: true },
      })
      if (!enrollment) {
        throw new IntensiveReviewError('ENROLLMENT_MISSING', '学生报名关系不存在，请联系管理员', 409)
      }
      await tx.attendance.upsert({
        where: {
          attendance_lesson_student_unique: {
            lessonId: lesson.id,
            studentId: record.studentId,
          },
        },
        update: {
          enrollmentId: enrollment.id,
          status: record.status,
          actualMinutes: params.actualMinutes,
          hoursDeducted: 0,
        },
        create: {
          lessonId: lesson.id,
          studentId: record.studentId,
          enrollmentId: enrollment.id,
          status: record.status,
          actualMinutes: params.actualMinutes,
          hoursDeducted: 0,
        },
      })
    }

    const review = await tx.intensiveLessonReview.create({
      data: {
        lessonId: lesson.id,
        revision,
        teacherId: params.teacherId,
        submittedById: params.submittedById,
        actualMinutes: params.actualMinutes,
        attendanceSnapshot: params.records as unknown as Prisma.InputJsonValue,
        teacherNote: params.teacherNote?.trim().slice(0, 500) || null,
        status: 'PENDING',
      },
    })
    await tx.classLesson.update({
      where: { id: lesson.id },
      data: {
        status: 'COMPLETED',
        attendanceSubmittedAt: now,
        actualMinutes: null,
        hoursDeductedAt: null,
        settlementStatus: 'UNSETTLED',
        intensiveReviewStatus: 'PENDING',
      },
    })
    await tx.activityLog.create({
      data: {
        userId: params.submittedById,
        teacherId: params.teacherId,
        action: 'INTENSIVE_REVIEW_SUBMIT',
        detail: `${lesson.group.name} · 实际${params.actualMinutes}分钟 · 等待管理员审核`,
        entityType: 'IntensiveLessonReview',
        entityId: review.id,
        metadata: {
          lessonId: lesson.id,
          revision,
          actualMinutes: params.actualMinutes,
          records: params.records as unknown as Prisma.InputJsonValue,
        },
      },
    })
    return { reviewId: review.id, revision, status: review.status }
  }, {
    isolationLevel: 'Serializable' as Prisma.TransactionIsolationLevel,
  })
}

export async function reviewIntensiveLesson(params: {
  prisma: PrismaClient
  reviewId: string
  division: string
  reviewedById: string
  action: 'APPROVE' | 'REJECT'
  reviewNote?: string | null
}) {
  return params.prisma.$transaction(async (tx) => {
    const review = await tx.intensiveLessonReview.findUnique({
      where: { id: params.reviewId },
      include: {
        lesson: {
          include: {
            group: { include: { course: true } },
            attendances: { include: { enrollment: true } },
            lessonStudents: { select: { studentId: true } },
          },
        },
      },
    })
    if (
      !review
      || review.lesson.division !== params.division
      || review.lesson.group.intensiveMode !== 'INTENSIVE'
    ) {
      throw new IntensiveReviewError('REVIEW_NOT_FOUND', '待审核记录不存在', 404)
    }
    if (review.status !== 'PENDING') {
      if (
        (params.action === 'APPROVE' && review.status === 'APPROVED')
        || (params.action === 'REJECT' && review.status === 'REJECTED')
      ) {
        return { idempotent: true, status: review.status }
      }
      throw new IntensiveReviewError('REVIEW_ALREADY_HANDLED', '该记录已经处理', 409)
    }

    const reviewNote = params.reviewNote?.trim().slice(0, 500) || null
    const now = new Date()
    if (params.action === 'REJECT') {
      if (!reviewNote || reviewNote.length < 2) {
        throw new IntensiveReviewError('REJECT_REASON_REQUIRED', '驳回时请填写原因')
      }
      const claimed = await tx.intensiveLessonReview.updateMany({
        where: { id: review.id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          reviewedById: params.reviewedById,
          reviewedAt: now,
          reviewNote,
        },
      })
      if (claimed.count !== 1) {
        throw new IntensiveReviewError('CONCURRENT_REVIEW', '该记录已被其他管理员处理', 409)
      }
      await tx.classLesson.update({
        where: { id: review.lessonId },
        data: { intensiveReviewStatus: 'REJECTED' },
      })
      await tx.activityLog.create({
        data: {
          userId: params.reviewedById,
          teacherId: review.teacherId,
          action: 'INTENSIVE_REVIEW_REJECT',
          detail: `${review.lesson.group.name} · ${review.actualMinutes}分钟 · ${reviewNote}`,
          entityType: 'IntensiveLessonReview',
          entityId: review.id,
          metadata: { lessonId: review.lessonId, revision: review.revision, reviewNote },
        },
      })
      return { idempotent: false, status: 'REJECTED' as const }
    }

    if (
      review.lesson.settlementStatus !== 'UNSETTLED'
      || review.lesson.intensiveReviewStatus !== 'PENDING'
    ) {
      throw new IntensiveReviewError('LESSON_NOT_REVIEWABLE', '课次状态已经变化，请刷新后重试', 409)
    }
    const snapshot = normalizeAttendanceSnapshot(review.attendanceSnapshot)
    const currentAttendance = review.lesson.attendances
      .map((attendance) => ({
        studentId: attendance.studentId,
        status: attendance.status as IntensiveReviewAttendanceStatus,
      }))
      .sort((left, right) => left.studentId.localeCompare(right.studentId))
    const lessonStudentIds = review.lesson.lessonStudents
      .map((student) => student.studentId)
      .sort()
    const snapshotStudentIds = snapshot.map((attendance) => attendance.studentId)
    const snapshotMatchesLesson = (
      snapshot.length === lessonStudentIds.length
      && snapshotStudentIds.every((studentId, index) => studentId === lessonStudentIds[index])
    )
    const snapshotMatchesAttendance = (
      snapshot.length === currentAttendance.length
      && snapshot.every((attendance, index) => (
        attendance.studentId === currentAttendance[index]?.studentId
        && attendance.status === currentAttendance[index]?.status
      ))
    )
    if (!snapshotMatchesLesson || !snapshotMatchesAttendance) {
      throw new IntensiveReviewError(
        'REVIEW_SNAPSHOT_MISMATCH',
        '课次学生或考勤数据已发生变化，请驳回后由教师重新提交',
        409,
      )
    }
    const claimed = await tx.intensiveLessonReview.updateMany({
      where: { id: review.id, status: 'PENDING' },
      data: {
        status: 'APPROVED',
        reviewedById: params.reviewedById,
        reviewedAt: now,
        reviewNote,
      },
    })
    if (claimed.count !== 1) {
      throw new IntensiveReviewError('CONCURRENT_REVIEW', '该记录已被其他管理员处理', 409)
    }

    let deductedStudents = 0
    let uncoveredHours = 0
    for (const attendance of review.lesson.attendances) {
      if (!attendance.enrollment) {
        throw new IntensiveReviewError('ENROLLMENT_MISSING', '考勤缺少报名关系，不能结算', 409)
      }
      const hourSettlement = calculateApprovedHourSettlement({
        status: attendance.status,
        actualMinutes: review.actualMinutes,
        remainHours: attendance.enrollment.remainHours,
      })
      const safeDeduct = hourSettlement.deductedHours
      uncoveredHours = roundHours(uncoveredHours + hourSettlement.uncoveredHours)
      await tx.attendance.update({
        where: { id: attendance.id },
        data: {
          actualMinutes: review.actualMinutes,
          hoursDeducted: safeDeduct,
        },
      })
      if (attendance.status === 'LEAVE' || attendance.status === 'ABSENT') {
        await tx.makeupRequest.upsert({
          where: { attendanceId: attendance.id },
          update: {},
          create: {
            attendanceId: attendance.id,
            studentId: attendance.studentId,
            status: 'PENDING',
          },
        })
      }
      if (safeDeduct <= 0) continue
      deductedStudents += 1
      await tx.enrollment.update({
        where: { id: attendance.enrollment.id },
        data: {
          usedHours: { increment: safeDeduct },
          remainHours: { decrement: safeDeduct },
        },
      })
      await tx.hourTransaction.create({
        data: {
          studentId: attendance.studentId,
          enrollmentId: attendance.enrollment.id,
          lessonId: review.lessonId,
          amount: -safeDeduct,
          beforeHours: attendance.enrollment.remainHours,
          afterHours: roundHours(attendance.enrollment.remainHours - safeDeduct),
          type: 'INTENSIVE_REVIEW_APPROVED',
          reason: `个性化课程审核通过：${review.actualMinutes}分钟`,
          operatorId: params.reviewedById,
        },
      })
    }

    await tx.classLesson.update({
      where: { id: review.lessonId },
      data: {
        status: 'COMPLETED',
        actualMinutes: review.actualMinutes,
        settlementStatus: 'SETTLED',
        intensiveReviewStatus: 'APPROVED',
        attendanceSubmittedAt: review.lesson.attendanceSubmittedAt || review.submittedAt,
        hoursDeductedAt: deductedStudents > 0 ? now : null,
      },
    })
    const salary = await createIntensiveLessonPayInTransaction(tx, review.lessonId)
    const completedLessons = await tx.classLesson.count({
      where: {
        groupId: review.lesson.groupId,
        status: 'COMPLETED',
        intensiveReviewStatus: 'APPROVED',
      },
    })
    await tx.classGroup.update({
      where: { id: review.lesson.groupId },
      data: { completedLessons },
    })
    await tx.activityLog.create({
      data: {
        userId: params.reviewedById,
        teacherId: review.teacherId,
        action: 'INTENSIVE_REVIEW_APPROVE',
        detail: `${review.lesson.group.name} · 审核通过${review.actualMinutes}分钟 · 工资￥${salary.amount}`,
        entityType: 'IntensiveLessonReview',
        entityId: review.id,
        metadata: {
          lessonId: review.lessonId,
          revision: review.revision,
          actualMinutes: review.actualMinutes,
          salaryAmount: salary.amount,
          salarySkipped: salary.skipped,
          deductedStudents,
          uncoveredHours,
          reviewNote,
        },
      },
    })

    return {
      idempotent: false,
      status: 'APPROVED' as const,
      salaryAmount: salary.amount,
      salarySkipped: salary.skipped,
      deductedStudents,
      uncoveredHours,
    }
  }, {
    isolationLevel: 'Serializable' as Prisma.TransactionIsolationLevel,
  })
}
