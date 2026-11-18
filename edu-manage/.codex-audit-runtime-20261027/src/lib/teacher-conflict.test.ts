import { describe, expect, it, vi } from 'vitest'
import { checkTeacherConflict } from '@/lib/teacher-conflict'

describe('checkTeacherConflict', () => {
  it('returns one response contract for all conflict APIs', async () => {
    const prisma = {
      classLesson: {
        findMany: vi.fn().mockResolvedValue([{
          startTime: '09:00', endTime: '10:00', group: { course: { name: '数学班' } },
        }]),
      },
      schedule: { findMany: vi.fn().mockResolvedValue([]) },
      deletedRecord: { findMany: vi.fn().mockResolvedValue([]) },
    }
    await expect(checkTeacherConflict(prisma as never, {
      teacherId: 'teacher-1', date: '2026-09-12', startTime: '09:30', endTime: '10:30',
    })).resolves.toEqual({
      conflict: true,
      conflictDetail: '数学班 09:00-10:00',
      source: 'lesson',
    })
  })
})
