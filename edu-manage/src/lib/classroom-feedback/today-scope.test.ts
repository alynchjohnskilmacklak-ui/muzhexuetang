import { describe, expect, it } from 'vitest'
import { buildTodayFeedbackScopeSet, feedbackTodayScopeKey } from './today-scope'

describe('today feedback scopes', () => {
  it('does not mark another course group for the same student', () => {
    const scopes = buildTodayFeedbackScopeSet([
      { feedbackGroupId: 'small-class', classLesson: { subject: '数学' }, studentIds: ['student-a'] },
    ])

    expect(scopes.has(feedbackTodayScopeKey('small-class', '数学', 'student-a'))).toBe(true)
    expect(scopes.has(feedbackTodayScopeKey('small-class', '英语', 'student-a'))).toBe(false)
    expect(scopes.has(feedbackTodayScopeKey('one-on-one', '数学', 'student-a'))).toBe(false)
  })

  it('uses the linked lesson group when the feedback group is absent', () => {
    const scopes = buildTodayFeedbackScopeSet([
      { classLesson: { groupId: 'lesson-group', subject: '物理' }, studentIds: ['student-a', 'student-b'] },
    ])

    expect(scopes.has(feedbackTodayScopeKey('lesson-group', '物理', 'student-b'))).toBe(true)
  })

  it('falls back to the course subject for legacy lessons without a lesson subject', () => {
    const scopes = buildTodayFeedbackScopeSet([
      { classLesson: { groupId: 'lesson-group', group: { course: { subject: '化学' } } }, studentIds: ['student-a'] },
    ])

    expect(scopes.has(feedbackTodayScopeKey('lesson-group', '化学', 'student-a'))).toBe(true)
  })

  it('does not spread an unscoped legacy feedback across every group', () => {
    const scopes = buildTodayFeedbackScopeSet([{ studentIds: ['student-a'] }])
    expect(scopes.size).toBe(0)
  })
})
