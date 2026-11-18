import { describe, expect, it, vi } from 'vitest'
import { getTeacherBusy } from './teacher-busy'

describe('teacher busy lookup', () => {
  it('queries only visible, non-cancelled class lessons', async () => {
    const lessonFindMany = vi.fn(async () => [])
    const prisma = { classLesson: { findMany: lessonFindMany } }
    await expect(getTeacherBusy(prisma as never, 'teacher-1', '2026-09-01', '18:30', '20:00')).resolves.toBeNull()
    expect(lessonFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        teacherId: 'teacher-1',
        status: { not: 'CANCELLED' },
        deletedAt: null,
        group: { deletedAt: null },
      }),
    }))
  })

  it('returns the first overlapping lesson', async () => {
    const prisma = {
      classLesson: { findMany: vi.fn(async () => [{
        startTime: '18:30', endTime: '20:00', group: { course: { name: '初中数学' } },
      }]) },
    }
    await expect(getTeacherBusy(prisma as never, 'teacher-1', '2026-09-01', '19:00', '19:30')).resolves.toEqual({
      source: 'lesson', label: '初中数学', start: '18:30', end: '20:00',
    })
  })
})
