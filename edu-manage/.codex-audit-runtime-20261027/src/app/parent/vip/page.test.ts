import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn(), getParentChildren: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/parent-children', () => ({ getParentChildren: mocks.getParentChildren }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'b' }) }) }))
vi.mock('./client', () => ({ IntensiveListClient: () => null }))
import ParentVipPage from './page'

describe('VIP server payload access boundary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries only published, undeleted feedback belonging to authorized records', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'parent' } })
    mocks.getParentChildren.mockResolvedValue([
      { id: 'a', name: '甲', recordIds: ['a', 'a-old'], grade: '初一' },
      { id: 'b', name: '乙', recordIds: ['b'], grade: '初三' },
    ])
    const db = {
      student: { findMany: vi.fn().mockResolvedValue([
        { id: 'a-old', enrollments: [{ id: 'enrollment', group: { id: 'g' } }] },
        { id: 'b', enrollments: [] },
      ]) },
      attendance: { findMany: vi.fn().mockResolvedValue([]) },
      classLessonStudent: { findMany: vi.fn().mockResolvedValue([]) },
      classLesson: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)
    const result = await ParentVipPage({ searchParams: Promise.resolve({ childId: 'a-old' }) })
    expect(db.classLesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ classroomFeedbacks: expect.objectContaining({
        where: { status: 'PUBLISHED', deletedAt: null, studentIds: { hasSome: ['a-old', 'b'] } },
      }) }),
    }))
    expect(result.props.initialSelectedStudentId).toBe('a')
    expect(result.props.students).toHaveLength(2)
    expect(result.props.students[0].enrollments).toHaveLength(1)
  })
})
