import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('login management security contracts', () => {
  it('uses the shared User status policy in authentication and guards', () => {
    expect(source('src/lib/login-accounts.ts')).toContain('isUserDisabled(user.status)')
    expect(source('src/proxy.ts')).toContain('isUserDisabled(dbUser.status)')
    expect(source('src/lib/auth/guards.ts')).toContain('isUserActive(dbUser.status)')
    expect(source('src/app/api/auth/session-ping/route.ts')).toContain('isUserDisabled(dbUser.status)')
  })

  it('keeps login records admin-only and merges both databases for ALL', () => {
    const route = source('src/app/api/login-records/route.ts')
    expect(route).toContain("user.role !== 'admin'")
    expect(route).toContain("getPrismaForDivision('JUNIOR')")
    expect(route).toContain("getPrismaForDivision('SENIOR')")
    expect(route).toContain('mergeLoginRecordPage(')
  })

  it('returns and consumes a division discriminator for cross-database account actions', () => {
    expect(source('src/app/api/login-records/route.ts')).toContain('division: record.division')
    expect(source('src/app/(main)/login-records/page.tsx')).toContain('division: row.division')
    expect(source('src/app/api/users/[id]/status/route.ts')).toContain('getPrismaForDivision(targetDivision)')
  })

  it('records authenticated session resumes without writing on every page request', () => {
    expect(source('src/hooks/useSessionPing.ts')).toContain('recordAccess=1')
    expect(source('src/app/api/auth/session-ping/route.ts')).toContain('recordDailySessionAccess(')
    expect(source('src/proxy.ts')).not.toContain('recordDailySessionAccess(')
  })
})
