import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  getRequestDivision: vi.fn(),
}))

vi.mock('@/lib/teacher-portal', () => ({
  requireAdminUser: mocks.requireAdminUser,
}))

vi.mock('@/lib/division', () => ({
  getRequestDivision: mocks.getRequestDivision,
  divisionWhere: vi.fn((div) => ({ division: div })),
}))

import { GET } from './route'

describe('GET /api/admin/teacher-interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRequestDivision.mockReturnValue('JUNIOR')
  })

  it('aggregates questioning statistics by teacher and student ranking correctly', async () => {
    const mockPicks = [
      {
        id: 'pick-1',
        lessonId: 'lesson-1',
        studentId: 'student-1',
        teacherId: 'teacher-1',
        round: 1,
        source: 'RANDOM',
        questionLabel: '第1题',
        result: 'CORRECT',
        comment: '思路清晰',
        createdAt: new Date('2026-11-18T10:00:00Z'),
        lesson: {
          id: 'lesson-1',
          lessonDate: new Date('2026-11-18T00:00:00Z'),
          startTime: '09:00',
          endTime: '10:00',
          subject: '数学',
          group: { id: 'group-1', name: '初一数学班', division: 'JUNIOR', course: { name: '初一数学', subject: '数学' } },
        },
      },
      {
        id: 'pick-2',
        lessonId: 'lesson-1',
        studentId: 'student-1',
        teacherId: 'teacher-1',
        round: 2,
        source: 'MANUAL',
        questionLabel: '第2题',
        result: 'PARTIAL',
        comment: '步骤稍缺漏',
        createdAt: new Date('2026-11-18T10:20:00Z'),
        lesson: {
          id: 'lesson-1',
          lessonDate: new Date('2026-11-18T00:00:00Z'),
          startTime: '09:00',
          endTime: '10:00',
          subject: '数学',
          group: { id: 'group-1', name: '初一数学班', division: 'JUNIOR', course: { name: '初一数学', subject: '数学' } },
        },
      },
      {
        id: 'pick-3',
        lessonId: 'lesson-2',
        studentId: 'student-2',
        teacherId: 'teacher-1',
        round: 1,
        source: 'RANDOM',
        questionLabel: '第1题',
        result: 'NEEDS_WORK',
        comment: '需要强化订正',
        createdAt: new Date('2026-11-18T11:00:00Z'),
        lesson: {
          id: 'lesson-2',
          lessonDate: new Date('2026-11-18T00:00:00Z'),
          startTime: '10:30',
          endTime: '11:30',
          subject: '数学',
          group: { id: 'group-1', name: '初一数学班', division: 'JUNIOR', course: { name: '初一数学', subject: '数学' } },
        },
      },
    ]

    const mockStudents = [
      { id: 'student-1', name: '马子墨', grade: '初一', gender: 'BOY' },
      { id: 'student-2', name: '王祁涵', grade: '初三', gender: 'BOY' },
    ]

    const mockTeachers = [
      {
        id: 'teacher-1',
        name: '胡思同',
        avatar: null,
        gender: 'FEMALE',
        tierLevel: 'ELITE',
        subjects: '数学',
        phone: '13800000001',
      },
      {
        id: 'teacher-2',
        name: '朱梦老师',
        avatar: null,
        gender: 'FEMALE',
        tierLevel: 'SENIOR',
        subjects: '生物',
        phone: '13800000002',
      },
    ]

    const prisma = {
      classroomPick: { findMany: vi.fn().mockResolvedValue(mockPicks) },
      student: { findMany: vi.fn().mockResolvedValue(mockStudents) },
      teacher: { findMany: vi.fn().mockResolvedValue(mockTeachers) },
      classGroup: { findMany: vi.fn().mockResolvedValue([{ id: 'group-1', teacherId: 'teacher-1' }]) },
      classGroupTeacher: { findMany: vi.fn().mockResolvedValue([]) },
      classLesson: { findMany: vi.fn().mockResolvedValue([{ teacherId: 'teacher-1' }]) },
    }

    mocks.requireAdminUser.mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
      prisma,
    })

    const req = new NextRequest('http://localhost/api/admin/teacher-interactions?range=7d')
    const response = await GET(req)

    expect(response.status).toBe(200)
    const data = await response.json()

    // 全局汇总验证
    expect(data.summary.totalPicks).toBe(3)
    expect(data.summary.totalStudentsCovered).toBe(2)
    expect(data.summary.activeTeachersCount).toBe(1)
    expect(data.summary.totalTeachersCount).toBe(2)
    expect(data.summary.teachersWithClassesCount).toBe(1)
    expect(data.summary.idleTeachersCount).toBe(1)
    expect(data.summary.needsWorkCount).toBe(1)

    // 教师维度验证
    expect(data.teachers).toHaveLength(2)
    const hu = data.teachers[0]
    expect(hu.teacher.name).toBe('胡思同')
    expect(hu.hasClasses).toBe(true)
    expect(hu.stats.totalPicks).toBe(3)
    expect(hu.stats.uniqueStudentsCount).toBe(2)
    expect(hu.stats.totalLessons).toBe(2)
    expect(hu.stats.correctCount).toBe(1)
    expect(hu.stats.partialCount).toBe(1)
    expect(hu.stats.needsWorkCount).toBe(1)

    // 学员排序明细验证 (马子墨被问2次，排在第一位；王祁涵被问1次，排在第二位)
    expect(hu.studentRanking).toHaveLength(2)
    expect(hu.studentRanking[0].studentName).toBe('马子墨')
    expect(hu.studentRanking[0].pickCount).toBe(2)
    expect(hu.studentRanking[1].studentName).toBe('王祁涵')
    expect(hu.studentRanking[1].pickCount).toBe(1)

    // 教师2（未提问）验证
    const zhu = data.teachers[1]
    expect(zhu.teacher.name).toBe('朱梦老师')
    expect(zhu.stats.totalPicks).toBe(0)
    expect(zhu.stats.uniqueStudentsCount).toBe(0)
  })

  it('filters by search keyword for teacher name or student name', async () => {
    const mockPicks = [
      {
        id: 'pick-1',
        lessonId: 'lesson-1',
        studentId: 'student-1',
        teacherId: 'teacher-1',
        round: 1,
        source: 'RANDOM',
        questionLabel: '第1题',
        result: 'CORRECT',
        comment: '优',
        createdAt: new Date('2026-11-18T10:00:00Z'),
        lesson: { id: 'lesson-1', lessonDate: new Date('2026-11-18T00:00:00Z'), subject: '数学' },
      },
    ]

    const mockStudents = [{ id: 'student-1', name: '马子墨', grade: '初一', gender: 'BOY' }]
    const mockTeachers = [
      { id: 'teacher-1', name: '胡思同', tierLevel: 'ELITE', subjects: '数学', phone: '13800000001' },
      { id: 'teacher-2', name: '朱梦老师', tierLevel: 'SENIOR', subjects: '生物', phone: '13800000002' },
    ]

    const prisma = {
      classroomPick: { findMany: vi.fn().mockResolvedValue(mockPicks) },
      student: { findMany: vi.fn().mockResolvedValue(mockStudents) },
      teacher: { findMany: vi.fn().mockResolvedValue(mockTeachers) },
      classGroup: { findMany: vi.fn().mockResolvedValue([{ id: 'group-1', teacherId: 'teacher-1' }]) },
      classGroupTeacher: { findMany: vi.fn().mockResolvedValue([]) },
      classLesson: { findMany: vi.fn().mockResolvedValue([{ teacherId: 'teacher-1' }]) },
    }

    mocks.requireAdminUser.mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
      prisma,
    })

    // 搜索"马子墨"，应该只保留提问过马子墨的胡思同
    const req = new NextRequest('http://localhost/api/admin/teacher-interactions?search=马子墨')
    const response = await GET(req)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.teachers).toHaveLength(1)
    expect(data.teachers[0].teacher.name).toBe('胡思同')
  })
})
