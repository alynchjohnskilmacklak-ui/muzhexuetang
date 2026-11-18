import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn(), getParentChildren: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/parent-children', async (original) => ({
  ...await original<typeof import('@/lib/parent-children')>(), getParentChildren: mocks.getParentChildren,
}))
import { POST } from './route'

function request(studentId = 'a', lessonId = 'lesson') {
  return new NextRequest('http://localhost/api/parent/leave', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, lessonId, reason: '家中有事', leaveDate: '2026-10-15T00:00:00Z' }),
  })
}

describe('leave requests for merged parent children', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent' } })
    mocks.getParentChildren.mockResolvedValue([{ id: 'a', recordIds: ['a', 'a-old'] }])
  })

  function database(roster = ['a-old']) {
    const db = {
      classLesson: { findFirst: vi.fn().mockResolvedValue({
        id: 'lesson', isManual: true, subject: '数学', lessonStudents: roster.map((studentId) => ({ studentId })),
        group: { intensiveMode: 'NORMAL', course: { subject: '数学' }, enrollments: [{ studentId: 'a-old', subjects: ['数学'] }] },
      }) },
      student: { findUnique: vi.fn().mockResolvedValue({ id: 'a-old', name: '甲', mainTeacher: null }) },
      leaveRequest: { create: vi.fn().mockResolvedValue({
        id: 'leave', student: { name: '甲' }, lesson: null, leaveDate: new Date('2026-10-15'), reason: '家中有事',
        status: 'pending', replyNote: '已提交', createdAt: new Date('2026-10-11'),
      }), findFirst: vi.fn().mockResolvedValue(null) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      notification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      $executeRaw: vi.fn().mockResolvedValue(1),
      $transaction: vi.fn(),
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    }
    db.$transaction.mockImplementation((operation) => operation(db))
    mocks.getRequestPrisma.mockResolvedValue(db)
    return db
  }

  it('maps the canonical child to the authorized historical record in the selected lesson', async () => {
    const db = database()
    expect((await POST(request())).status).toBe(201)
    expect(db.leaveRequest.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ studentId: 'a-old', lessonId: 'lesson' }) }))
  })

  it('does not authorize a sibling or foreign record through shared class enrollment', async () => {
    const db = database(['b'])
    expect((await POST(request())).status).toBe(400)
    expect(db.leaveRequest.create).not.toHaveBeenCalled()
  })

  it('rejects students not linked to the authenticated parent', async () => {
    const db = database()
    expect((await POST(request('foreign'))).status).toBe(403)
    expect(db.classLesson.findFirst).not.toHaveBeenCalled()
    expect(db.leaveRequest.create).not.toHaveBeenCalled()
  })

  it('uses stable teacher account bindings for actual lesson and main teachers', async () => {
    const db = database()
    db.classLesson.findFirst.mockResolvedValueOnce({
      id: 'lesson', isManual: true, teacherId: 'actual', subject: '数学', lessonStudents: [{ studentId: 'a-old' }],
      group: { teacherId: 'group-teacher', intensiveMode: 'NORMAL', course: { subject: '数学' }, enrollments: [] },
    } as never)
    db.user.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'custom-email-teacher' }] as never)
    expect((await POST(request())).status).toBe(201)
    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ teacherId: { in: ['actual', 'group-teacher'] } }) }))
    expect(db.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ userId: 'custom-email-teacher' })]) }))
  })

  it('reuses a saved application instead of creating duplicate rows or notifications', async () => {
    const db = database()
    db.leaveRequest.findFirst.mockResolvedValueOnce(await db.leaveRequest.create())
    db.leaveRequest.create.mockClear()
    expect((await POST(request())).status).toBe(200)
    expect(db.leaveRequest.create).not.toHaveBeenCalled()
    expect(db.notification.createMany).not.toHaveBeenCalled()
    expect(db.$executeRaw).toHaveBeenCalled()
  })

  it('does not report success if transactional notification persistence fails', async () => {
    const db = database()
    db.user.findMany.mockResolvedValueOnce([{ id: 'admin' }] as never)
    db.notification.createMany.mockRejectedValueOnce(new Error('database unavailable'))
    expect((await POST(request())).status).toBe(500)
    expect(db.activityLog.create).not.toHaveBeenCalled()
    expect(db.$transaction).toHaveBeenCalled()
  })
})
