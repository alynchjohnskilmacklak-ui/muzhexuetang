import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireCurrentTeacher: vi.fn(),
  getTeacherDashboardData: vi.fn(),
}))
vi.mock('@/lib/teacher-portal', () => ({
  requireCurrentTeacher: mocks.requireCurrentTeacher,
  TEACHER_LOG_ACTIONS: {},
}))
vi.mock('@/lib/teacher-dashboard', () => ({ getTeacherDashboardData: mocks.getTeacherDashboardData }))

import { GET } from './route'

describe('GET /api/teacher/dashboard notification badge', () => {
  beforeEach(() => vi.clearAllMocks())

  it('counts only this teacher profile messages and this user account active unread notifications', async () => {
    const prisma = {
      teacherMessage: { count: vi.fn().mockResolvedValue(2) },
      notification: { count: vi.fn().mockResolvedValue(3) },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'teacher-user-1' },
      teacher: { id: 'teacher-1', name: '教师甲', gender: null, avatar: null, subjects: [], tierLevel: 'TIER_APP', division: 'JUNIOR' },
      prisma,
    })
    mocks.getTeacherDashboardData.mockResolvedValue({
      pendingTasks: { unsubmittedAttendance: 1, unpublishedPapers: 2, unreadParentComments: 4 },
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.badges.unreadMessages).toBe(5)
    expect(prisma.teacherMessage.count).toHaveBeenCalledWith({ where: { teacherId: 'teacher-1', readAt: null } })
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'teacher-user-1', status: 'ACTIVE', deletedAt: null, read: false, type: { not: 'PARENT_MESSAGE' } },
    })
  })
})
