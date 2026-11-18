import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: vi.fn() }))
vi.mock('@/lib/meal-template', () => ({ getEffectiveMealMenuForDate: vi.fn().mockResolvedValue(null) }))
import { getParentDashboardData } from './parent-dashboard'

describe('dashboard identity aggregation', () => {
  it('retains old record feedback and counts under one visible child', async () => {
    const old = { id: 'old', identityId: 'identity', name: '甲', grade: '初一', gender: null, birthYear: null, updatedAt: new Date('2025-01-01'), membershipLevel: 'NORMAL', termMemberships: [], mainTeacher: null, enrollments: [] }
    const current = { ...old, id: 'current', updatedAt: new Date('2026-10-01') }
    const feedback = { id: 'feedback', studentIds: ['old'], createdAt: new Date(), summary: '本节代数式', teacher: { name: '教师' }, classLesson: null, knowledgeCard: null }
    const many = () => ({ findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) })
    const db = {
      student: { findMany: vi.fn().mockResolvedValue([old, current]) },
      classLesson: many(), notification: many(), performancePost: many(), enrollment: many(), examPaper: many(), studyMaterial: many(),
      classroomFeedback: { ...many(), findMany: vi.fn().mockResolvedValue([feedback]) },
      attendance: { ...many(), findMany: vi.fn().mockResolvedValue([{ id: 'attendance', studentId: 'old', status: 'PRESENT', createdAt: new Date(), hoursDeducted: 1, lessonId: 'lesson' }]) },
      achievementBadge: { findMany: vi.fn().mockResolvedValue([{ studentId: 'old' }]) },
    }
    const data = await getParentDashboardData('parent', db as unknown as PrismaClient)
    expect(data.students).toHaveLength(1)
    expect(data.students[0].recordIds).toEqual(['old', 'current'])
    expect(data.latestFeedbackByStudent.current?.id).toBe('feedback')
    expect(data.studentStats.current).toMatchObject({ attendanceRate: 100, badgeCount: 1, todayFeedbackCount: 1 })
    expect(data.todayFeedbacks[0].studentIds).toEqual(['current'])
    expect(data.todayAttendances[0].studentId).toBe('current')
    expect(db.classroomFeedback.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ studentIds: { hasSome: ['old', 'current'] } }) }))
  })
})
