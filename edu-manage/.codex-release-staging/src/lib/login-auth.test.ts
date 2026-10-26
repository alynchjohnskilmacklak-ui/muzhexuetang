import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loginRecordCount: vi.fn(),
  loginRecordCreate: vi.fn(),
  userFindUnique: vi.fn(),
  teacherFindUnique: vi.fn(),
  teacherFindMany: vi.fn(),
  compare: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  const db = {
    loginRecord: { count: mocks.loginRecordCount, create: mocks.loginRecordCreate },
    user: { findUnique: mocks.userFindUnique },
    teacher: { findUnique: mocks.teacherFindUnique, findMany: mocks.teacherFindMany },
  }
  return {
    prisma: db,
    getPrismaForDivision: () => db,
    isDualDbEnabled: () => true,
  }
})

vi.mock('@/lib/pinyin', () => ({ chineseToPinyin: (name: string) => name === '历史教师' ? 'lishijiaoshi' : name }))
vi.mock('bcryptjs', () => ({ default: { compare: mocks.compare } }))

import { precheckLoginAccount, validateLoginAccount } from '@/lib/login-accounts'

const parentUser = {
  id: 'parent-user',
  email: 'parent@example.com',
  password: '$2b$12$hash',
  name: '家长',
  role: 'parent',
  division: 'JUNIOR',
  status: 'active',
  teacherId: null,
}

describe('login authentication chain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loginRecordCount.mockResolvedValue(0)
    mocks.loginRecordCreate.mockResolvedValue({ id: 'record' })
    mocks.compare.mockResolvedValue(true)
    mocks.teacherFindMany.mockResolvedValue([])
  })

  it('keeps login-check preflight password-free', async () => {
    mocks.userFindUnique.mockResolvedValue(parentUser)

    const result = await precheckLoginAccount('parent@example.com', 'parent', 'JUNIOR')

    expect(result).toEqual({ ok: true })
    expect(mocks.compare).not.toHaveBeenCalled()
  })

  it('verifies a parent password exactly once in the authoritative login', async () => {
    mocks.userFindUnique.mockResolvedValue(parentUser)

    const result = await validateLoginAccount(
      'parent@example.com',
      'secret',
      'parent',
      { recordAttempt: true, recordSuccess: true },
      undefined,
      'JUNIOR',
    )

    expect(result.ok).toBe(true)
    expect(mocks.compare).toHaveBeenCalledTimes(1)
  })

  it.each(['active', 'ACTIVE'])('allows an enabled User status value %s', async (status) => {
    mocks.userFindUnique.mockResolvedValue({ ...parentUser, status })

    const result = await validateLoginAccount(
      'parent@example.com',
      'secret',
      'parent',
      { recordAttempt: true },
      undefined,
      'JUNIOR',
    )

    expect(result.ok).toBe(true)
    expect(mocks.compare).toHaveBeenCalledTimes(1)
  })

  it.each(['disabled', 'DISABLED'])('rejects a disabled User status value %s', async (status) => {
    mocks.userFindUnique.mockResolvedValue({ ...parentUser, status })

    const result = await validateLoginAccount(
      'parent@example.com',
      'secret',
      'parent',
      { recordAttempt: true },
      undefined,
      'JUNIOR',
    )

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected disabled login to fail')
    expect(result.code).toBe('DISABLED')
    expect(mocks.compare).not.toHaveBeenCalled()
  })

  it('resolves a bound teacher through User.teacherId without loading all teachers', async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...parentUser,
      id: 'teacher-user',
      email: 'teacher@tea.com',
      role: 'teacher',
      teacherId: 'teacher-1',
    })
    mocks.teacherFindUnique.mockResolvedValue({
      id: 'teacher-1',
      name: '新教师',
      phone: '13800000000',
      status: 'ACTIVE',
    })

    const result = await validateLoginAccount(
      'teacher@tea.com',
      'secret',
      'teacher',
      { recordAttempt: true },
      undefined,
      'JUNIOR',
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected teacher login to succeed')
    expect(result.user.teacherId).toBe('teacher-1')
    expect(mocks.teacherFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'teacher-1' } }))
    expect(mocks.teacherFindMany).not.toHaveBeenCalled()
    expect(mocks.compare).toHaveBeenCalledTimes(1)
  })

  it('retains the legacy pinyin fallback for an unbound teacher account', async () => {
    mocks.userFindUnique.mockResolvedValue({
      ...parentUser,
      id: 'legacy-teacher-user',
      email: 'lishijiaoshi@tea.com',
      role: 'teacher',
      teacherId: null,
    })
    mocks.teacherFindMany.mockResolvedValue([
      { id: 'legacy-teacher', name: '历史教师', phone: '13900000000' },
    ])

    const result = await validateLoginAccount(
      'lishijiaoshi@tea.com',
      'secret',
      'teacher',
      { recordAttempt: true },
      undefined,
      'JUNIOR',
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected legacy teacher login to succeed')
    expect(result.user.teacherId).toBe('legacy-teacher')
    expect(mocks.teacherFindMany).toHaveBeenCalledTimes(1)
    expect(mocks.compare).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['parent', parentUser],
    ['admin', { ...parentUser, id: 'admin-user', email: 'admin@example.com', role: 'admin' }],
  ] as const)('keeps %s login compatible', async (role, user) => {
    mocks.userFindUnique.mockResolvedValue(user)

    const result = await validateLoginAccount(
      user.email,
      'secret',
      role,
      { recordAttempt: true },
      undefined,
      'JUNIOR',
    )

    expect(result.ok).toBe(true)
    expect(mocks.compare).toHaveBeenCalledTimes(1)
  })
})
