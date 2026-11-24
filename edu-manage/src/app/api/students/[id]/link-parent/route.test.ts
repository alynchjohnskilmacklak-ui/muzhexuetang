import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn() }))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { DELETE, POST } from './route'

function database(remainingChild: { id: string } | null) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    student: {
      update: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(remainingChild),
    },
    academicTerm: { findFirst: vi.fn().mockResolvedValue({ id: 'term-current' }) },
    user: {
      findFirst: vi.fn().mockResolvedValue({ id: 'parent-a', status: 'active' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    activityLog: { create: vi.fn().mockResolvedValue({}) },
  }
  const db = {
    student: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'student-a',
        name: '学员甲',
        division: 'JUNIOR',
        parentId: 'parent-a',
        parentUserId: 'parent-a',
      }),
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    tx,
  }
  mocks.getRequestPrisma.mockResolvedValue(db)
  return db
}

function request() {
  return new NextRequest('http://localhost/api/students/student-a/link-parent', { method: 'DELETE' })
}

function rebindRequest() {
  return new NextRequest('http://localhost/api/students/student-a/link-parent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'existing', existingParentUserId: 'parent-a' }),
  })
}

describe('DELETE /api/students/[id]/link-parent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'admin-a', role: 'admin' } })
  })

  it('disables the parent login after unlinking the last active child', async () => {
    const db = database(null)
    const response = await DELETE(request(), { params: Promise.resolve({ id: 'student-a' }) })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, parentAccountDisabled: true })
    expect(db.tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'parent-a', role: 'parent', division: 'JUNIOR', status: 'active' },
      data: { status: 'disabled', currentSessionToken: 'system-disabled-no-current-student' },
    })
  })

  it('keeps a shared parent account active while another eligible child remains linked', async () => {
    const db = database({ id: 'sibling-a' })
    const response = await DELETE(request(), { params: Promise.resolve({ id: 'student-a' }) })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, parentAccountDisabled: false })
    expect(db.tx.user.updateMany).not.toHaveBeenCalled()
    expect(db.tx.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [{ parentId: 'parent-a' }, { parentUserId: 'parent-a' }],
        termMemberships: { some: { termId: 'term-current', status: 'ACTIVE' } },
      }),
    }))
  })

  it('reactivates an account disabled by unlinking when an admin binds it again', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      user: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      student: { update: vi.fn().mockResolvedValue({}) },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    }
    const db = {
      student: { findUnique: vi.fn().mockResolvedValue({ id: 'student-a', name: '学员甲', division: 'JUNIOR' }) },
      user: { findFirst: vi.fn().mockResolvedValue({
        id: 'parent-a', name: '家长甲', email: 'parent@example.com', status: 'disabled',
        currentSessionToken: 'system-disabled-no-current-student',
      }) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await POST(rebindRequest(), { params: Promise.resolve({ id: 'student-a' }) })

    expect(response.status).toBe(200)
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'parent-a', role: 'parent', status: 'disabled', currentSessionToken: 'system-disabled-no-current-student' },
      data: { status: 'active', currentSessionToken: null },
    })
  })
})
