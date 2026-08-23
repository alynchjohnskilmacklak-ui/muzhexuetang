import type { Prisma, PrismaClient } from '@prisma/client'
import { calculateIntensiveDeductHours, shouldGenerateIntensiveLessonPay } from '@/lib/intensive-class'
import { calcLessonPay, getTeacherSalaryConfig, inferGrade } from '@/lib/teacher-salary'

const roundHours = (value: number) => Number(value.toFixed(4))
const roundMoney = (value: number) => Number(value.toFixed(2))

export type IntensiveAdjustmentHours = {
  oldDeductedHours: number
  newDeductedHours: number
  deductionDelta: number
  transactionAmount: number
  beforeHours: number
  afterHours: number
}

export function calculateIntensiveAdjustmentHours(params: {
  status: string
  oldDeductedHours: number
  newMinutes: number
  remainHours: number
}): IntensiveAdjustmentHours {
  const oldDeductedHours = roundHours(Math.max(0, Number(params.oldDeductedHours) || 0))
  const remainHours = roundHours(Math.max(0, Number(params.remainHours) || 0))
  const requestedHours = calculateIntensiveDeductHours(params.status, params.newMinutes)
  const newDeductedHours = roundHours(Math.min(requestedHours, oldDeductedHours + remainHours))
  const deductionDelta = roundHours(newDeductedHours - oldDeductedHours)

  return {
    oldDeductedHours,
    newDeductedHours,
    deductionDelta,
    transactionAmount: roundHours(-deductionDelta),
    beforeHours: remainHours,
    afterHours: roundHours(remainHours - deductionDelta),
  }
}

async function getIntensiveLessonPayContext(tx: Prisma.TransactionClient, lessonId: string) {
  const lesson = await tx.classLesson.findUnique({
    where: { id: lessonId },
    include: {
      group: { include: { course: true } },
      attendances: { select: { status: true } },
    },
  })
  if (!lesson || lesson.group.intensiveMode !== 'INTENSIVE') {
    throw new Error('INTENSIVE_LESSON_REQUIRED')
  }
  const teacherId = lesson.teacherId || lesson.group.teacherId
  if (!teacherId) throw new Error('INTENSIVE_TEACHER_REQUIRED')

  const minutes = Number(lesson.actualMinutes || 0)
  const payable = lesson.status === 'COMPLETED'
    && lesson.intensiveReviewStatus === 'APPROVED'
    && shouldGenerateIntensiveLessonPay(lesson.attendances.map((attendance) => attendance.status), minutes)
  const cfg = await getTeacherSalaryConfig(teacherId, tx)
  const grade = inferGrade(lesson.group.course.grade, lesson.group.name, lesson.group.course.name)
  const amount = payable
    ? calcLessonPay({
        courseType: 'ONE_ON_ONE',
        grade,
        lessonMinutes: minutes,
        groupRateJunior: cfg.groupRateJunior,
        groupRateSenior: cfg.groupRateSenior,
        oneOnOneRates: cfg.oneOnOneRates,
      })
    : 0
  const hourlyRate = cfg.oneOnOneRates[grade || ''] ?? 25

  return { lesson, teacherId, minutes, payable, amount: roundMoney(amount), hourlyRate }
}

export async function createIntensiveLessonPayInTransaction(
  tx: Prisma.TransactionClient,
  lessonId: string,
) {
  const context = await getIntensiveLessonPayContext(tx, lessonId)
  if (!context.payable) return { skipped: true, amount: 0 }

  const existing = await tx.teacherSalaryTransaction.findFirst({
    where: { lessonId, type: 'LESSON_PAY' },
    select: { id: true, amount: true },
  })
  if (existing) return { skipped: true, amount: existing.amount }

  const salary = await tx.teacherSalaryTransaction.create({
    data: {
      teacherId: context.teacherId,
      type: 'LESSON_PAY',
      amount: context.amount,
      termId: context.lesson.group.termId,
      lessonId,
      lessonDate: context.lesson.lessonDate,
      description: `${context.lesson.group.name}（${context.minutes}分钟 × ￥${context.hourlyRate}/小时）`,
    },
  })
  await tx.activityLog.create({
    data: {
      teacherId: context.teacherId,
      action: 'SALARY_LESSON_PAY',
      entityType: 'TeacherSalaryTransaction',
      entityId: salary.id,
      detail: `突击班课时费 ￥${context.amount}：${context.lesson.group.name}`,
      metadata: {
        lessonId,
        amount: context.amount,
        intensiveMode: 'INTENSIVE',
        actualMinutes: context.minutes,
        settlementAtomic: true,
      },
    },
  })
  return { skipped: false, amount: context.amount }
}

async function getIntensiveLessonSalaryTotal(tx: Prisma.TransactionClient, lessonId: string) {
  const transactions = await tx.teacherSalaryTransaction.findMany({
    where: { lessonId, type: { in: ['LESSON_PAY', 'LESSON_PAY_ADJUSTMENT'] } },
    select: { amount: true },
  })
  return roundMoney(transactions.reduce((total, transaction) => total + transaction.amount, 0))
}

async function createIntensiveLessonPayAdjustmentInTransaction(
  tx: Prisma.TransactionClient,
  lessonId: string,
  adjustmentId: string,
) {
  const context = await getIntensiveLessonPayContext(tx, lessonId)
  const transactions = await tx.teacherSalaryTransaction.findMany({
    where: { lessonId, type: { in: ['LESSON_PAY', 'LESSON_PAY_ADJUSTMENT'] } },
    select: { type: true, amount: true },
  })
  const original = transactions.find((transaction) => transaction.type === 'LESSON_PAY')
  const oldAmount = roundMoney(transactions.reduce((total, transaction) => total + transaction.amount, 0))
  const newAmount = context.amount
  const adjustmentAmount = roundMoney(newAmount - oldAmount)

  if (context.payable && !original) {
    throw new Error('INTENSIVE_BASE_SALARY_MISSING')
  }

  if (adjustmentAmount !== 0) {
    await tx.teacherSalaryTransaction.create({
      data: {
        teacherId: context.teacherId,
        type: 'LESSON_PAY_ADJUSTMENT',
        amount: adjustmentAmount,
        termId: context.lesson.group.termId,
        lessonId,
        adjustmentId,
        lessonDate: context.lesson.lessonDate,
        description: `${context.lesson.group.name}结算调整：工资由￥${oldAmount}调整为￥${newAmount}（${context.minutes}分钟）`,
      },
    })
  }

  return { oldAmount, newAmount, adjustmentAmount }
}

export async function adjustIntensiveSettlement(params: {
  prisma: PrismaClient
  lessonId: string
  newMinutes: number
  reason: string
  operatorId: string
}) {
  const newMinutes = Math.round(Number(params.newMinutes))
  const reason = params.reason.trim()
  if (!Number.isFinite(newMinutes) || newMinutes <= 0) throw new Error('INVALID_NEW_MINUTES')
  if (!reason) throw new Error('ADJUSTMENT_REASON_REQUIRED')

  return params.prisma.$transaction(async (tx) => {
    const lesson = await tx.classLesson.findUnique({
      where: { id: params.lessonId },
      include: {
        group: { select: { id: true, name: true, intensiveMode: true, lessonMinutes: true } },
        attendances: { include: { enrollment: true } },
      },
    })
    if (!lesson || lesson.group.intensiveMode !== 'INTENSIVE') throw new Error('INTENSIVE_LESSON_REQUIRED')
    if (lesson.settlementStatus === 'UNSETTLED') throw new Error('INTENSIVE_LESSON_NOT_SETTLED')

    const oldMinutes = lesson.actualMinutes
      ?? lesson.attendances.find((attendance) => attendance.actualMinutes != null)?.actualMinutes
      ?? lesson.plannedMinutes
      ?? lesson.group.lessonMinutes
    if (lesson.actualMinutes != null && oldMinutes === newMinutes) {
      const salaryAmount = await getIntensiveLessonSalaryTotal(tx, lesson.id)
      return { idempotent: true, oldMinutes, newMinutes, salaryAmount }
    }

    const claimed = await tx.classLesson.updateMany({
      where: {
        id: lesson.id,
        actualMinutes: lesson.actualMinutes,
        settlementStatus: { in: ['SETTLED', 'ADJUSTED'] },
      },
      data: { actualMinutes: newMinutes, settlementStatus: 'ADJUSTED' },
    })
    if (claimed.count !== 1) throw new Error('SETTLEMENT_CHANGED_CONCURRENTLY')

    const adjustment = await tx.lessonSettlementAdjustment.create({
      data: { lessonId: lesson.id, oldMinutes, newMinutes, reason, operatorId: params.operatorId },
    })

    for (const attendance of lesson.attendances) {
      const enrollment = attendance.enrollment
      if (!enrollment) throw new Error('SETTLEMENT_ENROLLMENT_MISSING')
      const change = calculateIntensiveAdjustmentHours({
        status: attendance.status,
        oldDeductedHours: attendance.hoursDeducted,
        newMinutes,
        remainHours: enrollment.remainHours,
      })

      await tx.attendance.update({
        where: { id: attendance.id },
        data: { actualMinutes: newMinutes, hoursDeducted: change.newDeductedHours },
      })
      if (change.deductionDelta === 0) continue

      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          usedHours: { increment: change.deductionDelta },
          remainHours: { decrement: change.deductionDelta },
        },
      })
      await tx.hourTransaction.create({
        data: {
          studentId: attendance.studentId,
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          amount: change.transactionAmount,
          beforeHours: change.beforeHours,
          afterHours: change.afterHours,
          type: 'SETTLEMENT_ADJUSTMENT',
          reason: `突击班结算调整：${oldMinutes}→${newMinutes}分钟；${reason}（${adjustment.id}）`,
          operatorId: params.operatorId,
        },
      })
    }

    const salary = await createIntensiveLessonPayAdjustmentInTransaction(tx, lesson.id, adjustment.id)
    await tx.activityLog.create({
      data: {
        userId: params.operatorId,
        action: 'INTENSIVE_SETTLEMENT_ADJUST',
        entityType: 'LessonSettlementAdjustment',
        entityId: adjustment.id,
        detail: `${lesson.group.name}：${oldMinutes}分钟调整为${newMinutes}分钟`,
        metadata: {
          lessonId: lesson.id,
          oldMinutes,
          newMinutes,
          reason,
          oldSalaryAmount: salary.oldAmount,
          newSalaryAmount: salary.newAmount,
          salaryAdjustmentAmount: salary.adjustmentAmount,
        },
      },
    })

    return {
      idempotent: false,
      adjustmentId: adjustment.id,
      oldMinutes,
      newMinutes,
      oldSalaryAmount: salary.oldAmount,
      salaryAmount: salary.newAmount,
      salaryAdjustmentAmount: salary.adjustmentAmount,
    }
  })
}
