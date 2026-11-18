import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))
vi.mock('./rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }))
vi.mock('@/lib/auth/guards', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

import * as Sentry from '@sentry/nextjs'
import { apiHandler, sanitizeUrlForLog } from './api-handler'

afterEach(() => vi.restoreAllMocks())

describe('API error URL redaction', () => {
  it('redacts sensitive query parameters while retaining safe repeated parameters', () => {
    const sanitized = sanitizeUrlForLog(
      'https://user:pass@example.test/api/cron/daily?token=cron-secret&CRON_SECRET=another-secret&page=2&page=3#fragment',
    )

    expect(sanitized).toBeDefined()
    const url = new URL(sanitized!)
    expect(url.username).toBe('')
    expect(url.password).toBe('')
    expect(url.hash).toBe('')
    expect(url.searchParams.get('token')).toBe('[REDACTED]')
    expect(url.searchParams.get('CRON_SECRET')).toBe('[REDACTED]')
    expect(url.searchParams.getAll('page')).toEqual(['2', '3'])
    expect(sanitized).not.toContain('cron-secret')
    expect(sanitized).not.toContain('another-secret')
  })

  it('redacts sensitive values in thrown errors before sending them to logs or Sentry', async () => {
    const errorMessage = 'request failed at https://example.test/api/cron?token=cron-secret&CRON_SECRET=another-secret'
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const request = new NextRequest('https://example.test/api/cron/daily?token=cron-secret&run=1')
    const handler = apiHandler(async (_request: NextRequest) => {
      throw new Error(errorMessage)
    })

    await handler(request)

    const sentryError = vi.mocked(Sentry.captureException).mock.calls[0]?.[0] as Error
    const sentryExtra = vi.mocked(Sentry.captureException).mock.calls[0]?.[1] as { extra?: { url?: string } }
    const consoleError = errorLog.mock.calls[0]
    const consoleErrorObject = consoleError?.[2] as Error
    const serialized = [
      sentryError?.message,
      sentryError?.stack,
      sentryExtra?.extra?.url,
      consoleError?.[1],
      consoleErrorObject?.message,
      consoleErrorObject?.stack,
    ].join('\n')

    expect(serialized).toContain('[REDACTED]')
    expect(serialized).not.toContain('cron-secret')
    expect(serialized).not.toContain('another-secret')
  })
})
