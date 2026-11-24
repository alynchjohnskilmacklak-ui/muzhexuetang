import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireCurrentTeacher: vi.fn(),
  teacherLessonScopeWhere: vi.fn(),
  getActiveAcademicTerm: vi.fn(),
}))

vi.mock('@/lib/teacher-portal', () => ({
  requireCurrentTeacher: mocks.requireCurrentTeacher,
  teacherLessonScopeWhere: mocks.teacherLessonScopeWhere,
}))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: mocks.getActiveAcademicTerm }))

import { POST } from './route'

function setup(priorMealReported = true) {
  const rows: Array<{
    id: string
    studentId: string
    mealDate: Date
    eating: boolean
    source: string
    lessonId?: string
  }> = [{
    id: 'meal-student-a',
    studentId: 'student-a',
    mealDate: new Date('2026-11-09T00:00:00.000Z'),
    eating: false,
    source: 'AUTO',
  }]
  const mealModel = {
    findMany: vi.fn(async ({ where }: { where: { studentId: { in: string[] }; mealDate: Date } }) => (
      rows.filter((row) => where.studentId.in.includes(row.studentId)
        && row.mealDate.getTime() === where.mealDate.getTime())
        .map(({ studentId, eating, source }) => ({ studentId, eating, source }))
    )),
      createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
      data.forEach((record, index) => rows.push({
        ...(record as typeof rows[number]),
        id: `created-${index}`,
        studentId: String(record.studentId),
        mealDate: record.mealDate as Date,
        eating: Boolean(record.eating),
        source: String(record.source),
      }))
      return { count: data.length }
    }),
    updateMany: vi.fn(async ({ where, data }: {
      where: { studentId: { in: string[] }; mealDate: Date; source: string; eating: boolean }
      data: Record<string, unknown>
    }) => {
      let count = 0
      rows.forEach((row) => {
        if (where.studentId.in.includes(row.studentId)
          && row.mealDate.getTime() === where.mealDate.getTime()
          && row.source === where.source
          && row.eating === where.eating) {
          Object.assign(row, data)
          count += 1
        }
      })
      return { count }
    }),
  }
  const tx = {
    studentMealAttendance: mealModel,
    attendance: { findMany: vi.fn().mockResolvedValue([]) },
  }
  const lesson = {
    id: 'lesson-second',
    division: 'JUNIOR',
    lessonDate: new Date('2026-11-09T00:00:00.000Z'),
    startTime: '10:00',
    endTime: '10:40',
    status: 'SCHEDULED',
    group: {
      id: 'group-second',
      name: '初一数学班',
      course: { subject: '数学' },
      teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学' }],
      enrollments: [
        { studentId: 'student-a', subjects: ['数学'] },
        { studentId: 'student-b', subjects: ['数学'] },
      ],
    },
    lessonStudents: [{ studentId: 'student-a' }, { studentId: 'student-b' }],
    attendances: [],
  }
  const prisma = {
    classLesson: {
      findFirst: vi.fn().mockResolvedValue(lesson),
      findMany: vi.fn().mockResolvedValue([{
        id: 'lesson-first',
        lessonDate: lesson.lessonDate,
        startTime: '08:00',
        endTime: '08:40',
        status: 'COMPLETED',
        attendanceSubmittedAt: new Date('2026-11-09T00:40:00.000Z'),
        hoursDeductedAt: new Date('2026-11-09T00:40:00.000Z'),
      }]),
    },
    systemConfig: { findUnique: vi.fn().mockResolvedValue({ schedulePeriods: null }) },
    studentMealAttendance: {
      findFirst: vi.fn().mockResolvedValue(priorMealReported ? { id: 'meal-first' } : null),
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  }
  mocks.requireCurrentTeacher.mockResolvedValue({
    user: { id: 'user-1', division: 'JUNIOR' },
    teacher: { id: 'teacher-1', name: '王老师', division: 'JUNIOR' },
    prisma,
  })
  mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })
  mocks.getActiveAcademicTerm.mockResolvedValue({ id: 'term-1' })
  return { prisma, rows }
}

function request(studentIds = ['student-a', 'student-b']) {
  return new NextRequest('http://localhost/api/teacher/meal-attendance/append', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId: 'lesson-second', studentIds }),
  })
}

describe('POST /api/teacher/meal-attendance/append', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-09T02:15:00.000Z'))
  })

  afterEach(() => vi.useRealTimers())

  it('lets the teacher append current-lesson roster members after the first-period meal report', async () => {
    const { prisma, rows } = setup(true)
    const response = await POST(request())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ addedCount: 2, alreadyEatingCount: 0, skippedManualCount: 0 })
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.eating && row.lessonId === 'lesson-second')).toBe(true)
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('requires the first-period meal report before writing an append', async () => {
    const { prisma } = setup(false)
    const response = await POST(request())

    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain('系统第一课节')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects appending outside the selected lesson time', async () => {
    const { prisma } = setup(true)
    vi.setSystemTime(new Date('2026-11-09T01:59:59.999Z'))
    const response = await POST(request())

    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain('课程进行中')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
