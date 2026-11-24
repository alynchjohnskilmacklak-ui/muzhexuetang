import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userFindMany: vi.fn(),
  teacherFindMany: vi.fn(),
  teacherFindUnique: vi.fn(),
  studentFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    loginRecord: { count: mocks.count },
    user: { findUnique: mocks.userFindUnique, findFirst: mocks.userFindFirst, findMany: mocks.userFindMany },
    teacher: { findMany: mocks.teacherFindMany, findUnique: mocks.teacherFindUnique },
    student: { findMany: mocks.studentFindMany },
  },
  getPrismaForDivision: () => ({
    loginRecord: { count: mocks.count },
    user: { findUnique: mocks.userFindUnique, findFirst: mocks.userFindFirst, findMany: mocks.userFindMany },
    teacher: { findMany: mocks.teacherFindMany, findUnique: mocks.teacherFindUnique },
    student: { findMany: mocks.studentFindMany },
  }),
  isDualDbEnabled: () => false,
}))

import { detectLoginRoleForIdentifier, getLoginStatus, resolveLoginIdentifier } from './login-accounts'

describe('persistent login lockout scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.count.mockResolvedValue(4)
  })

  it('counts failures only for the current trusted client IP', async () => {
    await expect(getLoginStatus(' Parent@Example.com ', undefined, '203.0.113.8')).resolves.toEqual({
      locked: false,
      failCount: 4,
      remaining: 1,
    })
    expect(mocks.count).toHaveBeenCalledWith({
      where: {
        email: 'parent@example.com',
        ip: '203.0.113.8',
        success: false,
        failReason: { not: 'locked' },
        createdAt: { gte: expect.any(Date) },
      },
    })
  })

  it('does not apply a global account lock when no trusted client IP is available', async () => {
    await expect(getLoginStatus('parent@example.com', undefined, 'unknown')).resolves.toEqual({
      locked: false,
      failCount: 0,
      remaining: 5,
    })
    expect(mocks.count).not.toHaveBeenCalled()
  })

  it('does not hardcode a person as the default role when one phone is both admin and teacher', async () => {
    mocks.teacherFindMany.mockResolvedValue([{
      id: 'teacher-a',
      name: '任意教师姓名',
      phone: '13800138000',
      email: 'teacher@example.com',
      status: 'ACTIVE',
      division: 'JUNIOR',
    }])
    mocks.userFindFirst.mockResolvedValue({ email: 'teacher@example.com' })
    mocks.userFindUnique.mockResolvedValue({ email: 'admin@example.com', role: 'admin' })
    mocks.studentFindMany.mockResolvedValue([])

    await expect(detectLoginRoleForIdentifier('13800138000', 'phone')).resolves.toEqual({ role: null, division: null })
  })

  it('resolves bare pinyin account name without domain suffix to st.com parent account', async () => {
    mocks.userFindUnique.mockImplementation(async ({ where }: { where: { email: string } }) => {
      if (where.email === 'mazichen@st.com') {
        return { email: 'mazichen@st.com' }
      }
      return null
    })

    const res = await resolveLoginIdentifier('mazichen', 'parent', undefined, 'email')
    expect(res).toEqual({ ok: true, email: 'mazichen@st.com' })
  })

  it('resolves parent phone number to parent account even when loginRole was set to admin', async () => {
    mocks.userFindUnique.mockResolvedValue(null)
    mocks.teacherFindMany.mockResolvedValue([])
    mocks.studentFindMany.mockResolvedValue([{
      parentPhone: '17367911013',
      parentUserId: 'parent-123',
      parentId: 'parent-123',
    }])
    mocks.userFindMany.mockResolvedValue([{ email: 'mazichen@st.com' }])

    const res = await resolveLoginIdentifier('17367911013', 'admin', undefined, 'phone')
    expect(res).toEqual({ ok: true, email: 'mazichen@st.com' })
  })
})
