/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import {
  calcLessonPay,
  createLessonPayInTransaction,
  DEFAULT_GROUP_RATE_JUNIOR,
  DEFAULT_GROUP_RATE_SENIOR,
  DEFAULT_ONE_ON_ONE_RATES,
  isPayableFeedback,
  normalizeFeedbackSubjectKey,
  normalizeGrade,
  rewardContextFromCourse,
  triggerFeedbackBonus,
} from './teacher-salary'

type FeedbackSpec = { id: string; groupId: string; createdAt?: string }

function createFeedbackRewardHarness(specs: FeedbackSpec[]) {
  const ledger = new Set<string>()
  const salaryCreates: Array<{ amount: number; feedbackId: string }> = []
  const feedbacks = new Map(specs.map(({ id, groupId, createdAt }) => [id, {
    id,
    teacherId: 't1',
    studentIds: ['s1'],
    status: 'PUBLISHED',
    source: 'teacher',
    summary: '课堂完成',
    overallComment: null,
    knowledgePoints: [],
    badge: null,
    imageUrls: [],
    homework: [],
    classLessonId: null,
    feedbackGroupId: groupId,
    feedbackCourseType: 'GROUP',
    classLesson: null,
    createdAt: new Date(createdAt || '2026-07-20T02:00:00.000Z'),
  }]))
  const groups: Record<string, any> = {
    'junior-math': {
      division: 'JUNIOR',
      course: { id: 'course-junior-math', name: '初中数学', subject: '数学', type: 'GROUP', division: 'JUNIOR' },
      teacherAssignments: [],
    },
    'junior-math-second-group': {
      division: 'JUNIOR',
      course: { id: 'course-junior-math-2', name: '初中数学提高班', subject: '数学', type: 'GROUP', division: 'JUNIOR' },
      teacherAssignments: [],
    },
    'junior-physics': {
      division: 'JUNIOR',
      course: { id: 'course-junior-physics', name: '初中物理', subject: '物理', type: 'GROUP', division: 'JUNIOR' },
      teacherAssignments: [],
    },
    'senior-math': {
      division: 'SENIOR',
      course: { id: 'course-senior-math', name: '高中数学', subject: '数学', type: 'GROUP', division: 'SENIOR' },
      teacherAssignments: [],
    },
    'junior-all-subjects': {
      division: 'JUNIOR',
      course: { id: 'course-junior-all', name: '初二全科班', subject: '物理、语文、数学、英语', type: 'GROUP', division: 'JUNIOR' },
      teacherAssignments: [{ subject: '物理' }],
    },
  }
  const rewardDateKey = (value: Date) => value.toISOString().slice(0, 10)
  const rewardModel = {
    findMany: vi.fn(async ({ where }: any) => where.studentId.in
      .filter((studentId: string) => ledger.has(`${where.teacherId}:${studentId}:${where.subjectKey}:${rewardDateKey(where.rewardDate)}`))
      .map((studentId: string) => ({ studentId }))),
    createMany: vi.fn(async ({ data }: any) => {
      let count = 0
      for (const row of data) {
        const key = `${row.teacherId}:${row.studentId}:${row.subjectKey}:${rewardDateKey(row.rewardDate)}`
        if (ledger.has(key)) continue
        ledger.add(key)
        count += 1
      }
      return { count }
    }),
    count: vi.fn(async () => ledger.size),
  }
  const tx: any = {
    teacherSalaryConfig: { findUnique: vi.fn(async () => null) },
    feedbackRewardRecord: rewardModel,
    student: { findMany: vi.fn(async () => [{ id: 's1', name: '张三' }]) },
    teacher: { findUnique: vi.fn(async () => ({ division: 'JUNIOR' })) },
    teacherSalaryTransaction: {
      findFirst: vi.fn(async ({ where }: any) => salaryCreates.find((row) => row.feedbackId === where.feedbackId) || null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }: any) => {
        salaryCreates.push({ amount: data.amount, feedbackId: data.feedbackId })
        return { id: `salary-${salaryCreates.length}`, ...data }
      }),
    },
    activityLog: { create: vi.fn(async () => ({ id: 'log' })) },
    classLesson: { findUnique: vi.fn(async () => null) },
    classGroup: { findUnique: vi.fn(async ({ where }: any) => groups[where.id] || null) },
  }
  const prisma: any = {
    ...tx,
    classroomFeedback: { findUnique: vi.fn(async ({ where }: any) => feedbacks.get(where.id) || null) },
    $transaction: vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx)),
  }
  return { ledger, salaryCreates, prisma }
}

describe('teacher salary calculations', () => {
  it('locks the lesson and writes the database idempotency key in the same transaction', async () => {
    const tx: any = {
      $queryRaw: vi.fn(async () => [{ id: 'lesson-1' }]),
      classLesson: {
        findUnique: vi.fn(async () => ({
          id: 'lesson-1', teacherId: 'teacher-1', status: 'COMPLETED', actualMinutes: 60,
          intensiveReviewStatus: null,
          lessonDate: new Date('2026-08-23T00:00:00+08:00'),
          attendances: [{ status: 'PRESENT' }],
          group: {
            teacherId: 'teacher-1', name: '初二数学班', lessonMinutes: 60, intensiveMode: 'STANDARD', termId: 'term-1',
            course: { type: 'GROUP', grade: '初二', name: '数学' },
          },
        })),
      },
      teacherSalaryConfig: { findUnique: vi.fn(async () => null) },
      teacherSalaryTransaction: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({ id: 'salary-1', ...data })),
      },
      activityLog: { create: vi.fn(async () => ({ id: 'log-1' })) },
    }

    const result = await createLessonPayInTransaction(tx, 'lesson-1')

    expect(result).toEqual({ success: true })
    expect(tx.$queryRaw).toHaveBeenCalledOnce()
    expect(tx.teacherSalaryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ lessonId: 'lesson-1', lessonPayKey: 'lesson-1', type: 'LESSON_PAY' }),
    }))
  })

  it('does not create lesson pay when every student is absent or on leave', async () => {
    const tx: any = {
      $queryRaw: vi.fn(async () => [{ id: 'lesson-1' }]),
      classLesson: {
        findUnique: vi.fn(async () => ({
          id: 'lesson-1', teacherId: 'teacher-1',
          attendances: [{ status: 'LEAVE' }, { status: 'ABSENT' }],
          group: { teacherId: 'teacher-1', intensiveMode: 'STANDARD' },
        })),
      },
      teacherSalaryTransaction: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(),
      },
    }

    expect(await createLessonPayInTransaction(tx, 'lesson-1')).toEqual({
      success: false,
      error: '本次课没有实际出勤学员，不能计入课时工资',
    })
    expect(tx.teacherSalaryTransaction.create).not.toHaveBeenCalled()
  })

  it('ships a fail-closed migration for existing duplicate lesson pay rows', () => {
    const migration = readFileSync(
      new URL('../../prisma/migrations/20260823183000_harden_lesson_pay_idempotency/migration.sql', import.meta.url),
      'utf8',
    )
    expect(migration).toContain('HAVING COUNT(*) > 1')
    expect(migration).toContain('RAISE EXCEPTION')
    expect(migration).toContain('"TeacherSalaryTransaction_lessonPayKey_key"')
  })

  it('normalizes common grade names', () => {
    expect(normalizeGrade('初中三年级')).toBe('初三')
    expect(normalizeGrade('高二上')).toBe('高二')
  })

  it('calculates group lesson pay by junior or senior rate', () => {
    expect(calcLessonPay({
      courseType: 'GROUP', grade: '初三', lessonMinutes: 60,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })).toBe(22)
    expect(calcLessonPay({
      courseType: 'GROUP', grade: '高一', lessonMinutes: 30,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })).toBe(13)
  })

  it('calculates one-on-one pay by grade rate', () => {
    expect(calcLessonPay({
      courseType: 'ONE_ON_ONE', grade: '高三', lessonMinutes: 90,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })).toBe(75)
  })

  it('only pays feedback bonus for published useful feedback', () => {
    expect(isPayableFeedback({ status: 'PUBLISHED', summary: '课堂完成', knowledgePoints: [], studentIds: ['s1'] })).toBe(true)
    expect(isPayableFeedback({ status: 'DRAFT', summary: '课堂完成', knowledgePoints: [], studentIds: ['s1'] })).toBe(false)
    expect(isPayableFeedback({ status: 'PUBLISHED', summary: '', knowledgePoints: [], studentIds: ['s1'] })).toBe(false)
  })

  it('builds division-aware subject keys while retaining course audit context', () => {
    expect(rewardContextFromCourse({ id: 'math-1', name: '初二数学', subject: '数学', type: 'GROUP', division: 'JUNIOR' })).toEqual({
      courseBucket: 'GROUP',
      courseKey: 'course:math-1',
      courseLabel: '初二数学',
      subjectKey: 'JUNIOR_MATH',
      subjectLabel: '数学',
    })
    expect(rewardContextFromCourse({ subject: '物理', type: 'ONE_ON_ONE', division: 'SENIOR' })).toEqual({
      courseBucket: 'ONE_ON_ONE',
      courseKey: 'subject:物理',
      courseLabel: '物理',
      subjectKey: 'SENIOR_PHYSICS',
      subjectLabel: '物理',
    })
    expect(normalizeFeedbackSubjectKey('JUNIOR', '数学')).toBe('JUNIOR_MATH')
    expect(normalizeFeedbackSubjectKey('SENIOR', '数学')).toBe('SENIOR_MATH')
  })

  it('minute 0 returns 0 pay', () => {
    expect(calcLessonPay({
      courseType: 'GROUP', grade: '初三', lessonMinutes: 0,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })).toBe(0)
  })

  it('one-on-one returns correct pay for 45min', () => {
    const pay = calcLessonPay({
      courseType: 'ONE_ON_ONE', grade: '高三', lessonMinutes: 45,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })
    expect(pay).toBeGreaterThan(0)
  })

  it('rewards the first math feedback and marks the second math feedback duplicate', async () => {
    const { ledger, salaryCreates, prisma } = createFeedbackRewardHarness([
      { id: 'f1', groupId: 'junior-math' },
      { id: 'f2', groupId: 'junior-math' },
    ])

    const first = await triggerFeedbackBonus('f1', prisma)
    const second = await triggerFeedbackBonus('f2', prisma)

    expect(first.amount).toBe(0.5)
    expect(second.amount).toBe(0)
    expect(second.duplicateCount).toBe(1)
    expect(ledger).toEqual(new Set(['t1:s1:JUNIOR_MATH:2026-07-20']))
    expect(salaryCreates).toHaveLength(1)
    expect(prisma.feedbackRewardRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isActive: true }),
    }))
    expect(prisma.feedbackRewardRecord.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ isActive: true })]),
      skipDuplicates: true,
    }))
  })

  it('rewards math and physics independently for the same teacher and student', async () => {
    const { ledger, salaryCreates, prisma } = createFeedbackRewardHarness([
      { id: 'f1', groupId: 'junior-math' },
      { id: 'f2', groupId: 'junior-physics' },
    ])

    const math = await triggerFeedbackBonus('f1', prisma)
    const physics = await triggerFeedbackBonus('f2', prisma)

    expect(math.amount).toBe(0.5)
    expect(physics.amount).toBe(0.5)
    expect(ledger).toEqual(new Set(['t1:s1:JUNIOR_MATH:2026-07-20', 't1:s1:JUNIOR_PHYSICS:2026-07-20']))
    expect(salaryCreates).toHaveLength(2)
  })

  it('does not collide for the same subject in different divisions', async () => {
    const { ledger, salaryCreates, prisma } = createFeedbackRewardHarness([
      { id: 'f1', groupId: 'junior-math' },
      { id: 'f2', groupId: 'senior-math' },
    ])

    await triggerFeedbackBonus('f1', prisma)
    await triggerFeedbackBonus('f2', prisma)

    expect(ledger).toEqual(new Set(['t1:s1:JUNIOR_MATH:2026-07-20', 't1:s1:SENIOR_MATH:2026-07-20']))
    expect(salaryCreates).toHaveLength(2)
  })

  it('rewards only once for the same subject across different groups', async () => {
    const { ledger, salaryCreates, prisma } = createFeedbackRewardHarness([
      { id: 'f1', groupId: 'junior-math' },
      { id: 'f2', groupId: 'junior-math-second-group' },
    ])

    const firstGroup = await triggerFeedbackBonus('f1', prisma)
    const secondGroup = await triggerFeedbackBonus('f2', prisma)

    expect(firstGroup.amount).toBe(0.5)
    expect(secondGroup.amount).toBe(0)
    expect(secondGroup.duplicateCount).toBe(1)
    expect(ledger).toEqual(new Set(['t1:s1:JUNIOR_MATH:2026-07-20']))
    expect(salaryCreates).toHaveLength(1)
  })

  it('awards only once when two same-subject feedback requests race', async () => {
    const { ledger, salaryCreates, prisma } = createFeedbackRewardHarness([
      { id: 'f1', groupId: 'junior-math' },
      { id: 'f2', groupId: 'junior-math' },
    ])

    const results = await Promise.all([
      triggerFeedbackBonus('f1', prisma),
      triggerFeedbackBonus('f2', prisma),
    ])

    expect(ledger.size).toBe(1)
    expect(salaryCreates).toHaveLength(1)
    expect(salaryCreates[0].amount).toBe(0.5)
    expect(results.reduce((sum, result) => sum + (result.amount || 0), 0)).toBe(0.5)
  })

  it('rewards the same teacher, student and subject again on the next China-local day', async () => {
    const { ledger, salaryCreates, prisma } = createFeedbackRewardHarness([
      { id: 'f1', groupId: 'junior-math', createdAt: '2026-07-20T02:00:00.000Z' },
      { id: 'f2', groupId: 'junior-math', createdAt: '2026-07-21T02:00:00.000Z' },
    ])

    const firstDay = await triggerFeedbackBonus('f1', prisma)
    const secondDay = await triggerFeedbackBonus('f2', prisma)

    expect(firstDay.amount).toBe(0.5)
    expect(secondDay.amount).toBe(0.5)
    expect(ledger).toEqual(new Set([
      't1:s1:JUNIOR_MATH:2026-07-20',
      't1:s1:JUNIOR_MATH:2026-07-21',
    ]))
    expect(salaryCreates).toHaveLength(2)
  })

  it('uses the current teacher assignment instead of a composite course subject', async () => {
    const { ledger, prisma } = createFeedbackRewardHarness([
      { id: 'f1', groupId: 'junior-all-subjects' },
    ])

    const result = await triggerFeedbackBonus('f1', prisma)

    expect(result.subjectKey).toBe('JUNIOR_PHYSICS')
    expect(ledger).toEqual(new Set(['t1:s1:JUNIOR_PHYSICS:2026-07-20']))
  })

  it('archives only same-subject duplicates and preserves cross-subject audit rows in migration', () => {
    const migration = readFileSync(
      new URL('../../prisma/migrations/20260718223000_feedback_reward_teacher_student_unique/migration.sql', import.meta.url),
      'utf8',
    )
    expect(migration).toContain('"FeedbackRewardRecordAuditBackup"')
    expect(migration).toContain('PARTITION BY r."teacherId", r."studentId", r."subjectKey"')
    expect(migration).toContain('FeedbackRewardRecord duplicate audit backup is incomplete')
    expect(migration).toContain('"FeedbackRewardRecord_teacherId_studentId_subjectKey_key"')
  })

  it('migrates feedback reward uniqueness from lifetime to China-local daily scope safely', () => {
    const migration = readFileSync(
      new URL('../../prisma/migrations/20260721113000_feedback_reward_daily/migration.sql', import.meta.url),
      'utf8',
    )
    expect(migration).toContain('"FeedbackRewardRecordDailyRuleArchive"')
    expect(migration).toContain('AT TIME ZONE \'Asia/Shanghai\'')
    expect(migration).toContain('"ClassGroupTeacher"')
    expect(migration).toContain('PARTITION BY r."teacherId", r."studentId", r."subjectKey", r."rewardDate"')
    expect(migration).toContain('"FeedbackRewardRecord_teacher_student_subject_date_key"')
    expect(migration).not.toMatch(/\bDELETE\s+FROM\s+"FeedbackRewardRecord"/i)
    expect(migration).not.toMatch(/\bDROP\s+TABLE\s+"FeedbackRewardRecord"/i)
  })
})
