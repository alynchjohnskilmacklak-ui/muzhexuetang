import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  isClassGroupInActiveTerm: vi.fn(),
  createNotification: vi.fn(),
  syncStudentHourSnapshot: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ isClassGroupInActiveTerm: mocks.isClassGroupInActiveTerm }))
vi.mock('@/lib/notifications', () => ({ createNotification: mocks.createNotification }))
vi.mock('@/lib/student-hour-snapshot', () => ({ syncStudentHourSnapshot: mocks.syncStudentHourSnapshot }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

function makeRequest() {
  return new NextRequest('http://localhost/api/class-groups/group-1/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: 'student-new', totalHours: 5, subjects: ['数学'] }),
  })
}

describe('POST /api/class-groups/[id]/enrollments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('按课次教师分配把无 subject 字段的旧课次写入对应学员快照', async () => {
    const group = {
      id: 'group-1',
      division: 'JUNIOR',
      status: 'ACTIVE',
      teacherId: 'teacher-math',
      maxStudents: 0,
      lessonMinutes: 60,
      course: { name: '综合课程', subject: '综合课程' },
      teacherAssignments: [
        { teacherId: 'teacher-math', subject: '数学' },
        { teacherId: 'teacher-english', subject: '英语' },
      ],
      teacher: { name: '数学老师' },
      room: { name: '一号教室' },
      classLessons: [],
    }
    const mathLesson = {
      id: 'legacy-math-lesson', lessonDate: localDateColumnValue(todayLocal()), startTime: '14:00',
      subject: null, teacherId: 'teacher-math',
    }
    const englishLesson = {
      id: 'legacy-english-lesson', lessonDate: localDateColumnValue(todayLocal()), startTime: '15:00',
      subject: null, teacherId: 'teacher-english',
    }
    const tx = {
      enrollment: {
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ student: { id: 'student-new', name: '新学员', parentId: null, parentUserId: null } }),
      },
      student: { update: vi.fn() },
      classLesson: { findMany: vi.fn().mockResolvedValue([mathLesson, englishLesson]) },
      classLessonStudent: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      activityLog: { create: vi.fn() },
    }
    const prisma = {
      classGroup: { findFirst: vi.fn().mockResolvedValue(group) },
      classLesson: {
        findMany: vi.fn().mockResolvedValue([{ subject: '数学' }, { subject: '英语' }]),
      },
      student: { findFirst: vi.fn().mockResolvedValue({ id: 'student-new' }) },
      enrollment: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }

    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.isClassGroupInActiveTerm.mockResolvedValue(true)
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'group-1' }) })

    expect(response.status).toBe(201)
    expect(tx.classLessonStudent.createMany).toHaveBeenCalledWith({
      data: [{ lessonId: mathLesson.id, studentId: 'student-new' }],
      skipDuplicates: true,
    })
  })
})
