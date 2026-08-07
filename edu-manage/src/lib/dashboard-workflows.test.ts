import { describe, expect, it } from 'vitest'
import {
  buildAdminExceptions,
  buildParentTodayTimeline,
  deriveTeacherLessonWorkflow,
} from './dashboard-workflows'

describe('dashboard workflows', () => {
  it('guides an ended lesson from attendance to feedback', () => {
    const lesson = {
      id: 'lesson-1',
      lessonId: 'lesson-1',
      startTime: '08:00',
      endTime: '09:00',
      hasFeedback: false,
    }
    const now = new Date(2026, 6, 23, 10, 0)

    const attendanceStep = deriveTeacherLessonWorkflow(lesson, now)
    expect(attendanceStep.steps.map((step) => step.state)).toEqual(['done', 'active', 'pending'])
    expect(attendanceStep.action.href).toBe('/teacher/attendance')

    const feedbackStep = deriveTeacherLessonWorkflow({
      ...lesson,
      attendanceSubmittedAt: new Date(2026, 6, 23, 9, 5),
    }, now)
    expect(feedbackStep.steps.map((step) => step.state)).toEqual(['done', 'done', 'active'])
    expect(feedbackStep.action.href).toContain('lessonId=lesson-1')
  })

  it('marks a lesson workflow complete without changing business data', () => {
    const workflow = deriveTeacherLessonWorkflow({
      id: 'lesson-1',
      hasFeedback: true,
      feedbackId: 'feedback-1',
      attendanceSubmittedAt: new Date(),
    })

    expect(workflow.completed).toBe(true)
    expect(workflow.action.href).toContain('viewId=feedback-1')
  })

  it('builds a chronological parent timeline with only today message events', () => {
    const now = new Date(2026, 6, 23, 12, 0)
    const events = buildParentTodayTimeline({
      now,
      lessons: [{
        id: 'lesson-1',
        title: '数学',
        startTime: '09:00',
        startTimeRaw: '2026-07-23T09:00:00+08:00',
        teacherName: '王老师',
      }],
      feedbacks: [{
        id: 'feedback-1',
        createdAt: '2026-07-23T10:00:00+08:00',
        subject: '数学',
        summary: '今天完成得很好',
      }],
      notifications: [
        {
          id: 'notification-1',
          createdAt: '2026-07-23T11:00:00+08:00',
          relatedType: 'PARENT_MESSAGE_REPLY',
          title: '老师回复了留言',
        },
        {
          id: 'notification-old',
          createdAt: '2026-07-22T11:00:00+08:00',
          relatedType: 'PARENT_MESSAGE_REPLY',
        },
      ],
    })

    expect(events.map((event) => event.type)).toEqual(['lesson', 'feedback', 'message'])
    expect(events.some((event) => event.id.includes('notification-old'))).toBe(false)
  })

  it('orders actionable admin exceptions and omits zero-count noise', () => {
    const items = buildAdminExceptions({
      pendingTeacherReplies: 3,
      pendingParentReads: 2,
      todayLessonsPendingAttendance: 1,
      renewalWarnings: 0,
      pendingMakeups: 0,
      pendingIntensiveAppointments: 3,
      pendingIntensiveReviews: 2,
      unpublishedPapers: 4,
    })

    expect(items.map((item) => item.key)).toEqual([
      'teacher-replies',
      'intensive-appointments',
      'intensive-reviews',
      'attendance',
      'papers',
      'parent-reads',
    ])
    expect(items[0].priority).toBe('urgent')
  })
})
