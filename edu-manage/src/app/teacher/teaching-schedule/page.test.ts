import { beforeEach, describe, expect, it, vi } from 'vitest'

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }))

vi.mock('next/navigation', () => ({ redirect }))

import LegacyTeacherSchedulePage from './page'

describe('legacy teacher schedule route', () => {
  beforeEach(() => redirect.mockClear())

  it('redirects old schedule links to the canonical schedule page', () => {
    LegacyTeacherSchedulePage()

    expect(redirect).toHaveBeenCalledWith('/teacher/schedule')
  })
})
