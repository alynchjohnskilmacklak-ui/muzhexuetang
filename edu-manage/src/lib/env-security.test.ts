import { describe, expect, it } from 'vitest'
import { productionSecurityEnvErrors } from '@/lib/env-security'

const validProductionEnv = {
  NODE_ENV: 'production',
  NEXTAUTH_URL: 'https://muzhexuetang.example',
  AUTH_SECRET: 'a'.repeat(48),
  NEXTAUTH_SECRET: 'a'.repeat(48),
  DATABASE_URL_JUNIOR: 'postgresql://example/junior',
  DATABASE_URL_SENIOR: 'postgresql://example/senior',
}

describe('production security environment', () => {
  it('accepts a complete HTTPS production configuration', () => {
    expect(productionSecurityEnvErrors(validProductionEnv)).toEqual([])
  })

  it('rejects weak secrets, HTTP and missing databases', () => {
    const errors = productionSecurityEnvErrors({
      NODE_ENV: 'production',
      NEXTAUTH_URL: 'http://example.com',
      AUTH_SECRET: 'short',
    })
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('32'),
      expect.stringContaining('HTTPS'),
      expect.stringContaining('DATABASE_URL_JUNIOR'),
      expect.stringContaining('DATABASE_URL_SENIOR'),
    ]))
  })

  it('does not block the production build phase', () => {
    expect(productionSecurityEnvErrors({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })).toEqual([])
  })
})

