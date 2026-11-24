import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { isClassGroupInActiveTerm, isClassLessonInActiveTerm, resolveAdminTermScope } from './admin-term-scope'

function request(url: string, cookieTermId?: string) {
  return {
    nextUrl: new URL(url),
    cookies: {
      get: vi.fn((name: string) => name === 'muzhe_admin_term_scope' && cookieTermId
        ? { value: cookieTermId }
        : undefined),
    },
  } as unknown as NextRequest
}

const term = (id: string, status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') => ({
  id,
  name: id,
  code: id,
  status,
  startDate: new Date('2026-07-01'),
  endDate: new Date('2026-08-31'),
})

describe('admin term scope', () => {
  it('requires the current division when checking an active class group or lesson', async () => {
    const classGroupFindFirst = vi.fn().mockResolvedValue({ term: { status: 'ACTIVE' } })
    const classLessonFindFirst = vi.fn().mockResolvedValue({ group: { term: { status: 'ACTIVE' } } })
    const db = {
      classGroup: { findFirst: classGroupFindFirst },
      classLesson: { findFirst: classLessonFindFirst },
    } as unknown as PrismaClient

    await expect(isClassGroupInActiveTerm(db, 'group-a', 'SENIOR')).resolves.toBe(true)
    expect(classGroupFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'group-a', division: 'SENIOR', term: { division: 'SENIOR' } },
    }))

    await expect(isClassLessonInActiveTerm(db, 'lesson-a', 'JUNIOR')).resolves.toBe(true)
    expect(classLessonFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lesson-a', division: 'JUNIOR', group: { division: 'JUNIOR', term: { division: 'JUNIOR' } } },
    }))
  })

  it('uses the explicit query term before the persisted cookie', async () => {
    const findFirst = vi.fn().mockResolvedValue(term('query-term', 'ARCHIVED'))
    const db = { academicTerm: { findFirst } } as unknown as PrismaClient

    await expect(resolveAdminTermScope(db, 'JUNIOR', request('https://example.test?termId=query-term', 'cookie-term')))
      .resolves.toMatchObject({ id: 'query-term' })
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'query-term', division: 'JUNIOR' },
    }))
  })

  it('does not fall back when an explicit term belongs to another division', async () => {
    const db = { academicTerm: { findFirst: vi.fn().mockResolvedValue(null) } } as unknown as PrismaClient

    await expect(resolveAdminTermScope(db, 'JUNIOR', request('https://example.test?termId=senior-term')))
      .resolves.toBeNull()
  })

  it('falls back to the active term when a stale cookie cannot be resolved', async () => {
    const findFirst = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(term('active-term'))
    const db = { academicTerm: { findFirst } } as unknown as PrismaClient

    await expect(resolveAdminTermScope(db, 'JUNIOR', request('https://example.test', 'deleted-term')))
      .resolves.toMatchObject({ id: 'active-term' })
    expect(findFirst).toHaveBeenCalledTimes(2)
  })
})
