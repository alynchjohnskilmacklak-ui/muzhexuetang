import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { hasCurrentParentStudent } from '@/lib/parent-account-validity'

function prismaFor(activeTermId: string | null, studentId: string | null) {
  return {
    academicTerm: { findFirst: vi.fn().mockResolvedValue(activeTermId ? { id: activeTermId } : null) },
    student: { findFirst: vi.fn().mockResolvedValue(studentId ? { id: studentId } : null) },
  } as unknown as PrismaClient
}

describe('parent account current-term validity', () => {
  it('accepts a parent linked to an active current-term student', async () => {
    expect(await hasCurrentParentStudent(prismaFor('term-current', 'student-current'), 'parent-1', 'JUNIOR')).toBe(true)
  })

  it('rejects an account that only belongs to a previous term', async () => {
    expect(await hasCurrentParentStudent(prismaFor('term-current', null), 'parent-old', 'JUNIOR')).toBe(false)
  })

  it('does not lock out all parents while no active term is configured', async () => {
    expect(await hasCurrentParentStudent(prismaFor(null, null), 'parent-1', 'JUNIOR')).toBe(true)
  })
})
