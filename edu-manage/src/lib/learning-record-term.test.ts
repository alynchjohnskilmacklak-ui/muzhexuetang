import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { resolveLearningRecordTermId } from './learning-record-term'

describe('resolveLearningRecordTermId', () => {
  it('uses the active lesson group term when the student is enrolled', async () => {
    const classLessonFindFirst = vi.fn().mockResolvedValue({ group: { termId: 'term-a' } })
    const db = { classLesson: { findFirst: classLessonFindFirst } } as unknown as PrismaClient

    await expect(resolveLearningRecordTermId(db, {
      division: 'JUNIOR',
      studentId: 'student-a',
      classLessonId: 'lesson-a',
    })).resolves.toBe('term-a')

    expect(classLessonFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'lesson-a',
        group: expect.objectContaining({
          division: 'JUNIOR',
          term: { status: 'ACTIVE' },
          enrollments: { some: { studentId: 'student-a', status: 'ACTIVE' } },
        }),
      }),
    }))
  })

  it('falls back to the active operational membership without a lesson', async () => {
    const membershipFindFirst = vi.fn().mockResolvedValue({ termId: 'term-b' })
    const db = { studentTermMembership: { findFirst: membershipFindFirst } } as unknown as PrismaClient

    await expect(resolveLearningRecordTermId(db, {
      division: 'SENIOR',
      studentId: 'student-b',
    })).resolves.toBe('term-b')

    expect(membershipFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        studentId: 'student-b',
        status: 'ACTIVE',
        term: { division: 'SENIOR', status: 'ACTIVE' },
      },
    }))
  })

  it('does not invent a term when neither scope can be verified', async () => {
    const db = {
      classLesson: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient

    await expect(resolveLearningRecordTermId(db, {
      division: 'JUNIOR',
      studentId: 'student-c',
      classLessonId: 'lesson-missing',
    })).resolves.toBeNull()
  })
})
