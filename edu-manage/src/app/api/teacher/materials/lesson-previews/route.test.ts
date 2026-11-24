import { beforeEach, describe, expect, it, vi } from 'vitest'
import { localDateColumnValue, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({ requireCurrentTeacher: vi.fn() }))

vi.mock('@/lib/teacher-portal', () => ({
  requireCurrentTeacher: mocks.requireCurrentTeacher,
  teacherLessonWhere: (teacherId: string) => ({ teacherId }),
}))
vi.mock('@/lib/business-visibility', () => ({ visibleStudentWhere: { deletedAt: null } }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

function lesson(id: string, snapshotStudentIds: string[]) {
  return {
    id,
    lessonDate: localDateColumnValue(todayLocal()),
    startTime: '09:00',
    endTime: '10:00',
    subject: '数学',
    lessonStudents: snapshotStudentIds.map((studentId) => ({ studentId })),
    lessonPreviewMaterial: null,
    group: {
      id: 'group-1',
      name: '周末班',
      term: { kind: 'WEEKEND' },
      room: { name: '201教室' },
      course: { grade: '初一', subject: '数学' },
      enrollments: [
        { id: 'enrollment-english', studentId: 'student-english', subjects: ['英语'] },
        { id: 'enrollment-math', studentId: 'student-math', subjects: ['数学'] },
      ],
    },
  }
}

describe('GET /api/teacher/materials/lesson-previews subject roster', () => {
  beforeEach(() => vi.clearAllMocks())

  it('counts only active enrollments for the lesson subject and does not fall back when a current snapshot is missing', async () => {
    const findMany = vi.fn().mockResolvedValue([
      lesson('lesson-with-snapshot', ['student-english', 'student-math']),
      lesson('lesson-without-snapshot', []),
    ])
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '教师甲' },
      prisma: { classLesson: { findMany } },
    })

    const response = await GET()
    const payload = await response.json()
    const rows = payload.days[0].lessons as Array<{ id: string; studentCount: number }>

    expect(response.status).toBe(200)
    expect(rows).toEqual([
      expect.objectContaining({ id: 'lesson-with-snapshot', studentCount: 1 }),
      expect.objectContaining({ id: 'lesson-without-snapshot', studentCount: 0 }),
    ])
    expect(findMany.mock.calls[0][0].select.group.select.enrollments.select).toEqual({
      id: true,
      studentId: true,
      subjects: true,
    })
  })
})
