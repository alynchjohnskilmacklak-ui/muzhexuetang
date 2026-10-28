import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'

vi.mock('@/lib/auth/guards', () => {
  class MockAuthError extends Error {
    status: number
    constructor(message: string, status = 403) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError: MockAuthError,
    requireParentUser: vi.fn(async () => { throw new MockAuthError('需要家长权限') }),
  }
})

import type { StudentGrowthArchive } from './archive'
import { StudentGrowthAccessError } from './archive'
import { renderStudentGrowthReport } from './report'
import { handleParentGrowthReport } from '@/app/api/parent/students/[id]/growth-report/handler'

function archive(feedbackCount = 10): StudentGrowthArchive {
  const items = Array.from({ length: Math.min(feedbackCount, 10) }, (_, index) => ({
    id: `feedback-${index + 1}`,
    date: new Date(Date.UTC(2026, 6, 20 - index)).toISOString(),
    teacher: { id: 'teacher-a', name: '王老师' },
    subject: '数学',
    course: '初二数学',
    className: '初二一班',
    lessonContent: '本节讲解一元二次方程的解法与课堂例题。',
    overallComment: index < 2
      ? '课堂表现：参与积极，学习认真。\n知识掌握：方法掌握较好。\n存在问题：计算细节需要加强。\n后续建议：每天完成十分钟计算练习。'
      : '课堂表现：按要求完成课堂任务。\n知识掌握：本节内容已有记录。\n存在问题：本次未记录明显问题。\n后续建议：及时复习本节知识。',
    summary: `第${index + 1}次课堂反馈`,
    knowledgePoints: ['一元二次方程'],
    homework: [],
    tags: index < 2 ? ['积极', '认真'] : [],
    badge: null,
    studentRating: null,
    parentReply: null,
    replyTime: null,
    teacherReply: null,
    teacherReplyTime: null,
    createdAt: new Date(Date.UTC(2026, 6, 20 - index)).toISOString(),
  }))

  return {
    student: { id: 'student-a', name: '学生A', grade: '初二', className: '初二一班' },
    overview: {
      feedbackCount,
      attendanceRate: 90,
      remainingHours: 18,
      usedHours: 22,
      latestFeedbackDate: feedbackCount ? '2026-07-20T00:00:00.000Z' : null,
    },
    feedback: {
      summary: {
        totalCount: feedbackCount,
        subjectCount: feedbackCount ? 1 : 0,
        teacherCount: feedbackCount ? 1 : 0,
        firstFeedbackDate: feedbackCount ? '2026-07-01T00:00:00.000Z' : null,
        latestFeedbackDate: feedbackCount ? '2026-07-20T00:00:00.000Z' : null,
      },
      items,
    },
    attendance: {
      summary: { total: 10, present: 9, leave: 1, absent: 0, makeup: 0, rate: 90 },
      recentRecords: [],
    },
    hours: { totalHours: 40, usedHours: 22, remainingHours: 18, transactions: [] },
    grades: {
      latest: { id: 'grade-a', assessmentName: '月考', subject: '数学', score: 90, fullScore: 100, percentage: 90, date: '2026-07-18T00:00:00.000Z', comment: null },
      trend: [{ id: 'grade-a', assessmentName: '月考', subject: '数学', score: 90, fullScore: 100, percentage: 90, date: '2026-07-18T00:00:00.000Z' }],
    },
  }
}

function request() {
  return new NextRequest('http://localhost/api/parent/students/student-a/growth-report')
}

function routeDependencies(parentId = 'parent-a', allowedStudentId = 'student-a') {
  return {
    requireParent: vi.fn(async () => ({ id: parentId, role: 'parent', division: 'JUNIOR', prisma: {} as PrismaClient })),
    loadArchive: vi.fn(async (_prisma: PrismaClient, actor: { id: string }, studentId: string) => {
      if (actor.id !== parentId || studentId !== allowedStudentId) {
        throw new StudentGrowthAccessError('无权查看该学生成长档案', 403)
      }
      return archive()
    }),
    renderReport: renderStudentGrowthReport,
  }
}

describe('student growth report', () => {
  it('creates a report from ten feedback records and keeps only five recent items', () => {
    const report = renderStudentGrowthReport(archive(10))
    expect(report.overview.feedbackCount).toBe(10)
    expect(report.recentFeedback).toHaveLength(5)
    expect(report.period).toEqual({ startDate: '2026-07-01T00:00:00.000Z', endDate: '2026-07-20T00:00:00.000Z' })
  })

  it('derives a strength only when positive evidence appears repeatedly', () => {
    const report = renderStudentGrowthReport(archive())
    expect(report.learningStrengths).toContain('近期课堂参与度较好')
    expect(report.learningStrengths).toContain('知识掌握情况较稳定')
  })

  it('extracts recorded improvement text instead of inventing a conclusion', () => {
    const report = renderStudentGrowthReport(archive())
    expect(report.improvements).toContain('计算细节需要加强')
  })

  it('returns explicit empty state data when no feedback exists', () => {
    const empty = archive(0)
    empty.attendance = { summary: { total: 0, present: 0, leave: 0, absent: 0, makeup: 0, rate: null }, recentRecords: [] }
    empty.grades = { latest: null, trend: [] }
    const report = renderStudentGrowthReport(empty)
    expect(report.recentFeedback).toEqual([])
    expect(report.improvements).toEqual(['暂无明显薄弱项记录，请继续保持。'])
    expect(report.availability).toEqual({ hasFeedback: false, hasAttendance: false, hasGrades: false })
  })

  it('returns 200 when a parent accesses a linked child', async () => {
    const response = await handleParentGrowthReport(
      request(),
      { params: Promise.resolve({ id: 'student-a' }) },
      routeDependencies(),
    )
    expect(response.status).toBe(200)
    expect((await response.json()).student.name).toBe('学生A')
  })

  it('returns 403 when a parent accesses another child', async () => {
    const response = await handleParentGrowthReport(
      request(),
      { params: Promise.resolve({ id: 'student-b' }) },
      routeDependencies(),
    )
    expect(response.status).toBe(403)
  })

  it('keeps two parents scoped to their respective children', async () => {
    const parentA = routeDependencies('parent-a', 'student-a')
    const parentB = routeDependencies('parent-b', 'student-b')
    const ownA = await handleParentGrowthReport(request(), { params: Promise.resolve({ id: 'student-a' }) }, parentA)
    const deniedB = await handleParentGrowthReport(request(), { params: Promise.resolve({ id: 'student-a' }) }, parentB)
    expect(ownA.status).toBe(200)
    expect(deniedB.status).toBe(403)
  })

  it('is a pure transformation and does not require a database dependency', () => {
    const input = archive()
    const report = renderStudentGrowthReport(input)
    expect(report.student).toEqual({ name: '学生A', grade: '初二' })
    expect(report.teacherSuggestions[0]).toBe('每天完成十分钟计算练习。')
  })
})
