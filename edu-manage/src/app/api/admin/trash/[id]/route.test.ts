import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))

import { DELETE } from './route'

describe('DELETE /api/admin/trash/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 409 with blocker details when student history prevents permanent deletion', async () => {
    const count = vi.fn().mockResolvedValue(0)
    const tx = {
      deletedRecord: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'trash-student', entityType: 'Student', entityId: 'student-1', deletionBatchId: 'batch-1', payload: {},
        }),
      },
      classLessonStudent: { count },
      enrollment: { count },
      attendance: { count },
      makeupRequest: { count },
      hourTransaction: { count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(0) },
      gradeRecord: { count },
      classHighlight: { count },
      fee: { count },
      performancePost: { count },
      achievementBadge: { count },
      examPaper: { count },
      learningGoal: { count },
      weaknessRecord: { count },
      stageSummary: { count },
      leaveRequest: { count },
      parentMealChoice: { count },
      studentMealAttendance: { count },
      studentTermMembership: { count },
      studyHallPlan: { count },
      studyHallRecord: { count },
      studyHallClassStudent: { count },
      studyHallHomeworkEntry: { count },
      feedbackRewardRecord: { count },
      masteryRecord: { count },
      practiceResult: { count },
      practiceAttempt: { count },
      parentMessage: { count },
      courseChangeEvent: { count },
      notification: { count: vi.fn() },
      fileAsset: { count },
      classroomFeedback: { count },
    }
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    mocks.getRequestPrisma.mockResolvedValue({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) })

    const response = await DELETE(
      new NextRequest('http://local/api/admin/trash/trash-student'),
      { params: Promise.resolve({ id: 'trash-student' }) },
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: 'TRASH_PURGE_BLOCKED',
      blockers: [{ relation: '课时流水', count: 2 }],
    })
  })
})
