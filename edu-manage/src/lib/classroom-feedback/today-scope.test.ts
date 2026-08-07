import { describe, expect, it } from 'vitest'
import { buildTodayFeedbackScopeSet, feedbackTodayScopeKey } from './today-scope'

describe('today feedback scopes', () => {
  it('does not mark another course group for the same student', () => {
    const scopes = buildTodayFeedbackScopeSet([
      { feedbackGroupId: 'small-class', studentIds: ['student-a'] },
    ])

    expect(scopes.has(feedbackTodayScopeKey('small-class', 'student-a'))).toBe(true)
    expect(scopes.has(feedbackTodayScopeKey('one-on-one', 'student-a'))).toBe(false)
  })

  it('uses the linked lesson group when the feedback group is absent', () => {
    const scopes = buildTodayFeedbackScopeSet([
      { classLesson: { groupId: 'lesson-group' }, studentIds: ['student-a', 'student-b'] },
    ])

    expect(scopes.has(feedbackTodayScopeKey('lesson-group', 'student-b'))).toBe(true)
  })

  it('does not spread an unscoped legacy feedback across every group', () => {
    const scopes = buildTodayFeedbackScopeSet([{ studentIds: ['student-a'] }])
    expect(scopes.size).toBe(0)
  })
})
