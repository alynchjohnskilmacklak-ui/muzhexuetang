import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))

import { GET } from './route'

describe('GET /api/meals/summary late-added count', () => {
  beforeEach(() => vi.clearAllMocks())

  it('counts distinct eating students appended after the first-period report', async () => {
    const prisma = {
      mealReport: { findMany: vi.fn().mockResolvedValue([]) },
      studentMealAttendance: {
        findMany: vi.fn().mockResolvedValue([
          { studentId: 'student-late', eating: true, teacherId: 'teacher-1', teacherName: '王老师', notes: '后续课次追加就餐：王老师' },
          { studentId: 'student-normal', eating: true, teacherId: 'teacher-1', teacherName: '王老师', notes: '教师首节课考勤同步上报' },
          { studentId: 'student-no-meal', eating: false, teacherId: 'teacher-1', teacherName: '王老师', notes: '后续课次追加就餐：王老师' },
        ]),
      },
      teacher: { findMany: vi.fn().mockResolvedValue([{ id: 'teacher-1', name: '王老师' }]) },
      parentMealChoice: { findMany: vi.fn().mockResolvedValue([]) },
      student: { count: vi.fn().mockResolvedValue(3) },
    }
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin', division: 'JUNIOR' } })
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await GET(new NextRequest('http://localhost/api/meals/summary?date=2026-11-09'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ totalCount: 2, lateAddedCount: 1 })
  })
})
