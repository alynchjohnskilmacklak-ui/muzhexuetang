import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  isClassGroupInActiveTerm: vi.fn(),
  recordCourseChangeEvent: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ isClassGroupInActiveTerm: mocks.isClassGroupInActiveTerm }))
vi.mock('@/lib/course-change-events', () => ({ recordCourseChangeEvent: mocks.recordCourseChangeEvent }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

function request() {
  return new NextRequest('http://localhost/api/class-groups/group-1/replace-teacher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldTeacherId: 'teacher-old', newTeacherId: 'teacher-new', subject: '数学' }),
  })
}

describe('POST /api/class-groups/[id]/replace-teacher', () => {
  beforeEach(() => vi.clearAllMocks())

  it('把旧班级 null 科目关系按课程默认科目迁移，不重复创建任课关系', async () => {
    const lesson = {
      id: 'lesson-legacy',
      teacherId: null,
      subject: null,
      lessonDate: localDateColumnValue('2026-11-07'),
      startTime: '09:00',
      endTime: '10:00',
    }
    const pastScheduledLesson = {
      ...lesson,
      id: 'lesson-past',
      lessonDate: localDateColumnValue('2026-10-30'),
    }
    const oldAssignment = { id: 'assignment-old', teacherId: 'teacher-old', subject: null }
    const group = {
      id: 'group-1',
      name: '周末数学班',
      status: 'ACTIVE',
      teacherId: 'teacher-old',
      teacher: { id: 'teacher-old', name: '旧老师' },
      teacherAssignments: [{ teacherId: 'teacher-old', subject: null }],
      course: { subject: '数学' },
    }
    const assignmentFindMany = vi.fn()
      .mockResolvedValueOnce([oldAssignment])
      .mockResolvedValueOnce([])
    const lessonFindMany = vi.fn()
      .mockResolvedValueOnce([pastScheduledLesson, lesson])
      .mockResolvedValueOnce([])
    const lessonUpdateMany = vi.fn().mockResolvedValue({ count: 1 })
    const assignmentUpdate = vi.fn()
    const assignmentCreate = vi.fn()
    const tx = {
      teacher: {
        findFirst: vi.fn().mockResolvedValue({ id: 'teacher-new', name: '新老师' }),
        findUnique: vi.fn().mockResolvedValue({ name: '旧老师' }),
      },
      classLesson: { findMany: lessonFindMany, updateMany: lessonUpdateMany },
      classGroupTeacher: {
        findMany: assignmentFindMany,
        update: assignmentUpdate,
        create: assignmentCreate,
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      classGroup: {
        findUnique: vi.fn().mockResolvedValue(group),
        update: vi.fn(),
      },
      enrollment: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn() },
      student: { update: vi.fn() },
      activityLog: { create: vi.fn() },
      classLessonStudent: { findMany: vi.fn().mockResolvedValue([{ studentId: 'student-1' }]) },
    }
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }

    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.isClassGroupInActiveTerm.mockResolvedValue(true)
    mocks.recordCourseChangeEvent.mockResolvedValue({ event: { id: 'change-1' } })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-31T10:00:00+08:00'))
    try {
      const response = await POST(request(), { params: Promise.resolve({ id: 'group-1' }) })

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ success: true, affectedLessons: 1, subject: '数学' })
      expect(lessonUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['lesson-legacy'] } }),
        data: { teacherId: 'teacher-new' },
      }))
      expect(assignmentUpdate).toHaveBeenCalledWith({
        where: { id: 'assignment-old' },
        data: { teacherId: 'teacher-new' },
      })
      expect(assignmentCreate).not.toHaveBeenCalled()
      expect(tx.classGroup.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'group-1' },
        data: expect.objectContaining({ teacherId: 'teacher-new' }),
      }))
      expect(mocks.recordCourseChangeEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        eventType: 'TEACHER_REPLACED',
        lessonIds: ['lesson-legacy'],
      }))
    } finally {
      vi.useRealTimers()
    }
  })

  it('当新老师档案学科不匹配待替换课次学科时拒绝替换', async () => {
    const lesson = {
      id: 'lesson-bio',
      teacherId: 'teacher-old',
      subject: '生物',
      lessonDate: localDateColumnValue('2026-11-07'),
      startTime: '09:00',
      endTime: '10:00',
    }
    const group = {
      id: 'group-1',
      name: '初三生物冲刺班',
      status: 'ACTIVE',
      teacherId: 'teacher-old',
      teacher: { id: 'teacher-old', name: '老生物老师' },
      teacherAssignments: [{ teacherId: 'teacher-old', subject: '生物' }],
      course: { subject: '生物' },
    }
    const tx = {
      teacher: {
        // 新老师只教化学
        findFirst: vi.fn().mockResolvedValue({ id: 'teacher-chem', name: '化学老师', subjects: '化学' }),
        findUnique: vi.fn().mockResolvedValue({ name: '老生物老师' }),
      },
      classLesson: { findMany: vi.fn().mockResolvedValue([lesson]) },
      classGroup: { findUnique: vi.fn().mockResolvedValue(group) },
    }
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }

    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.isClassGroupInActiveTerm.mockResolvedValue(true)

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-31T10:00:00+08:00'))
    try {
      const req = new NextRequest('http://localhost/api/class-groups/group-1/replace-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldTeacherId: 'teacher-old', newTeacherId: 'teacher-chem', subject: '生物' }),
      })
      const response = await POST(req, { params: Promise.resolve({ id: 'group-1' }) })
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('未登记任教 生物')
    } finally {
      vi.useRealTimers()
    }
  })
})
