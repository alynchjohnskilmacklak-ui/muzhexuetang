import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('teacher homework route placement', () => {
  it('registers the homework page inside the teacher route tree', () => {
    const pagePath = join(process.cwd(), 'src', 'app', 'teacher', 'homework', 'page.tsx')

    expect(existsSync(pagePath)).toBe(true)
  })
})
