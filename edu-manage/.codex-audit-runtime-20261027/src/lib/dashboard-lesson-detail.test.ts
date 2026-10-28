import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { dashboardClassDetail, findDashboardLessonDetail } from './dashboard-lesson-detail'

describe('real dashboard detail data', () => {
  it('restricts lookup to the authorized division and term, without demo fallback', async () => {
    const findFirst = vi.fn().mockResolvedValue(null)
    const result = await findDashboardLessonDetail({ classLesson: { findFirst } } as unknown as PrismaClient, 'missing', 'SENIOR', 'term1')
    expect(result).toBeNull()
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'missing', division: 'SENIOR', deletedAt: null, group: expect.objectContaining({ termId: 'term1' }) }) }))
  })
  it('uses the actual lesson teacher, subject and each student feedback state', () => {
    const lesson = {
      id: 'real1', status: 'COMPLETED', subject: '数学', startTime: '18:00', endTime: '19:00', lessonDate: new Date('2026-10-12'), attendanceSubmittedAt: new Date(),
      teacher: { name: '实际授课教师', avatar: null, gender: null, subjects: '数学', tierLevel: 'STANDARD' },
      group: { course: { name: '实际课程', grade: '初一', subject: '英语' }, teacher: { name: '班级主教师', avatar: null }, room: null },
      lessonStudents: [{ student: { id: 's1', name: '学员一', membershipLevel: 'NORMAL' } }, { student: { id: 's2', name: '学员二', membershipLevel: 'VIP' } }],
      attendances: [{ studentId: 's1', status: 'PRESENT' }], classroomFeedbacks: [{ studentIds: ['s1'] }],
    } as unknown as NonNullable<Awaited<ReturnType<typeof findDashboardLessonDetail>>>
    const detail = dashboardClassDetail(lesson)
    expect(detail.teacher.name).toBe('实际授课教师')
    expect(detail.subject).toBe('数学')
    expect(detail.students[0]).toMatchObject({ feedbackDone: true, attendanceStatus: '出勤' })
    expect(detail.students[1]).toMatchObject({ feedbackDone: false, attendanceStatus: null })
    expect(detail.feedbackDone).toBe(false)
  })
})
