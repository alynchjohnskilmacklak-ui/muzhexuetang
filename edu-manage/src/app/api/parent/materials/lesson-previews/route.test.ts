import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))

import { GET } from './route'

describe('GET /api/parent/materials/lesson-previews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent-1', role: 'parent' } })
  })

  it('only lists linked children who belong to the lesson subject and excludes deleted materials', async () => {
    const lessonDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const lesson = {
      id: 'math-lesson',
      teacherId: 'teacher-1',
      lessonDate,
      startTime: '09:00',
      endTime: '10:00',
      subject: '数学',
      lessonStudents: [{ studentId: 'math-student' }, { studentId: 'english-student' }],
      group: {
        name: '周末班',
        teacherId: 'teacher-1',
        teacherAssignments: [],
        course: { subject: '数学' },
        enrollments: [
          { studentId: 'math-student', subjects: ['数学'], student: { name: '数学学员' } },
          { studentId: 'english-student', subjects: ['英语'], student: { name: '英语学员' } },
        ],
      },
    }
    const db = {
      classLesson: { findMany: vi.fn().mockResolvedValue([lesson]) },
      studyMaterial: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'preview-1',
          title: '数学预习',
          fileName: 'math.pdf',
          fileType: 'PDF',
          subject: '数学',
          description: null,
          createdAt: new Date(),
          classLessonId: 'math-lesson',
          teacherId: 'teacher-1',
          teacher: { name: '胡老师' },
          classLesson: { lessonDate },
        }]),
      },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(db.studyMaterial.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deletedAt: null, classLessonId: { in: ['math-lesson'] } }),
    }))
    expect(payload.materials).toHaveLength(1)
    expect(payload.materials[0].studentNames).toEqual(['数学学员'])
  })
})
