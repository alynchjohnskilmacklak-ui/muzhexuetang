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
    const attendanceGroupBy = vi.fn(async ({ by }: { by: string[] }) => by.includes('status')
      ? [{ studentId: 'old', status: 'PRESENT', _count: { _all: 1 } }]
      : [{ studentId: 'old', _max: { createdAt: new Date() } }])
    const db = {
      student: { findMany: vi.fn().mockResolvedValue([old, current]) },
      classLesson: many(), notification: many(), performancePost: many(), enrollment: many(),
      examPaper: { ...many(), groupBy: vi.fn().mockResolvedValue([]) }, studyMaterial: many(),
      classroomFeedback: { ...many(), findMany: vi.fn().mockResolvedValue([feedback]) },
      attendance: { groupBy: attendanceGroupBy },
      achievementBadge: { groupBy: vi.fn().mockResolvedValue([{ studentId: 'old', _count: { _all: 1 } }]) },
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

  it('reuses the parent-visible lesson query for upcoming lessons', async () => {
    const old = { id: 'old', identityId: 'identity', name: '甲', grade: '初一', gender: null, birthYear: null, updatedAt: new Date('2025-01-01'), membershipLevel: 'NORMAL', termMemberships: [], mainTeacher: null, enrollments: [] }
    const current = { ...old, id: 'current', updatedAt: new Date('2026-10-01') }
    const tomorrow = new Date()
    tomorrow.setHours(0, 0, 0, 0)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextLesson = {
      id: 'lesson-next',
      lessonDate: tomorrow,
      startTime: '09:00',
      endTime: '10:00',
      subject: '数学',
      isManual: false,
      lessonStudents: [],
      teacher: { name: '教师甲' },
      group: {
        name: '初一周末班',
        intensiveMode: 'STANDARD',
        course: { name: '周末数学课', subject: '数学' },
        teacher: { name: '数学老师' },
        room: { name: '201教室' },
        enrollments: [{ studentId: 'old', subjects: ['数学'] }],
      },
    }
    const classLessonFindMany = vi.fn(async ({ where }: { where: { lessonDate?: { lt?: Date }; group?: { enrollments?: unknown } } }) => (
      where.lessonDate?.lt ? [] : [nextLesson]
    ))
    const many = () => ({ findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) })
    const db = {
      student: { findMany: vi.fn().mockResolvedValue([old, current]) },
      classLesson: { findMany: classLessonFindMany },
      notification: many(), performancePost: many(), enrollment: many(),
      examPaper: { ...many(), groupBy: vi.fn().mockResolvedValue([]) }, studyMaterial: many(),
      classroomFeedback: many(),
      attendance: { groupBy: vi.fn().mockResolvedValue([]) },
      achievementBadge: { groupBy: vi.fn().mockResolvedValue([]) },
    }

    const data = await getParentDashboardData('parent', db as unknown as PrismaClient)

    expect(data.nextUpcomingLessons).toMatchObject([{
      id: 'lesson-next',
      title: '周末数学课',
      teacherName: '数学老师',
      roomName: '201教室',
      studentIds: ['current'],
    }])
    expect(classLessonFindMany).toHaveBeenCalledTimes(2)
    const upcomingQuery = classLessonFindMany.mock.calls.find(([argument]) => !argument.where.lessonDate?.lt)?.[0]
    expect(upcomingQuery?.where.group?.enrollments).toBeDefined()
  })
})
