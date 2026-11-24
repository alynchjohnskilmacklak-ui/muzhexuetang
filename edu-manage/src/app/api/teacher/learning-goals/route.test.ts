import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireCurrentTeacher: vi.fn(),
  assertTeacherOwnsStudent: vi.fn(),
}))
vi.mock('@/lib/teacher-portal', () => ({
  requireCurrentTeacher: mocks.requireCurrentTeacher,
  assertTeacherOwnsStudent: mocks.assertTeacherOwnsStudent,
  TEACHER_LOG_ACTIONS: { LEARNING_GOAL_SAVE: 'LEARNING_GOAL_SAVE' },
}))

import { DELETE, GET, PATCH } from './route'

describe('/api/teacher/learning-goals soft deletion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists only active goals for the owned student', async () => {
    const goals = [{ id: 'goal-1', goalDesc: '复习分数应用题' }]
    const prisma = { learningGoal: { findMany: vi.fn().mockResolvedValue(goals) } }
    mocks.requireCurrentTeacher.mockResolvedValue({ teacher: { id: 'teacher-1' }, prisma })
    mocks.assertTeacherOwnsStudent.mockResolvedValue({ id: 'student-1', name: '学生甲' })

    const response = await GET(new NextRequest('http://localhost/api/teacher/learning-goals?studentId=student-1'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ goals })
    expect(prisma.learningGoal.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 'student-1', deletedAt: null },
    }))
  })

  it('soft deletes an owned goal and records a restorable deletion batch key', async () => {
    const prisma = {
      learningGoal: {
        findFirst: vi.fn().mockResolvedValue({ id: 'goal-1', studentId: 'student-1', goalDesc: '复习分数应用题', deletedAt: null }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      activityLog: { create: vi.fn().mockResolvedValue({ id: 'log-1' }) },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'teacher-user-1' }, teacher: { id: 'teacher-1' }, prisma,
    })
    mocks.assertTeacherOwnsStudent.mockResolvedValue({ id: 'student-1', name: '学生甲' })

    const response = await DELETE(new NextRequest('http://localhost/api/teacher/learning-goals?id=goal-1'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(prisma.learningGoal.findFirst).toHaveBeenCalledWith({ where: { id: 'goal-1', deletedAt: null } })
    expect(prisma.learningGoal.updateMany).toHaveBeenCalledWith({
      where: { id: 'goal-1', deletedAt: null },
      data: { deletedAt: expect.any(Date), deletionBatchId: expect.any(String) },
    })
    expect(prisma.activityLog.create).toHaveBeenCalledOnce()
  })

  it('does not allow editing an already soft-deleted goal', async () => {
    const prisma = { learningGoal: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() } }
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'teacher-user-1' }, teacher: { id: 'teacher-1' }, prisma,
    })

    const response = await PATCH(new NextRequest('http://localhost/api/teacher/learning-goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'goal-1', goalDesc: '改过的目标' }),
    }))

    expect(response.status).toBe(404)
    expect(prisma.learningGoal.findFirst).toHaveBeenCalledWith({ where: { id: 'goal-1', deletedAt: null } })
    expect(prisma.learningGoal.update).not.toHaveBeenCalled()
  })
})
