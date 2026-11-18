import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'

vi.mock('@/lib/auth/guards', () => {
  class MockAuthError extends Error {
    status: number
    constructor(message: string, status = 403) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError: MockAuthError,
    requireAdminUser: vi.fn(async () => { throw new MockAuthError('需要管理员权限') }),
  }
})

import { AuthError } from '@/lib/auth/guards'
import { FeedbackArchiveAccessError, type FeedbackArchiveResult } from '@/lib/classroom-feedback/archive'
import { handleFeedbackExport } from './handler'

const emptyArchive: FeedbackArchiveResult = {
  student: { id: 'student-a', name: '张三', grade: '初二' },
  summary: {
    totalCount: 0,
    subjectCount: 0,
    teacherCount: 0,
    firstFeedbackDate: null,
    latestFeedbackDate: null,
  },
  pagination: { page: 1, pageSize: 100, totalCount: 0, totalPages: 0 },
  items: [],
}

function request(path = '/api/admin/students/student-a/feedback-export') {
  return new NextRequest(`http://localhost${path}`)
}

function dependencies(overrides: Partial<Parameters<typeof handleFeedbackExport>[2]> = {}) {
  return {
    requireAdmin: vi.fn(async () => ({
      id: 'admin-a',
      role: 'admin',
      division: 'JUNIOR',
      prisma: {} as PrismaClient,
    })),
    loadArchive: vi.fn(async () => emptyArchive),
    renderMarkdown: vi.fn(() => '# 学生课堂反馈成长档案\n'),
    ...overrides,
  }
}

describe('admin feedback markdown export route', () => {
  it('returns a UTF-8 markdown attachment for an administrator', async () => {
    const response = await handleFeedbackExport(
      request('?subject=数学'),
      { params: Promise.resolve({ id: 'student-a' }) },
      dependencies(),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/markdown')
    expect(response.headers.get('content-disposition')).toContain("filename*=UTF-8''")
    expect(await response.text()).toContain('学生课堂反馈成长档案')
  })

  it('returns 403 when a teacher reaches the admin route', async () => {
    const response = await handleFeedbackExport(
      request(),
      { params: Promise.resolve({ id: 'student-a' }) },
      dependencies({ requireAdmin: vi.fn(async () => { throw new AuthError('需要管理员权限', 403) }) }),
    )
    expect(response.status).toBe(403)
  })

  it('returns 403 when a parent reaches the admin route', async () => {
    const response = await handleFeedbackExport(
      request(),
      { params: Promise.resolve({ id: 'student-a' }) },
      dependencies({ requireAdmin: vi.fn(async () => { throw new AuthError('需要管理员权限', 403) }) }),
    )
    expect(response.status).toBe(403)
  })

  it('returns 403 for an administrator from another division', async () => {
    const response = await handleFeedbackExport(
      request(),
      { params: Promise.resolve({ id: 'student-a' }) },
      dependencies({ loadArchive: vi.fn(async () => { throw new FeedbackArchiveAccessError('无权查看其他学部学生', 403) }) }),
    )
    expect(response.status).toBe(403)
  })

  it('returns 404 when the student does not exist', async () => {
    const response = await handleFeedbackExport(
      request(),
      { params: Promise.resolve({ id: 'missing' }) },
      dependencies({ loadArchive: vi.fn(async () => { throw new FeedbackArchiveAccessError('学生不存在', 404) }) }),
    )
    expect(response.status).toBe(404)
  })
})
