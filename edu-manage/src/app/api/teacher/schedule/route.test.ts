import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  requireCurrentTeacher: vi.fn(),
  teacherLessonScopeWhere: vi.fn(),
}))

vi.mock('@/lib/teacher-portal', () => ({
  requireCurrentTeacher: mocks.requireCurrentTeacher,
  teacherLessonScopeWhere: mocks.teacherLessonScopeWhere,
}))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

function createLesson(overrides: Record<string, unknown> = {}) {
  const mathStudent = { id: 'math-student', name: '数学学员' }
  const englishStudent = { id: 'english-student', name: '英语学员' }
  const mathNotInSnapshot = { id: 'math-not-in-snapshot', name: '未排入本课学员' }
  return {
    id: 'lesson-math',
    lessonDate: getLocalDayRange(todayLocal()).start,
    startTime: '09:00',
    endTime: '10:00',
    subject: '数学',
    group: {
      id: 'group-1',
      course: { subject: '数学' },
      teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学' }],
      enrollments: [
        { id: 'enrollment-math', subjects: ['数学'], student: mathStudent },
        { id: 'enrollment-english', subjects: ['英语'], student: englishStudent },
        { id: 'enrollment-math-other', subjects: ['数学'], student: mathNotInSnapshot },
      ],
    },
    lessonStudents: [mathStudent, englishStudent].map((student) => ({ student })),
    attendances: [
      { id: 'attendance-math', studentId: mathStudent.id, status: 'PRESENT' },
      { id: 'attendance-english', studentId: englishStudent.id, status: 'PRESENT' },
    ],
    classroomFeedbacks: [{ studentIds: [mathStudent.id, englishStudent.id] }],
    ...overrides,
  }
}

async function loadSchedule(lesson: ReturnType<typeof createLesson>) {
  const prisma = { classLesson: { findMany: vi.fn().mockResolvedValue([lesson]) } }
  mocks.requireCurrentTeacher.mockResolvedValue({
    user: { id: 'user-1' },
    teacher: { id: 'teacher-1', division: 'JUNIOR' },
    prisma,
  })
  const response = await GET(new NextRequest(
    `http://localhost/api/teacher/schedule?startDate=${todayLocal()}&endDate=${todayLocal()}&type=GROUP`,
  ))
  return response.json()
}

describe('GET /api/teacher/schedule subject roster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.teacherLessonScopeWhere.mockResolvedValue({})
  })

  it('returns only students in this lesson snapshot who are actively enrolled in its subject', async () => {
    const data = await loadSchedule(createLesson())
    const lesson = data.lessons[0]

    expect(lesson.group.enrollments.map((item: { student: { id: string } }) => item.student.id)).toEqual(['math-student'])
    expect(lesson.lessonStudents.map((item: { student: { id: string } }) => item.student.id)).toEqual(['math-student'])
    expect(lesson.attendances.map((item: { studentId: string }) => item.studentId)).toEqual(['math-student'])
    expect(lesson.classroomFeedbacks[0].studentIds).toEqual(['math-student'])
  })

  it('does not fall back to all active subject enrollments when a current lesson has no roster snapshot', async () => {
    const tomorrow = new Date(getLocalDayRange(todayLocal()).start.getTime() + 86400000)
    const data = await loadSchedule(createLesson({ lessonDate: tomorrow, lessonStudents: [] }))

    expect(data.lessons[0].group.enrollments).toEqual([])
    expect(data.lessons[0].lessonStudents).toEqual([])
  })
})
