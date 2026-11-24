import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  resolveAdminTermScope: vi.fn(),
  getRequestDivision: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: mocks.resolveAdminTermScope }))
vi.mock('@/lib/division', () => ({ getRequestDivision: mocks.getRequestDivision }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

const fridayDate = '2026-10-30'
const saturdayDate = '2026-10-31'

function lesson(id: string, groupId = 'group-1', teacherId = 'teacher-1', date = fridayDate) {
  const assignment = { teacherId, subject: '数学', teacher: { id: teacherId, name: '任老师' } }
  return {
    id,
    groupId,
    teacherId,
    subject: '数学',
    lessonDate: localDateColumnValue(date),
    startTime: '09:00',
    endTime: '10:00',
    group: {
      id: groupId,
      name: groupId === 'group-1' ? '数学周末班' : '数学提高班',
      teacherId,
      course: { name: '数学', subject: '数学' },
      room: { id: 'room-1', name: '201教室' },
      teacher: { id: teacherId, name: '任老师' },
      teacherAssignments: [assignment],
      enrollments: [{ studentId: 'student-1', subjects: ['数学'] }],
    },
    teacher: { id: teacherId, name: '任老师' },
    lessonStudents: [{ studentId: 'student-1' }],
  }
}

function request() {
  return new NextRequest('http://localhost/api/class-lessons/copy-friday-to-saturday?division=JUNIOR', {
    method: 'POST',
    body: JSON.stringify({ fridayDate, dryRun: false }),
  })
}

function setup(transactionRows: ReturnType<typeof lesson>[], transactionSource = lesson('friday-lesson')) {
  const fridayLesson = lesson('friday-lesson')
  const transactionCreate = vi.fn().mockResolvedValue({ id: 'created-lesson' })
  const transactionFindMany = vi.fn()
    .mockResolvedValueOnce([transactionSource])
    .mockResolvedValueOnce(transactionRows)
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>, _options?: unknown) => callback({
    classLesson: { findMany: transactionFindMany, create: transactionCreate },
    classLessonStudent: { createMany: vi.fn() },
    classGroup: { update: vi.fn() },
    activityLog: { create: vi.fn() },
  }))
  const findMany = vi.fn()
    .mockResolvedValueOnce([fridayLesson])
    .mockResolvedValueOnce([])

  mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
  mocks.getRequestDivision.mockReturnValue('JUNIOR')
  mocks.resolveAdminTermScope.mockResolvedValue({ id: 'term-1', status: 'ACTIVE' })
  mocks.getRequestPrisma.mockResolvedValue({ classLesson: { findMany }, $transaction: transaction })

  return { transaction, findMany, transactionCreate }
}

describe('POST /api/class-lessons/copy-friday-to-saturday', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips an identical Saturday lesson that appeared after preflight instead of duplicating it', async () => {
    const { transaction } = setup([lesson('saturday-lesson', 'group-1', 'teacher-1', saturdayDate)])

    const response = await POST(request())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ ok: true, createdCount: 0, skippedCount: 1, createdLessonIds: [] })
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
  })

  it('rejects a conflicting Saturday lesson that appeared after preflight', async () => {
    const { transaction } = setup([lesson('other-saturday-lesson', 'group-2', 'teacher-1', saturdayDate)])

    const response = await POST(request())
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({ ok: false, error: '周六复制后存在冲突' })
    expect(payload.conflicts).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'teacher' })]))
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('requires a fresh preview when the source lesson changed after preflight', async () => {
    const changedSource = { ...lesson('friday-lesson'), startTime: '09:15' }
    const { transaction, transactionCreate } = setup([], changedSource)

    const response = await POST(request())
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({ ok: false, error: '周五课程名单或安排已变化，请重新预览后重试' })
    expect(transactionCreate).not.toHaveBeenCalled()
    expect(transaction).toHaveBeenCalledTimes(1)
  })
})
