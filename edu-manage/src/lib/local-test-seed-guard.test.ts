import { describe, expect, it } from 'vitest'
import { assertLocalTestSeedEnvironment } from './local-test-seed-guard'

describe('local-only test seed protection', () => {
  it('allows explicitly opted-in localhost seeds', () => {
    expect(() => assertLocalTestSeedEnvironment({ NODE_ENV: 'development', ALLOW_LOCAL_TEST_SEED: '1', DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1/test' })).not.toThrow()
  })
  it.each([
    { NODE_ENV: 'production', ALLOW_LOCAL_TEST_SEED: '1', DATABASE_URL: 'postgresql://fixture@localhost/test' },
    { NODE_ENV: 'development', DATABASE_URL: 'postgresql://fixture@localhost/test' },
    { ALLOW_LOCAL_TEST_SEED: '1', DATABASE_URL: 'postgresql://fixture@production.example.com/test' },
    { ALLOW_LOCAL_TEST_SEED: '1', DATABASE_URL: 'file:./database.db' },
  ])('blocks production, remote or unapproved targets %j', env => {
    expect(() => assertLocalTestSeedEnvironment(env)).toThrow()
  })
})
