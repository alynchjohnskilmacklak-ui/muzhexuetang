import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  resolveAdminTermScope: vi.fn(),
  persistPreparedLessonPreviewMaterial: vi.fn(),
  prepareLessonPreviewMaterial: vi.fn(),
  validateLessonPreviewFile: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({ requireAdminUser: mocks.requireAdminUser }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: mocks.resolveAdminTermScope }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
vi.mock('@/lib/lesson-preview-material', () => ({
  LessonPreviewPublishError: class LessonPreviewPublishError extends Error {},
  persistPreparedLessonPreviewMaterial: mocks.persistPreparedLessonPreviewMaterial,
  prepareLessonPreviewMaterial: mocks.prepareLessonPreviewMaterial,
  validateLessonPreviewFile: mocks.validateLessonPreviewFile,
}))

import { GET, POST } from './route'

function lesson(id: string, snapshotStudentIds: string[]) {
  return {
    id,
    groupId: 'group-1',
    lessonDate: localDateColumnValue(todayLocal()),
    startTime: '09:00',
    endTime: '10:00',
    subject: '数学',
    teacher: { id: 'teacher-1', name: '教师甲' },
    lessonStudents: snapshotStudentIds.map((studentId) => ({ studentId })),
    lessonPreviewMaterial: null,
    group: {
      name: '周末班',
      teacher: { id: 'teacher-1', name: '教师甲' },
      teacherAssignments: [],
      term: { kind: 'WEEKEND' },
      course: { subject: '数学' },
      enrollments: [
        { studentId: 'student-english', subjects: ['英语'] },
        { studentId: 'student-math', subjects: ['数学'] },
      ],
    },
  }
}

describe('GET /api/admin/materials/lesson-previews subject roster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveAdminTermScope.mockResolvedValue({ id: 'term-1' })
  })

  it('counts only active enrollments in the lesson subject and does not infer a current roster without a snapshot', async () => {
    const findMany = vi.fn().mockResolvedValue([
      lesson('lesson-with-snapshot', ['student-english', 'student-math']),
      lesson('lesson-without-snapshot', []),
    ])
    mocks.requireAdminUser.mockResolvedValue({
      id: 'admin-1',
      division: 'JUNIOR',
      prisma: {
        course: { findMany: vi.fn().mockResolvedValue([{ grade: '初一' }]) },
        classLesson: { findMany },
      },
    })

    const response = await GET(new NextRequest(`http://localhost/api/admin/materials/lesson-previews?grade=初一&date=${todayLocal()}`))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.lessons.map((item: { id: string; studentCount: number }) => ({ id: item.id, studentCount: item.studentCount }))).toEqual([
      { id: 'lesson-with-snapshot', studentCount: 1 },
      { id: 'lesson-without-snapshot', studentCount: 0 },
    ])
    expect(findMany.mock.calls[0][0].select.group.select.enrollments.select).toEqual({ studentId: true, subjects: true })
  })
})

describe('POST /api/admin/materials/lesson-previews grouped upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveAdminTermScope.mockResolvedValue({ id: 'term-1' })
    mocks.validateLessonPreviewFile.mockImplementation(() => undefined)
    mocks.prepareLessonPreviewMaterial.mockResolvedValue({
      data: { classLessonId: 'lesson-1', title: '数学讲义' },
    })
    mocks.persistPreparedLessonPreviewMaterial.mockResolvedValue({ id: 'material-1' })
  })

  it('uses one file for every same-class, same-day, same-subject, same-teacher lesson', async () => {
    const upsert = vi.fn()
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'lesson-1',
        groupId: 'group-1',
        teacherId: 'teacher-1',
        subject: '数学',
        lessonDate: localDateColumnValue('2026-10-31'),
        group: {
          teacherId: 'teacher-1',
          teacherAssignments: [],
          term: { kind: 'WEEKEND' },
          course: { grade: '初三', subject: '数学' },
        },
      },
      {
        id: 'lesson-2',
        groupId: 'group-1',
        teacherId: 'teacher-1',
        subject: '数学',
        lessonDate: localDateColumnValue('2026-10-31'),
        group: {
          teacherId: 'teacher-1',
          teacherAssignments: [],
          term: { kind: 'WEEKEND' },
          course: { grade: '初三', subject: '数学' },
        },
      },
    ])
    const transaction = vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({ studyMaterial: { upsert } }),
    )
    mocks.requireAdminUser.mockResolvedValue({
      id: 'admin-1',
      division: 'JUNIOR',
      prisma: {
        classLesson: { findMany },
        studyMaterial: { findMany: vi.fn().mockResolvedValue([]) },
        $transaction: transaction,
      },
    })

    const formData = new FormData()
    formData.append('file-0', new File(['lesson notes'], 'math.pdf', { type: 'application/pdf' }))
    formData.append('assignments', JSON.stringify([{
      fileKey: 'file-0',
      lessonIds: ['lesson-1', 'lesson-2'],
      title: '数学讲义',
    }]))
    const response = await POST(new NextRequest('http://localhost/api/admin/materials/lesson-previews', {
      method: 'POST',
      body: formData,
    }))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toMatchObject({ count: 1, sessionCount: 2 })
    expect(mocks.prepareLessonPreviewMaterial).toHaveBeenCalledTimes(1)
    expect(mocks.prepareLessonPreviewMaterial).toHaveBeenCalledWith(expect.objectContaining({ classLessonId: 'lesson-1' }))
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { classLessonId: 'lesson-2' },
      create: expect.objectContaining({ classLessonId: 'lesson-2' }),
      update: expect.objectContaining({ classLessonId: 'lesson-2' }),
    }))
  })
})
