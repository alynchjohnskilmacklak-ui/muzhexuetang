import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getPrisma: vi.fn(),
  resolveTeacher: vi.fn(),
  userFindUnique: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getPrismaForDivision: mocks.getPrisma }))
vi.mock('@/lib/teacher-account-binding', () => ({ resolveTeacherForUser: mocks.resolveTeacher }))
// @/lib/user-status 使用真实实现（normalizeUserStatus 的大小写/别名归一化逻辑需要被真实覆盖）。

import { getCurrentUser } from './get-user'

function sessionWith(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'u1',
      email: 'alice@example.com',
      name: 'Alice',
      role: 'admin',
      division: 'JUNIOR',
      sessionMark: 'tok1',
      ...overrides,
    },
  }
}

describe('getCurrentUser session revocation validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPrisma.mockReturnValue({ user: { findUnique: mocks.userFindUnique } })
    mocks.userFindUnique.mockResolvedValue({ currentSessionToken: 'tok1', status: 'ACTIVE' })
    mocks.resolveTeacher.mockResolvedValue({ id: 't-bound' })
  })

  it('returns null when there is no session at all', async () => {
    mocks.auth.mockResolvedValue(null)
    expect(await getCurrentUser()).toBeNull()
    expect(mocks.getPrisma).not.toHaveBeenCalled()
  })

  it('returns null when the session has no sessionMark', async () => {
    mocks.auth.mockResolvedValue(sessionWith({ sessionMark: undefined }))
    expect(await getCurrentUser()).toBeNull()
    expect(mocks.getPrisma).not.toHaveBeenCalled()
  })

  it('returns null when the db user no longer exists', async () => {
    mocks.auth.mockResolvedValue(sessionWith())
    mocks.userFindUnique.mockResolvedValue(null)
    expect(await getCurrentUser()).toBeNull()
  })

  it('returns null when the db user is disabled (ACTIVE check, real user-status)', async () => {
    mocks.auth.mockResolvedValue(sessionWith())
    mocks.userFindUnique.mockResolvedValue({ currentSessionToken: 'tok1', status: 'inactive' })
    expect(await getCurrentUser()).toBeNull()
  })

  it('returns null when currentSessionToken does not match the session mark', async () => {
    mocks.auth.mockResolvedValue(sessionWith())
    mocks.userFindUnique.mockResolvedValue({ currentSessionToken: 'other-device-token', status: 'ACTIVE' })
    expect(await getCurrentUser()).toBeNull()
  })

  it('fail closed: returns null when the db lookup throws and logs the error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.auth.mockResolvedValue(sessionWith())
    mocks.userFindUnique.mockRejectedValue(new Error('db down'))
    expect(await getCurrentUser()).toBeNull()
    expect(errSpy).toHaveBeenCalledWith('[current-user:session-validation]', {
      userId: 'u1',
      division: 'JUNIOR',
      message: 'db down',
    })
    errSpy.mockRestore()
  })

  it('returns the full user object for an active matching session (non-teacher => teacherId null)', async () => {
    mocks.auth.mockResolvedValue(sessionWith())
    const user = await getCurrentUser()
    expect(user).toEqual({
      id: 'u1',
      email: 'alice@example.com',
      name: 'Alice',
      role: 'admin',
      teacherId: null,
      division: 'JUNIOR',
    })
    expect(mocks.getPrisma).toHaveBeenCalledWith('JUNIOR')
    expect(mocks.resolveTeacher).not.toHaveBeenCalled()
  })

  it('routes to the SENIOR division when the session says so', async () => {
    mocks.auth.mockResolvedValue(sessionWith({ division: 'SENIOR' }))
    const user = await getCurrentUser()
    expect(user).toMatchObject({ division: 'SENIOR' })
    expect(mocks.getPrisma).toHaveBeenCalledWith('SENIOR')
  })

  it('keeps the session teacherId for a teacher session that already carries one', async () => {
    mocks.auth.mockResolvedValue(sessionWith({ role: 'teacher', teacherId: 't9' }))
    const user = await getCurrentUser()
    expect(user).toMatchObject({ role: 'teacher', teacherId: 't9' })
    expect(mocks.resolveTeacher).not.toHaveBeenCalled()
  })

  it('resolves the teacher binding for a teacher session without a stored teacherId', async () => {
    mocks.auth.mockResolvedValue(sessionWith({ role: 'teacher', teacherId: undefined }))
    mocks.userFindUnique.mockImplementation((args: { select: Record<string, unknown> }) => {
      if (args.select.currentSessionToken) {
        return Promise.resolve({ currentSessionToken: 'tok1', status: 'ACTIVE' })
      }
      return Promise.resolve({ id: 'u1', email: 'alice@example.com', name: 'Alice', role: 'teacher', teacherId: null })
    })
    const user = await getCurrentUser()
    expect(user).toMatchObject({ role: 'teacher', teacherId: 't-bound' })
    expect(mocks.resolveTeacher).toHaveBeenCalled()
  })
})
