import { describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { adjustIntensiveSettlement, calculateIntensiveAdjustmentHours } from '@/lib/intensive-settlement'

function createSettlementHarness(mode: 'INTENSIVE' | 'NORMAL' = 'INTENSIVE') {
  const state = {
    lesson: {
      id: 'lesson-1',
      teacherId: 'teacher-1',
      lessonDate: new Date('2026-07-19T00:00:00.000Z'),
      status: 'COMPLETED',
      actualMinutes: 60,
      settlementStatus: 'SETTLED',
      intensiveReviewStatus: 'APPROVED',
      group: {
        id: 'group-1', name: '数学突击班', intensiveMode: mode, teacherId: 'teacher-1',
        course: { grade: '高三', name: '高三数学' },
      },
      attendances: [{
        id: 'attendance-1', studentId: 'student-1', status: 'PRESENT', actualMinutes: 60,
        hoursDeducted: 1,
        enrollment: { id: 'enrollment-1', remainHours: 9, usedHours: 1 },
      }],
    },
    salaryTransactions: [{ id: 'salary-1', type: 'LESSON_PAY', amount: 50, adjustmentId: null }] as Array<{
      id: string; type: string; amount: number; adjustmentId: string | null
    }>,
    adjustments: [] as Array<Record<string, unknown>>,
    hourTransactions: [] as Array<Record<string, unknown>>,
    activityLogs: [] as Array<Record<string, unknown>>,
  }

  const tx = {
    classLesson: {
      findUnique: async () => state.lesson,
      updateMany: async (input: unknown) => {
        const { where, data } = input as {
          where: { actualMinutes: number }
          data: { actualMinutes: number; settlementStatus: 'ADJUSTED' }
        }
        if (state.lesson.actualMinutes !== where.actualMinutes) return { count: 0 }
        state.lesson.actualMinutes = data.actualMinutes
        state.lesson.settlementStatus = data.settlementStatus
        return { count: 1 }
      },
    },
    lessonSettlementAdjustment: {
      create: async (input: unknown) => {
        const { data } = input as { data: Record<string, unknown> }
        const adjustment = { id: `adjustment-${state.adjustments.length + 1}`, ...data }
        state.adjustments.push(adjustment)
        return adjustment
      },
    },
    attendance: {
      update: async (input: unknown) => {
        const { data } = input as { data: Record<string, unknown> }
        Object.assign(state.lesson.attendances[0], data)
        return state.lesson.attendances[0]
      },
    },
    enrollment: {
      update: async (input: unknown) => {
        const { data } = input as {
          data: { usedHours: { increment: number }; remainHours: { decrement: number } }
        }
        const enrollment = state.lesson.attendances[0].enrollment
        enrollment.usedHours += data.usedHours.increment
        enrollment.remainHours -= data.remainHours.decrement
        return enrollment
      },
    },
    hourTransaction: {
      create: async (input: unknown) => {
        const { data } = input as { data: Record<string, unknown> }
        state.hourTransactions.push(data)
        return data
      },
    },
    teacherSalaryConfig: { findUnique: async () => ({ oneOnOneRates: { 高三: 50 } }) },
    teacherSalaryTransaction: {
      findFirst: async () => state.salaryTransactions.find((row) => row.type === 'LESSON_PAY') || null,
      findMany: async () => state.salaryTransactions,
      create: async (input: unknown) => {
        const { data } = input as { data: { type: string; amount: number; adjustmentId?: string } }
        const row = {
          id: `salary-${state.salaryTransactions.length + 1}`,
          type: data.type,
          amount: data.amount,
          adjustmentId: data.adjustmentId || null,
        }
        state.salaryTransactions.push(row)
        return row
      },
    },
    activityLog: {
      create: async (input: unknown) => {
        const { data } = input as { data: Record<string, unknown> }
        state.activityLogs.push(data)
        return data
      },
    },
  }
  const prisma = {
    $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
  } as unknown as PrismaClient

  return { prisma, state }
}

describe('INTENSIVE settlement consistency', () => {
  it('keeps settlement migrations additive and preserves immutable lesson pay', () => {
    const settlementMigration = readFileSync(
      new URL('../../prisma/migrations/20260719173000_add_intensive_settlement_consistency/migration.sql', import.meta.url),
      'utf8',
    )
    const salaryMigration = readFileSync(
      new URL('../../prisma/migrations/20260719190000_add_intensive_salary_adjustment_audit/migration.sql', import.meta.url),
      'utf8',
    )
    expect(settlementMigration).toContain('CREATE TABLE "LessonSettlementAdjustment"')
    expect(settlementMigration).toContain("class_group.\"intensiveMode\" = 'INTENSIVE'")
    expect(salaryMigration).toContain("\"type\" = 'LESSON_PAY'")
    expect(salaryMigration).toContain('"adjustmentId"')
    expect(`${settlementMigration}\n${salaryMigration}`).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(`${settlementMigration}\n${salaryMigration}`).not.toMatch(/\bDROP\s+TABLE\b/i)
    expect(`${settlementMigration}\n${salaryMigration}`).not.toMatch(/\bTRUNCATE\b/i)
  })

  it('plans a 60-to-90-minute deduction delta without overwriting history', () => {
    expect(calculateIntensiveAdjustmentHours({
      status: 'PRESENT', oldDeductedHours: 1, newMinutes: 90, remainHours: 9,
    })).toEqual({
      oldDeductedHours: 1,
      newDeductedHours: 1.5,
      deductionDelta: 0.5,
      transactionAmount: -0.5,
      beforeHours: 9,
      afterHours: 8.5,
    })
  })

  it('keeps the original salary immutable and creates a delta transaction', async () => {
    const { prisma, state } = createSettlementHarness()
    const result = await adjustIntensiveSettlement({
      prisma, lessonId: 'lesson-1', newMinutes: 90, reason: '实际延长授课', operatorId: 'admin-1',
    })

    expect(result).toMatchObject({
      idempotent: false, oldMinutes: 60, newMinutes: 90,
      oldSalaryAmount: 50, salaryAmount: 75, salaryAdjustmentAmount: 25,
    })
    expect(state.salaryTransactions[0]).toEqual({
      id: 'salary-1', type: 'LESSON_PAY', amount: 50, adjustmentId: null,
    })
    expect(state.salaryTransactions[1]).toMatchObject({
      type: 'LESSON_PAY_ADJUSTMENT', amount: 25, adjustmentId: 'adjustment-1',
    })
    expect(state.lesson.attendances[0].enrollment).toMatchObject({ usedHours: 1.5, remainHours: 8.5 })
  })

  it('creates a separate immutable transaction for every salary-changing adjustment', async () => {
    const { prisma, state } = createSettlementHarness()
    await adjustIntensiveSettlement({
      prisma, lessonId: 'lesson-1', newMinutes: 90, reason: '第一次调整', operatorId: 'admin-1',
    })
    const second = await adjustIntensiveSettlement({
      prisma, lessonId: 'lesson-1', newMinutes: 120, reason: '第二次调整', operatorId: 'admin-1',
    })

    expect(second).toMatchObject({ oldSalaryAmount: 75, salaryAmount: 100, salaryAdjustmentAmount: 25 })
    expect(state.salaryTransactions.map((row) => row.amount)).toEqual([50, 25, 25])
    expect(state.salaryTransactions.map((row) => row.adjustmentId)).toEqual([null, 'adjustment-1', 'adjustment-2'])
    expect(state.salaryTransactions.reduce((sum, row) => sum + row.amount, 0)).toBe(100)
  })

  it('treats a repeated adjustment as idempotent', async () => {
    const { prisma, state } = createSettlementHarness()
    const input = { prisma, lessonId: 'lesson-1', newMinutes: 90, reason: '实际延长授课', operatorId: 'admin-1' }
    await adjustIntensiveSettlement(input)
    const repeated = await adjustIntensiveSettlement(input)

    expect(repeated).toMatchObject({ idempotent: true, salaryAmount: 75 })
    expect(state.adjustments).toHaveLength(1)
    expect(state.salaryTransactions).toHaveLength(2)
  })

  it('rejects NORMAL lessons so ordinary salary remains untouched', async () => {
    const { prisma, state } = createSettlementHarness('NORMAL')
    await expect(adjustIntensiveSettlement({
      prisma, lessonId: 'lesson-1', newMinutes: 90, reason: '不应生效', operatorId: 'admin-1',
    })).rejects.toThrow('INTENSIVE_LESSON_REQUIRED')
    expect(state.lesson.actualMinutes).toBe(60)
    expect(state.salaryTransactions).toEqual([{ id: 'salary-1', type: 'LESSON_PAY', amount: 50, adjustmentId: null }])
    expect(state.adjustments).toHaveLength(0)
  })
})
