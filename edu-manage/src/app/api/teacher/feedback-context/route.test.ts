import { describe, expect, it, vi } from 'vitest'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  requireCurrentTeacher: vi.fn(),
  teacherLessonScopeWhere: vi.fn(),
  teacherStudentWhere: vi.fn(),
  getActiveAcademicTerm: vi.fn(),
}))

vi.mock('@/lib/teacher-portal', () => ({
  requireCurrentTeacher: mocks.requireCurrentTeacher,
  teacherLessonScopeWhere: mocks.teacherLessonScopeWhere,
  teacherStudentWhere: mocks.teacherStudentWhere,
}))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: mocks.getActiveAcademicTerm }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/teacher/feedback-context', () => {
  it('returns today and historical completed lessons with subject rosters and leave/absence blocks', async () => {
    const day = todayLocal()
    const lessonDate = getLocalDayRange(day).start
    const mathEnrollments = [
      {
        studentId: 'math-leave',
        subjects: ['数学'],
        remainHours: 5,
        student: { id: 'math-leave', name: '请假学员', grade: '初二', gender: '女', school: null, remainHours: 5 },
      },
      {
        studentId: 'math-absent',
        subjects: ['数学'],
        remainHours: 4,
        student: { id: 'math-absent', name: '缺勤学员', grade: '初二', gender: '男', school: null, remainHours: 4 },
      },
      {
        studentId: 'english-only',
        subjects: ['英语'],
        remainHours: 6,
        student: { id: 'english-only', name: '英语学员', grade: '初二', gender: '女', school: null, remainHours: 6 },
      },
    ]
    const group = {
      id: 'group-1',
      name: '初二综合班',
      intensiveMode: 'NORMAL',
      teachingType: 'GROUP',
      termId: 'term-1',
      term: { id: 'term-1', name: '秋季班' },
      course: { id: 'course-1', name: '综合课程', subject: '数学', grade: '初二', type: 'GROUP' },
      teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学' }],
      enrollments: mathEnrollments,
      classLessons: [],
    }
    const lesson = {
      id: 'lesson-today',
      groupId: group.id,
      lessonDate,
      startTime: '09:00',
      endTime: '10:00',
      subject: '数学',
      status: 'COMPLETED',
      attendanceSubmittedAt: lessonDate,
      attendances: [{ studentId: 'math-leave' }, { studentId: 'math-absent' }],
      lessonStudents: [
        { studentId: 'math-leave' },
        { studentId: 'math-absent' },
        { studentId: 'english-only' },
      ],
      group: {
        ...group,
        course: { name: group.course.name, type: group.course.type, subject: group.course.subject },
        teacherAssignments: [{ subject: '数学' }],
        enrollments: mathEnrollments.map(({ studentId, subjects }) => ({ studentId, subjects })),
      },
    }
    const historicalLessonDate = new Date(lessonDate.getTime() - 24 * 60 * 60 * 1000)
    const historicalLesson = {
      ...lesson,
      id: 'lesson-yesterday',
      lessonDate: historicalLessonDate,
      attendanceSubmittedAt: historicalLessonDate,
      lessonStudents: [{ studentId: 'math-leave' }, { studentId: 'math-absent' }],
    }
    const prisma = {
      classGroup: { findMany: vi.fn().mockResolvedValue([group]) },
      classLesson: { findMany: vi.fn().mockResolvedValue([lesson, historicalLesson]) },
      classroomFeedback: {
        findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValue([]),
      },
      student: { findMany: vi.fn().mockResolvedValue([{ id: 'math-leave' }, { id: 'math-absent' }]) },
      attendance: {
        findMany: vi.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ lessonId: lesson.id, studentId: 'math-absent', status: 'ABSENT' }]),
      },
      leaveRequest: {
        findMany: vi.fn().mockResolvedValue([{
          studentId: 'math-leave',
          lessonId: lesson.id,
          leaveDate: lessonDate,
          status: 'approved',
          deletedAt: null,
        }]),
      },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', division: 'JUNIOR' },
      prisma,
    })
    mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })
    mocks.teacherStudentWhere.mockReturnValue({})
    mocks.getActiveAcademicTerm.mockResolvedValue({ id: 'term-1', name: '秋季班' })

    const response = await GET()
    const payload = await response.json()
    const lessonQuery = prisma.classLesson.findMany.mock.calls[0][0]

    expect(response.status).toBe(200)
    expect(lessonQuery.where.lessonDate).toEqual({ lt: getLocalDayRange(day).end })
    expect(payload.groups[0].students.map((student: { id: string }) => student.id)).toEqual(['math-leave', 'math-absent'])
    expect(payload.lessons).toMatchObject([
      {
        id: lesson.id,
        isToday: true,
        attendanceSubmitted: true,
        studentIds: ['math-leave', 'math-absent'],
        blockedStudentReasons: { 'math-leave': 'LEAVE', 'math-absent': 'ABSENT' },
      },
      {
        id: historicalLesson.id,
        isToday: false,
        attendanceSubmitted: true,
        studentIds: ['math-leave', 'math-absent'],
      },
    ])
  })

  it('includes the class when the teacher is assigned to the lesson but not the group', async () => {
    mocks.requireCurrentTeacher.mockReset()
    mocks.teacherLessonScopeWhere.mockReset()
    mocks.teacherStudentWhere.mockReset()
    mocks.getActiveAcademicTerm.mockReset()

    const lessonDate = getLocalDayRange(todayLocal()).start
    const group = {
      id: 'lesson-only-group',
      name: '初二综合班',
      intensiveMode: 'NORMAL',
      teachingType: 'GROUP',
      termId: 'term-lesson-only',
      term: { id: 'term-lesson-only', name: '当前批次' },
      course: { id: 'course-lesson-only', name: '综合课程', subject: '数学', grade: '初二', type: 'GROUP' },
      teacherAssignments: [],
      enrollments: [
        { studentId: 'math-student', subjects: ['数学'], remainHours: 5, student: { id: 'math-student', name: '数学学员', grade: '初二', gender: null, school: null, remainHours: 5 } },
        { studentId: 'english-student', subjects: ['英语'], remainHours: 5, student: { id: 'english-student', name: '英语学员', grade: '初二', gender: null, school: null, remainHours: 5 } },
      ],
      classLessons: [],
    }
    const lesson = {
      id: 'lesson-assigned-directly',
      groupId: group.id,
      lessonDate,
      startTime: '09:00',
      endTime: '10:00',
      subject: '数学',
      status: 'COMPLETED',
      attendanceSubmittedAt: lessonDate,
      attendances: [{ studentId: 'math-student' }],
      lessonStudents: [{ studentId: 'math-student' }, { studentId: 'english-student' }],
      group: {
        ...group,
        course: { name: group.course.name, type: group.course.type, subject: group.course.subject },
        enrollments: group.enrollments.map(({ studentId, subjects }) => ({ studentId, subjects })),
      },
    }
    const prisma = {
      classGroup: { findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([group]) },
      classLesson: { findMany: vi.fn().mockResolvedValue([lesson]) },
      classroomFeedback: { findMany: vi.fn().mockResolvedValue([]) },
      student: { findMany: vi.fn().mockResolvedValue([]) },
      attendance: { findMany: vi.fn().mockResolvedValue([]) },
      leaveRequest: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({ teacher: { id: 'teacher-1', division: 'JUNIOR' }, prisma })
    mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })
    mocks.teacherStudentWhere.mockReturnValue({})
    mocks.getActiveAcademicTerm.mockResolvedValue({ id: group.termId, name: '当前批次' })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.classGroup.findMany).toHaveBeenCalledTimes(2)
    expect(prisma.classGroup.findMany.mock.calls[1][0].where.id).toEqual({ in: [group.id] })
    expect(payload.groups).toMatchObject([{ groupId: group.id, subject: '数学', studentCount: 1 }])
    expect(payload.groups[0].students.map((student: { id: string }) => student.id)).toEqual(['math-student'])
    expect(payload.lessons).toMatchObject([{ id: lesson.id, studentIds: ['math-student'] }])
  })
})
