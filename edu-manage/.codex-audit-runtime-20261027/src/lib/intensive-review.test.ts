import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  calculateApprovedHourSettlement,
  validateIntensiveReviewSubmission,
} from '@/lib/intensive-review'
import { intensiveFeedbackRewardAmount } from '@/lib/intensive-class'

describe('INTENSIVE lesson review', () => {
  it('requires the exact lesson student snapshot and valid actual minutes', () => {
    expect(validateIntensiveReviewSubmission({
      actualMinutes: 60,
      expectedStudentIds: ['student-a', 'student-b'],
      records: [
        { studentId: 'student-a', status: 'PRESENT' },
        { studentId: 'student-b', status: 'LEAVE' },
      ],
    })).toBeNull()

    expect(validateIntensiveReviewSubmission({
      actualMinutes: 60,
      expectedStudentIds: ['student-a', 'student-b'],
      records: [{ studentId: 'student-a', status: 'PRESENT' }],
    })).toContain('全部学生')

    expect(validateIntensiveReviewSubmission({
      actualMinutes: 0,
      expectedStudentIds: ['student-a'],
      records: [{ studentId: 'student-a', status: 'PRESENT' }],
    })).toContain('实际授课分钟')

    expect(validateIntensiveReviewSubmission({
      actualMinutes: 60,
      expectedStudentIds: ['student-a', 'student-b'],
      records: [
        { studentId: 'student-a', status: 'LEAVE' },
        { studentId: 'student-b', status: 'ABSENT' },
      ],
    })).toContain('没有实际出勤学员')
  })

  it('tracks approved teaching hours even when prepaid balance starts at zero', () => {
    expect(calculateApprovedHourSettlement({
      status: 'PRESENT',
      actualMinutes: 90,
      remainHours: 0,
    })).toEqual({
      requestedHours: 1.5,
      deductedHours: 0,
      uncoveredHours: 1.5,
    })
  })

  it('deducts only the covered balance and never makes remaining hours negative', () => {
    expect(calculateApprovedHourSettlement({
      status: 'PRESENT',
      actualMinutes: 90,
      remainHours: 1,
    })).toEqual({
      requestedHours: 1.5,
      deductedHours: 1,
      uncoveredHours: 0.5,
    })
    expect(calculateApprovedHourSettlement({
      status: 'LEAVE',
      actualMinutes: 90,
      remainHours: 20,
    })).toEqual({
      requestedHours: 0,
      deductedHours: 0,
      uncoveredHours: 0,
    })
  })

  it('keeps feedback reward at one yuan per student', () => {
    expect(intensiveFeedbackRewardAmount(1)).toBe(1)
    expect(intensiveFeedbackRewardAmount(2)).toBe(2)
    expect(intensiveFeedbackRewardAmount(3)).toBe(3)
  })

  it('adds the review migration without destructive lesson operations', () => {
    const sql = readFileSync(
      'prisma/migrations/20260726150000_add_intensive_lesson_review/migration.sql',
      'utf8',
    )
    expect(sql).toContain('CREATE TABLE "IntensiveLessonReview"')
    expect(sql).toContain('ADD COLUMN "intensiveReviewStatus"')
    expect(sql).toContain("class_group.\"intensiveMode\" = 'INTENSIVE'")
    expect(sql).not.toMatch(/DELETE\s+FROM\s+"?ClassLesson"?/i)
    expect(sql).not.toMatch(/DROP\s+TABLE\s+"?ClassLesson"?/i)
    expect(sql).not.toMatch(/TRUNCATE/i)
  })
})
