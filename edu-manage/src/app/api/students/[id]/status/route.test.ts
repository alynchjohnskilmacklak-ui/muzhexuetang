import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getRequestPrisma: vi.fn(),
  syncStudentHourSnapshot: vi.fn(),
  revalidatePath: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/student-hour-snapshot', () => ({ syncStudentHourSnapshot: mocks.syncStudentHourSnapshot }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { PATCH } from './route'

const AUTO_DISABLED_PARENT_SESSION_TOKEN = 'system-disabled-no-current-student'

function request(status: string) {
  return new NextRequest('http://localhost/api/students/student-1/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

function database(options: {
  status: string
  parentId?: string | null
  parentUserId?: string | null
  hasEligibleSibling?: boolean
  accountStatus?: string
  currentSessionToken?: string | null
}) {
  const student = {
    id: 'student-1',
    name: '学生甲',
    division: 'JUNIOR',
    parentId: options.parentId ?? 'parent-1',
    parentUserId: options.parentUserId === undefined ? 'parent-1' : options.parentUserId,
    status: options.status,
  }
  const tx = {
    student: {
      update: vi.fn().mockResolvedValue(student),
      findFirst: vi.fn().mockResolvedValue(options.hasEligibleSibling ? { id: 'sibling-1' } : null),
    },
    enrollment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    performancePost: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    examPaper: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    classroomFeedback: { findMany: vi.fn().mockResolvedValue([]) },
    notification: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    academicTerm: { findFirst: vi.fn().mockResolvedValue({ id: 'term-current' }) },
    user: {
      findFirst: vi.fn().mockResolvedValue({
        id: options.parentId || options.parentUserId || 'parent-1',
        status: options.accountStatus || 'active',
        currentSessionToken: options.currentSessionToken === undefined ? 'active-session' : options.currentSessionToken,
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(),
    activityLog: { create: vi.fn().mockResolvedValue({}) },
  }
  tx.$transaction.mockImplementation((operation: (client: typeof tx) => unknown) => operation(tx))
  mocks.getRequestPrisma.mockResolvedValue(tx)
  return tx
}

describe('student status parent account lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
    mocks.syncStudentHourSnapshot.mockResolvedValue(undefined)
  })

  async function patchStatus(status: string) {
    return PATCH(request(status), { params: Promise.resolve({ id: 'student-1' }) })
  }

  it('keeps a shared parent login active while another current-term child remains', async () => {
    const db = database({ status: 'INACTIVE', hasEligibleSibling: true })
    const response = await patchStatus('INACTIVE')
    expect(response.status).toBe(200)
    expect(db.user.updateMany).not.toHaveBeenCalled()
    expect(db.$queryRaw).toHaveBeenCalledOnce()
  })

  it('disables the household only after its last eligible child is inactive, including parentId-only links', async () => {
    const db = database({
      status: 'INACTIVE',
      parentId: 'legacy-parent',
      parentUserId: null,
      hasEligibleSibling: false,
    })
    const response = await patchStatus('INACTIVE')
    expect(response.status).toBe(200)
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'legacy-parent', role: 'parent', division: 'JUNIOR', status: 'active' },
      data: { status: 'disabled', currentSessionToken: AUTO_DISABLED_PARENT_SESSION_TOKEN },
    })
  })

  it('does not reactivate an administrator-disabled parent account', async () => {
    const db = database({
      status: 'ACTIVE',
      hasEligibleSibling: true,
      accountStatus: 'disabled',
      currentSessionToken: null,
    })
    const response = await patchStatus('ACTIVE')
    expect(response.status).toBe(200)
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })

  it('reactivates a lifecycle-disabled account only after a current-term child becomes eligible', async () => {
    const db = database({
      status: 'ACTIVE',
      hasEligibleSibling: true,
      accountStatus: 'disabled',
      currentSessionToken: AUTO_DISABLED_PARENT_SESSION_TOKEN,
    })
    const response = await patchStatus('ACTIVE')
    expect(response.status).toBe(200)
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'parent-1',
        role: 'parent',
        division: 'JUNIOR',
        status: 'disabled',
        currentSessionToken: { not: null },
      },
      data: { status: 'active', currentSessionToken: null },
    })
  })
})
