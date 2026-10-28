import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/get-user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('@/lib/auth/guards', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
}))
vi.mock('@/lib/ai/system-context', () => ({
  buildSystemDigest: vi.fn().mockResolvedValue({ text: 'teacher digest' }),
}))
vi.mock('@/lib/ai/client', () => ({
  AIProviderError: class AIProviderError extends Error {},
  createSSEFromText: vi.fn((text: string) => text),
  fetchWithTimeout: vi.fn().mockResolvedValue(new Response('data: [DONE]\\n\\n', { status: 200 })),
}))

import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { buildSystemDigest } from '@/lib/ai/system-context'
import { POST } from './route'

afterEach(() => vi.restoreAllMocks())

describe('AI chat teacher digest identity', () => {
  it('passes the resolved teacher id into the shared lesson summary', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'user-1',
      email: 'teacher@example.test',
      name: 'Teacher',
      role: 'teacher',
      teacherId: 'teacher-resolved-42',
      division: 'JUNIOR',
    })
    vi.mocked(getRequestPrisma).mockResolvedValue({} as never)
    const request = new NextRequest('https://example.test/api/ai/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        modelId: 'deepseek',
        messages: [{ role: 'user', content: '今日有哪些课？' }],
      }),
    })

    await POST(request)

    expect(buildSystemDigest).toHaveBeenCalledWith(
      { id: 'user-1', role: 'teacher', teacherId: 'teacher-resolved-42' },
      expect.any(Object),
    )
  })
})
