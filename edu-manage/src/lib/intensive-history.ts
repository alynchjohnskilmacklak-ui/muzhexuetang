import type { Prisma, PrismaClient } from '@prisma/client'
import { calculateIntensiveDeductHours, toIntensiveTeachingType } from '@/lib/intensive-class'
import { createIntensiveLessonPayInTransaction } from '@/lib/intensive-settlement'
import {
  calculatePlannedMinutes,
  getTeacherIntensiveStudentCount,
  lessonStartAt,
} from '@/lib/teacher-intensive-scheduling'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'

export type IntensiveHistoryAttendanceStatus = 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP'

export interface IntensiveHistoryRecordInput {
  groupId: string
  teacherId: string
  lessonDate: string
  startTime: string
  endTime: string
  actualMinutes: number
  reason: string
  records: Array<{
    studentId: string
    status: IntensiveHistoryAttendanceStatus
  }>
}

const VALID_HISTORY_STATUS = new Set<IntensiveHistoryAttendanceStatus>([
  'PRESENT',
  'LEAVE',
  'ABSENT',
  'MAKEUP',
])

export class IntensiveHistoryError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public detail?: unknown,
  ) {
    super(message)
  }
}

export function validateIntensiveHistoryInput(
  input: IntensiveHistoryRecordInput,
  now = new Date(),
) {
  if (!input.groupId || !input.teacherId) return '请选择突击全能班和授课教师'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.lessonDate)) return '上课日期格式不正确'

  const plannedMinutes = calculatePlannedMinutes(input.startTime, input.endTime)
  if (!plannedMinutes) return '结束时间必须晚于开始时间'
  if (!Number.isInteger(input.actualMinutes) || input.actualMinutes < 15 || input.actualMinutes > 600) {
    return '实际授课分钟须为15至600之间的整数'
  }
  if (input.lessonDate > localDateKey(now)) return '历史补录不能选择未来日期'
  if (lessonStartAt(input.lessonDate, input.startTime).getTime() > now.getTime()) {
    return '历史补录只能登记已经开始的课程'
  }
  if (input.reason.trim().length < 4) return '请填写至少4个字的补录原因'
  if (!input.records.length) return '请选择学生并填写考勤状态'

  const studentIds = input.records.map((record) => record.studentId).filter(Boolean)
  if (new Set(studentIds).size !== studentIds.length) return '学生不能重复'
  if (input.records.some((record) => !VALID_HISTORY_STATUS.has(record.status))) {
    return '考勤状态不正确'
  }
  return null
}

export async function createIntensiveHistoryRecord(params: {
  prisma: PrismaClient
  operatorId: string
  division: string
  termId: string
  input: IntensiveHistoryRecordInput
  now?: Date
}) {
  const now = params.now || new Date()
  const validationError = validateIntensiveHistoryInput(params.input, now)
  if (validationError) throw new IntensiveHistoryError('INVALID_INPUT', validationError)

  const input = {
    ...params.input,
    reason: params.input.reason.trim().slice(0, 500),
  }
  const plannedMinutes = calculatePlannedMinutes(input.startTime, input.endTime)
  if (!plannedMinutes) throw new IntensiveHistoryError('INVALID_TIME', '课程时间不正确')

  return params.prisma.$transaction(async (tx) => {
    const group = await tx.classGroup.findFirst({
      where: {
        id: input.groupId,
        division: params.division,
        termId: params.termId,
        intensiveMode: 'INTENSIVE',
        status: { not: 'ARCHIVED' },
        course: { isActive: true },
      },
      include: {
        course: true,
        teacher: { select: { id: true, name: true } },
        teacherAssignments: {
          include: { teacher: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        enrollments: {
          include: { student: { select: { id: true, name: true, status: true } } },
        },
      },
    })
    if (!group) {
      throw new IntensiveHistoryError('GROUP_NOT_FOUND', '突击全能班不存在或不属于当前学部', 404)
    }

    const teachingType = toIntensiveTeachingType(group.teachingType)
    if (!teachingType) {
      throw new IntensiveHistoryError('TEACHING_TYPE_REQUIRED', '该课程未配置一对一/二/三班型', 409)
    }
    const allowedTeacherIds = new Set([
      group.teacherId,
      ...group.teacherAssignments.map((assignment) => assignment.teacherId),
    ].filter(Boolean))
    if (!allowedTeacherIds.has(input.teacherId)) {
      throw new IntensiveHistoryError('TEACHER_FORBIDDEN', '所选教师不属于该课程', 403)
    }

    const expectedStudents = getTeacherIntensiveStudentCount(teachingType)
    if (input.records.length !== expectedStudents) {
      throw new IntensiveHistoryError(
        'STUDENT_COUNT_MISMATCH',
        `该班型必须补录${expectedStudents}名学生`,
      )
    }

    const enrollmentByStudent = new Map(
      group.enrollments.map((enrollment) => [enrollment.studentId, enrollment]),
    )
    const invalidStudent = input.records.find((record) => {
      const enrollment = enrollmentByStudent.get(record.studentId)
      return !enrollment || enrollment.student.status === 'ARCHIVED'
    })
    if (invalidStudent) {
      throw new IntensiveHistoryError('STUDENT_FORBIDDEN', '只能补录该课程历史报名学生', 403)
    }

    const existingLesson = await tx.classLesson.findFirst({
      where: {
        groupId: group.id,
        lessonDate: {
          gte: getLocalDayRange(input.lessonDate).start,
          lte: getLocalDayRange(input.lessonDate).end,
        },
        startTime: input.startTime,
        endTime: input.endTime,
        status: { not: 'CANCELLED' },
      },
      select: { id: true },
    })
    if (existingLesson) {
      throw new IntensiveHistoryError(
        'DUPLICATE_HISTORY_LESSON',
        '该班级在相同日期和时间已经存在课次，请勿重复补录',
        409,
        { lessonId: existingLesson.id },
      )
    }

    const deductions = input.records.map((record) => {
      const enrollment = enrollmentByStudent.get(record.studentId)
      if (!enrollment) throw new IntensiveHistoryError('ENROLLMENT_MISSING', '学生报名关系不存在', 409)
      const hours = calculateIntensiveDeductHours(record.status, input.actualMinutes)
      if (hours > enrollment.remainHours + 0.000001) {
        throw new IntensiveHistoryError(
          'INSUFFICIENT_HOURS',
          `${enrollment.student.name}剩余课时不足，无法安全补录`,
          409,
          {
            studentId: record.studentId,
            requiredHours: hours,
            remainHours: enrollment.remainHours,
          },
        )
      }
      return { record, enrollment, hours }
    })

    const subject = group.teacherAssignments.find(
      (assignment) => assignment.teacherId === input.teacherId,
    )?.subject || group.course.subject
    const deductedAt = deductions.some((item) => item.hours > 0) ? now : null
    const lesson = await tx.classLesson.create({
      data: {
        division: group.division,
        groupId: group.id,
        teacherId: input.teacherId,
        subject,
        lessonDate: getLocalDayRange(input.lessonDate).start,
        startTime: input.startTime,
        endTime: input.endTime,
        status: 'COMPLETED',
        note: `【历史补录】${input.reason}`,
        hoursDeductedAt: deductedAt,
        attendanceSubmittedAt: now,
        isManual: true,
        plannedMinutes,
        actualMinutes: input.actualMinutes,
        settlementStatus: 'SETTLED',
        intensiveReviewStatus: 'APPROVED',
      },
    })

    await tx.classLessonStudent.createMany({
      data: input.records.map((record) => ({
        lessonId: lesson.id,
        studentId: record.studentId,
      })),
    })

    for (const { record, enrollment, hours } of deductions) {
      await tx.attendance.create({
        data: {
          lessonId: lesson.id,
          studentId: record.studentId,
          enrollmentId: enrollment.id,
          status: record.status,
          actualMinutes: input.actualMinutes,
          hoursDeducted: hours,
        },
      })
      if (hours <= 0) continue

      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          usedHours: { increment: hours },
          remainHours: { decrement: hours },
        },
      })
      await tx.hourTransaction.create({
        data: {
          studentId: record.studentId,
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          amount: -hours,
          beforeHours: enrollment.remainHours,
          afterHours: enrollment.remainHours - hours,
          type: 'HISTORICAL_ATTENDANCE_DEDUCT',
          reason: `突击班历史补录：${input.reason}`,
          operatorId: params.operatorId,
        },
      })
    }

    const salary = await createIntensiveLessonPayInTransaction(tx, lesson.id)
    const completedLessons = await tx.classLesson.count({
      where: { groupId: group.id, status: 'COMPLETED' },
    })
    await tx.classGroup.update({
      where: { id: group.id },
      data: { completedLessons },
    })
    await tx.activityLog.create({
      data: {
        userId: params.operatorId,
        teacherId: input.teacherId,
        action: 'INTENSIVE_HISTORY_BACKFILL',
        detail: `${group.name} · ${input.lessonDate} ${input.startTime}-${input.endTime} · 实际${input.actualMinutes}分钟`,
        entityType: 'ClassLesson',
        entityId: lesson.id,
        metadata: {
          source: 'ADMIN_HISTORY_BACKFILL',
          groupId: group.id,
          teachingType,
          studentIds: input.records.map((record) => record.studentId),
          attendance: input.records,
          plannedMinutes,
          actualMinutes: input.actualMinutes,
          reason: input.reason,
          salaryAmount: salary.amount,
          deductions: deductions.map((item) => ({
            studentId: item.record.studentId,
            hours: item.hours,
          })),
        },
      },
    })

    return {
      lessonId: lesson.id,
      salaryAmount: salary.amount,
      salarySkipped: salary.skipped,
      deductions: deductions.map((item) => ({
        studentId: item.record.studentId,
        studentName: item.enrollment.student.name,
        hours: item.hours,
      })),
    }
  }, {
    isolationLevel: 'Serializable' as Prisma.TransactionIsolationLevel,
  })
}
