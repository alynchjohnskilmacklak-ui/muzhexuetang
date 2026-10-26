import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

const feedbackMock = vi.hoisted(() => vi.fn())
const parentStudentIdsMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/classroom-feedback/archive', () => ({ getFeedbackArchive: feedbackMock }))
vi.mock('@/lib/classroom-feedback/access', () => ({ getParentFeedbackStudentIds: parentStudentIdsMock }))

import { getStudentGrowthArchive, StudentGrowthAccessError } from './archive'

function feedbackResult(totalCount = 1) {
  return {
    student: { id: 'student-a', name: '学生A', grade: '初二' },
    summary: {
      totalCount,
      subjectCount: totalCount ? 1 : 0,
      teacherCount: totalCount ? 1 : 0,
      firstFeedbackDate: totalCount ? '2026-07-01T00:00:00.000Z' : null,
      latestFeedbackDate: totalCount ? '2026-07-20T00:00:00.000Z' : null,
    },
    pagination: { page: 1, pageSize: 10, totalCount, totalPages: Math.ceil(totalCount / 10) },
    items: totalCount ? [{
      id: 'feedback-1',
      date: '2026-07-20T00:00:00.000Z',
      teacher: { id: 'teacher-1', name: '王老师' },
      subject: '数学',
      course: '初二数学',
      className: '初二一班',
      lessonContent: '本节讲解一元二次方程的基础解法。',
      overallComment: '表现积极',
      summary: '继续努力',
      knowledgePoints: ['方程'],
      homework: [],
      tags: ['积极'],
      badge: null,
      studentRating: 'GREAT',
      images: [],
      parentReply: null,
      replyTime: null,
      teacherReply: null,
      teacherReplyTime: null,
      createdAt: '2026-07-20T00:00:00.000Z',
    }] : [],
  }
}

function createPrisma(options: {
  studentExists?: boolean
  division?: string
  withGrades?: boolean
  attendance?: Array<{ status: string; count: number }>
} = {}) {
  const studentExists = options.studentExists !== false
  return {
    student: {
      findUnique: vi.fn(async () => studentExists ? {
        id: 'student-a',
        name: '学生A',
        grade: '初二',
        division: options.division || 'JUNIOR',
        enrollments: [
          { totalHours: 40, usedHours: 12.5, remainHours: 27.5, status: 'ACTIVE', enrolledAt: new Date(), group: { name: '初二一班', status: 'ACTIVE' } },
          { totalHours: 20, usedHours: 20, remainHours: 0, status: 'COMPLETED', enrolledAt: new Date(), group: { name: '历史班', status: 'ARCHIVED' } },
        ],
      } : null),
    },
    attendance: {
      groupBy: vi.fn(async () => (options.attendance || [
        { status: 'PRESENT', count: 7 },
        { status: 'MAKEUP', count: 1 },
        { status: 'LEAVE', count: 1 },
        { status: 'ABSENT', count: 1 },
      ]).map((entry) => ({ status: entry.status, _count: { _all: entry.count } }))),
      findMany: vi.fn(async () => [{
        id: 'attendance-1',
        status: 'PRESENT',
        actualMinutes: 60,
        hoursDeducted: 1,
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        lesson: { lessonDate: new Date('2026-07-20T00:00:00.000Z'), group: { name: '初二一班', course: { subject: '数学' } } },
      }]),
    },
    hourTransaction: {
      findMany: vi.fn(async () => [{
        id: 'hour-1', amount: -1, beforeHours: 28.5, afterHours: 27.5,
        type: 'DEDUCT', reason: '上课扣除', lessonId: 'lesson-1', createdAt: new Date('2026-07-20T00:00:00.000Z'),
      }]),
    },
    gradeRecord: {
      findMany: vi.fn(async () => options.withGrades === false ? [] : [{
        id: 'grade-1', score: 90, comment: '稳定',
        assessment: {
          name: '月考', assessDate: new Date('2026-07-18T00:00:00.000Z'), fullScore: 100,
          group: { course: { subject: '数学' } },
        },
      }]),
    },
  } as unknown as PrismaClient
}

const admin = { id: 'admin-a', role: 'admin' as const, division: 'JUNIOR' }

describe('student growth archive', () => {
  beforeEach(() => {
    feedbackMock.mockReset().mockResolvedValue(feedbackResult())
    parentStudentIdsMock.mockReset().mockResolvedValue(['student-a'])
  })

  it('returns a complete archive for an existing student', async () => {
    const result = await getStudentGrowthArchive(createPrisma(), admin, 'student-a')
    expect(result.student).toMatchObject({ name: '学生A', className: '初二一班' })
    expect(result.feedback.items).toHaveLength(1)
    expect(result.attendance.recentRecords).toHaveLength(1)
    expect(result.hours.transactions).toHaveLength(1)
    expect(result.grades.latest?.score).toBe(90)
  })

  it('returns an empty feedback section when no feedback exists', async () => {
    feedbackMock.mockResolvedValue(feedbackResult(0))
    const result = await getStudentGrowthArchive(createPrisma(), admin, 'student-a')
    expect(result.feedback.items).toEqual([])
    expect(result.overview.feedbackCount).toBe(0)
  })

  it('returns normally when no grades exist', async () => {
    const result = await getStudentGrowthArchive(createPrisma({ withGrades: false }), admin, 'student-a')
    expect(result.grades).toEqual({ latest: null, trend: [] })
  })

  it('rejects teacher access', async () => {
    await expect(getStudentGrowthArchive(createPrisma(), { id: 'teacher-user', role: 'teacher', teacherId: 'teacher-1' }, 'student-a'))
      .rejects.toBeInstanceOf(StudentGrowthAccessError)
  })

  it('rejects an administrator from another division', async () => {
    await expect(getStudentGrowthArchive(createPrisma({ division: 'SENIOR' }), admin, 'student-a'))
      .rejects.toMatchObject({ status: 403 })
  })

  it('allows a parent to view a linked child', async () => {
    const parent = { id: 'parent-a', role: 'parent' as const, division: 'JUNIOR' }
    const result = await getStudentGrowthArchive(createPrisma(), parent, 'student-a')
    expect(result.student.id).toBe('student-a')
    expect(parentStudentIdsMock).toHaveBeenCalledWith(expect.anything(), 'parent-a')
  })

  it('rejects a parent viewing another child', async () => {
    parentStudentIdsMock.mockResolvedValue(['student-b'])
    const parent = { id: 'parent-a', role: 'parent' as const, division: 'JUNIOR' }
    await expect(getStudentGrowthArchive(createPrisma(), parent, 'student-a'))
      .rejects.toMatchObject({ status: 403 })
  })

  it('loads only ten feedback DTOs and never requests images for one hundred records', async () => {
    feedbackMock.mockResolvedValue(feedbackResult(100))
    const result = await getStudentGrowthArchive(createPrisma(), admin, 'student-a')
    expect(feedbackMock).toHaveBeenCalledWith(expect.anything(), admin, expect.objectContaining({ pageSize: 10, includeImages: false }))
    expect(result.feedback.items).toHaveLength(1)
    expect(JSON.stringify(result.feedback.items)).not.toContain('images')
  })

  it('calculates total, used and remaining hours from enrollments', async () => {
    const result = await getStudentGrowthArchive(createPrisma(), admin, 'student-a')
    expect(result.hours).toMatchObject({ totalHours: 60, usedHours: 32.5, remainingHours: 27.5 })
  })

  it('calculates attendance statistics consistently', async () => {
    const result = await getStudentGrowthArchive(createPrisma(), admin, 'student-a')
    expect(result.attendance.summary).toEqual({ total: 10, present: 7, makeup: 1, leave: 1, absent: 1, rate: 80 })
    expect(result.overview.attendanceRate).toBe(80)
  })
})
