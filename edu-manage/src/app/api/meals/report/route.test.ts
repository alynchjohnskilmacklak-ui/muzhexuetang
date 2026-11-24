import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))

import { GET } from './route'

describe('GET /api/meals/report appended attendance details', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks late-arrival meal entries in the management report', async () => {
    const prisma = {
      mealReport: { findMany: vi.fn().mockResolvedValue([]) },
      studentMealAttendance: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'meal-appended',
          studentId: 'student-late',
          lessonId: 'lesson-second',
          groupId: 'group-second',
          groupName: '初一数学班',
          teacherId: 'teacher-1',
          teacherName: '王老师',
          eating: true,
          notes: '后续课次追加就餐：王老师',
          updatedAt: new Date('2026-11-09T02:15:00.000Z'),
          student: { id: 'student-late', name: '晚到学员' },
          recorder: { id: 'user-teacher', name: '王老师' },
        }]),
      },
    }
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin', division: 'JUNIOR' } })
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await GET(new NextRequest('http://localhost/api/meals/report?date=2026-11-09'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.reports[0]).toMatchObject({
      totalCount: 1,
      notes: '包含后续课次追加就餐',
      details: [{ studentName: '晚到学员', appended: true, groupName: '初一数学班' }],
    })
  })
})
