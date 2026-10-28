import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createFeedbackExportImageUrl,
  verifyFeedbackExportImageToken,
} from './export-image-url'

describe('feedback export image URLs', () => {
  const previousSecret = process.env.AUTH_SECRET

  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-feedback-export-secret'
  })

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.AUTH_SECRET
    else process.env.AUTH_SECRET = previousSecret
  })

  it('creates an absolute, expiring URL bound to the asset id', () => {
    const now = Date.UTC(2026, 6, 22)
    const url = createFeedbackExportImageUrl('asset 1', {
      baseUrl: 'https://muzhexuetang.xyz/',
      division: 'SENIOR',
      now,
      ttlSeconds: 60,
    })
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://muzhexuetang.xyz')
    expect(parsed.searchParams.get('id')).toBe('asset 1')
    expect(verifyFeedbackExportImageToken(
      'asset 1',
      parsed.searchParams.get('division'),
      parsed.searchParams.get('expires'),
      parsed.searchParams.get('token'),
      now,
    )).toBe(true)
  })

  it('rejects expired or modified links', () => {
    const now = Date.UTC(2026, 6, 22)
    const parsed = new URL(createFeedbackExportImageUrl('asset-1', {
      baseUrl: 'https://muzhexuetang.xyz',
      division: 'JUNIOR',
      now,
      ttlSeconds: 60,
    }))
    const expires = parsed.searchParams.get('expires')
    const token = parsed.searchParams.get('token')
    expect(verifyFeedbackExportImageToken('asset-2', 'JUNIOR', expires, token, now)).toBe(false)
    expect(verifyFeedbackExportImageToken('asset-1', 'SENIOR', expires, token, now)).toBe(false)
    expect(verifyFeedbackExportImageToken('asset-1', 'JUNIOR', expires, token, now + 61_000)).toBe(false)
  })
})
