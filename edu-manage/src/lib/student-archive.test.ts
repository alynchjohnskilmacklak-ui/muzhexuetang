import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  studentFindUnique: vi.fn(),
  studentFindMany: vi.fn(),
  enrollmentFindFirst: vi.fn(),
  enrollmentFindMany: vi.fn(),
  classLessonFindMany: vi.fn(),
  attendanceFindMany: vi.fn(),
  leaveFindMany: vi.fn(),
  makeupFindMany: vi.fn(),
  feedbackFindMany: vi.fn(),
  postFindMany: vi.fn(),
  badgeFindMany: vi.fn(),
  highlightFindMany: vi.fn(),
  getStudentProfile: vi.fn(),
}))

vi.mock('@/lib/student-profile', () => ({ getStudentProfile: mocks.getStudentProfile }))
vi.mock('@/lib/file-asset-variants', () => ({
  resolveFeedbackImageVariants: vi.fn().mockResolvedValue(new Map()),
  variantsForFeedback: vi.fn(() => []),
}))

import { getStudentArchive } from './student-archive'

describe('getStudentArchive linked term records', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.studentFindUnique.mockImplementation((args: { select?: Record<string, boolean> }) => (
      args.select?.identityId
        ? { id: 'student-current', identityId: 'identity-1', division: 'JUNIOR', parentUserId: 'parent-1' }
        : {
            id: 'student-current', name: '学生甲', grade: '初二', school: null, phone: null,
            parentName: null, parentPhone: null, totalHours: 40, remainHours: 20,
            status: 'ACTIVE', mainTeacher: null,
          }
    ))
    mocks.studentFindMany.mockResolvedValue([{ id: 'student-current' }, { id: 'student-old' }])
    mocks.enrollmentFindFirst.mockResolvedValue({ id: 'enrollment-current' })
    mocks.enrollmentFindMany.mockResolvedValue([])
    mocks.classLessonFindMany.mockResolvedValue([])
    mocks.attendanceFindMany.mockResolvedValue([{
      id: 'attendance-old', studentId: 'student-old', status: 'PRESENT', hoursDeducted: 1,
      createdAt: new Date('2026-08-01T10:00:00Z'), lessonId: null, lesson: null,
    }])
    mocks.leaveFindMany.mockResolvedValue([])
    mocks.makeupFindMany.mockResolvedValue([])
    mocks.feedbackFindMany.mockResolvedValue([{
      id: 'feedback-old', classLessonId: 'lesson-old', studentIds: ['student-old'],
      teacher: { id: 'teacher-1', name: '老师甲' }, lessonContent: '分数应用', knowledgePoints: [],
      summary: '能独立完成例题', homework: null, overallComment: null, mood: null, tags: [],
      studentRatings: [{ studentId: 'student-old', rating: 'GOOD' }], imageUrls: [],
      parentReply: null, parentRepliedAt: null, adminReply: null,
      createdAt: new Date('2026-08-01T10:00:00Z'), status: 'PUBLISHED',
    }])
    mocks.postFindMany.mockResolvedValue([])
    mocks.badgeFindMany.mockResolvedValue([])
    mocks.highlightFindMany.mockResolvedValue([])
    mocks.getStudentProfile.mockResolvedValue({ record: { timeline: [] } })
  })

  it('includes authorized historical records in the parent archive', async () => {
    const prisma = {
      student: { findUnique: mocks.studentFindUnique, findMany: mocks.studentFindMany },
      enrollment: { findFirst: mocks.enrollmentFindFirst, findMany: mocks.enrollmentFindMany },
      classLesson: { findMany: mocks.classLessonFindMany },
      attendance: { findMany: mocks.attendanceFindMany },
      leaveRequest: { findMany: mocks.leaveFindMany },
      makeupRequest: { findMany: mocks.makeupFindMany },
      classroomFeedback: { findMany: mocks.feedbackFindMany },
      performancePost: { findMany: mocks.postFindMany },
      achievementBadge: { findMany: mocks.badgeFindMany },
      classHighlight: { findMany: mocks.highlightFindMany },
    } as never

    const archive = await getStudentArchive(prisma, 'student-current', {
      role: 'parent',
      userId: 'parent-1',
      parentStudentIds: ['student-current', 'student-old'],
    })

    expect(archive?.attendance.records.map((record) => record.id)).toContain('attendance-old')
    expect(archive?.feedbacks.map((feedback) => feedback.id)).toContain('feedback-old')
    expect(mocks.studentFindMany).toHaveBeenCalledWith({
      where: {
        identityId: 'identity-1',
        id: { in: ['student-current', 'student-old'] },
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(mocks.getStudentProfile).toHaveBeenCalledWith(
      prisma,
      'student-current',
      expect.objectContaining({ from: expect.any(Date), to: expect.any(Date) }),
      ['student-current', 'student-old'],
    )
    expect(mocks.attendanceFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: { in: ['student-current', 'student-old'] } },
    }))
    expect(mocks.feedbackFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentIds: { hasSome: ['student-current', 'student-old'] } }),
    }))
  })

  it('does not expand teacher archives beyond the requested student', async () => {
    const prisma = {
      student: { findUnique: mocks.studentFindUnique, findMany: mocks.studentFindMany },
      enrollment: { findFirst: mocks.enrollmentFindFirst, findMany: mocks.enrollmentFindMany },
      classLesson: { findMany: mocks.classLessonFindMany },
      attendance: { findMany: mocks.attendanceFindMany },
      leaveRequest: { findMany: mocks.leaveFindMany },
      makeupRequest: { findMany: mocks.makeupFindMany },
      classroomFeedback: { findMany: mocks.feedbackFindMany },
      performancePost: { findMany: mocks.postFindMany },
      achievementBadge: { findMany: mocks.badgeFindMany },
      classHighlight: { findMany: mocks.highlightFindMany },
    } as never

    await getStudentArchive(prisma, 'student-current', {
      role: 'teacher',
      userId: 'teacher-user-1',
      teacherId: 'teacher-1',
    })

    expect(mocks.studentFindMany).not.toHaveBeenCalled()
    expect(mocks.attendanceFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: { in: ['student-current'] } },
    }))
  })
})
