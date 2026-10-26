import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('production surfaces never substitute fake school records', () => {
  it.each([
    'src/app/(main)/dashboard/page.tsx', 'src/app/(main)/courses/page.tsx',
    'src/app/api/dashboard/closed-loop/route.ts', 'src/app/api/dashboard/teacher-compliance/route.ts',
    'src/app/api/dashboard/class-detail/route.ts', 'src/app/api/dashboard/appointment-detail/route.ts',
  ])('has no runtime demo fixture in %s', file => {
    const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8')
    expect(source).not.toMatch(/MOCK_|TODO_MOCK|m-teacher-|mock-msg-|mock-l\d/)
    expect(source).not.toContain('王祁涵')
    expect(source).not.toContain('田昊彬')
  })
  it('excludes local seed scripts and database dumps from image context', () => {
    const ignore = fs.readFileSync(path.resolve(process.cwd(), '.dockerignore'), 'utf8')
    expect(ignore).toContain('scripts/local-test-seed.ts')
    expect(ignore).toContain('*.dump')
    expect(ignore).toContain('*.db')
  })
})
