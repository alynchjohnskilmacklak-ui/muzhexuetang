import { describe, expect, it } from 'vitest'
import { checkTeacherAiRateLimit } from './teacher-ai-rate-limit'

describe('teacher AI request budget', () => {
  it('shares a two-request-per-minute budget across AI feedback endpoints per teacher', async () => {
    const previousDriver = process.env.RATE_LIMIT_DRIVER
    process.env.RATE_LIMIT_DRIVER = 'memory'
    try {
      const teacherId = `ai-budget-test-${Date.now()}-${Math.random()}`
      await expect(checkTeacherAiRateLimit(teacherId)).resolves.toMatchObject({ allowed: true })
      await expect(checkTeacherAiRateLimit(teacherId)).resolves.toMatchObject({ allowed: true })
      await expect(checkTeacherAiRateLimit(teacherId)).resolves.toMatchObject({ allowed: false })
    } finally {
      if (previousDriver === undefined) delete process.env.RATE_LIMIT_DRIVER
      else process.env.RATE_LIMIT_DRIVER = previousDriver
    }
  })
})
