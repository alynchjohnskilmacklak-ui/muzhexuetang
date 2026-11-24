import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { buildSystemDigest } from './system-context'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/auth/guards', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
  requireAdminUser: vi.fn(),
  requireTeacherUser: vi.fn(),
}))

function makePrisma() {
  return {
    classLesson: {
      count: vi.fn().mockResolvedValue(4),
      findMany: vi.fn().mockResolvedValue([{
        id: 'lesson-1',
        subject: '数学',
        startTime: '09:00',
        endTime: '10:00',
        groupId: 'group-1',
        status: 'SCHEDULED',
      }]),
    },
    classGroup: { findMany: vi.fn().mockResolvedValue([{ id: 'group-1', name: '周末班' }]) },
    notification: { count: vi.fn().mockResolvedValue(0) },
  } as unknown as PrismaClient
}

describe('teacher AI lesson summary scope', () => {
  it('counts direct, group-level, and assigned-teacher lessons using visible lesson conditions', async () => {
    const prisma = makePrisma()

    const digest = await buildSystemDigest(
      { id: 'user-1', role: 'teacher', teacherId: 'teacher-42' },
      prisma,
    )

    expect(digest.counts.todayLessons).toBe(4)
    const where = vi.mocked(prisma.classLesson.count).mock.calls[0][0]?.where as Record<string, unknown>
    expect(where.lessonDate).toEqual(expect.objectContaining({ gte: expect.any(Date), lt: expect.any(Date) }))
    expect(where.status).toEqual({ notIn: ['CANCELLED', 'POSTPONED'] })
    expect(where.deletedAt).toBeNull()
    expect(where.group).toEqual(expect.objectContaining({
      status: { not: 'ARCHIVED' },
      deletedAt: null,
      course: { isActive: true, deletedAt: null },
    }))
    expect(where.OR).toEqual(expect.arrayContaining([
      { teacherId: 'teacher-42' },
      { teacherId: null, group: { teacherId: 'teacher-42' } },
      { teacherId: null, group: { teacherAssignments: { some: { teacherId: 'teacher-42' } } } },
    ]))
    expect(prisma.classLesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining(where),
      orderBy: { startTime: 'asc' },
      take: 8,
    }))
    expect(digest.lines).toContain('09:00-10:00 数学 周末班（待上课）')
  })

  it('does not count unscoped lessons when a teacher identity is unresolved', async () => {
    const prisma = makePrisma()

    const digest = await buildSystemDigest(
      { id: 'user-legacy', role: 'teacher', teacherId: null },
      prisma,
    )

    expect(digest.counts.todayLessons).toBe(0)
    expect(prisma.classLesson.count).not.toHaveBeenCalled()
  })
})
