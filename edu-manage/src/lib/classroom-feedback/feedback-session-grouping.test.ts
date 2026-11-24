import { describe, expect, it } from 'vitest'
import {
  annotateConsecutiveLessons,
  formatSessionDateLabel,
  formatSessionOptionLabel,
  groupFeedbackLessonsIntoSessions,
  type RawFeedbackLesson,
} from './feedback-session-grouping'

describe('feedback-session-grouping', () => {
  const referenceDateKey = '2026-11-19' // Thursday

  it('formats date label for today and yesterday', () => {
    expect(formatSessionDateLabel('2026-11-19', true, false)).toBe('今天 (11/19 周四)')
    expect(formatSessionDateLabel('2026-11-18', false, true)).toBe('昨天 (11/18 周三)')
    expect(formatSessionDateLabel('2026-11-15', false, false)).toBe('11/15 周日')
  })

  it('filters out lessons older than yesterday unless explicitly requested', () => {
    const lessons: RawFeedbackLesson[] = [
      // Today: 2026-11-19
      {
        id: 'l-today-1',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-11-19T00:00:00.000Z',
        startTime: '10:10',
        endTime: '10:50',
        attendanceSubmitted: true,
      },
      // Yesterday: 2026-11-18
      {
        id: 'l-yest-1',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-11-18T00:00:00.000Z',
        startTime: '10:10',
        endTime: '10:50',
        attendanceSubmitted: true,
      },
      // Older: 2026-11-01
      {
        id: 'l-old-1',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-11-01T00:00:00.000Z',
        startTime: '10:10',
        endTime: '10:50',
        attendanceSubmitted: true,
      },
      // Even older: 2026-10-04
      {
        id: 'l-old-2',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-10-04T00:00:00.000Z',
        startTime: '11:00',
        endTime: '11:40',
        attendanceSubmitted: true,
      },
    ]

    const result = groupFeedbackLessonsIntoSessions(lessons, 'g1', null, referenceDateKey)
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id)).toEqual(['l-today-1', 'l-yest-1'])
  })

  it('preserves an older lesson if it matches requestedLessonId', () => {
    const lessons: RawFeedbackLesson[] = [
      {
        id: 'l-old-requested',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-10-04T00:00:00.000Z',
        startTime: '10:10',
        endTime: '10:50',
        attendanceSubmitted: true,
      },
      {
        id: 'l-old-unrequested',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-10-02T00:00:00.000Z',
        startTime: '10:10',
        endTime: '10:50',
        attendanceSubmitted: true,
      },
    ]

    const result = groupFeedbackLessonsIntoSessions(lessons, 'g1', 'l-old-requested', referenceDateKey)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('l-old-requested')
  })

  it('merges 2 consecutive small lessons into a unified session', () => {
    const lessons: RawFeedbackLesson[] = [
      {
        id: 'l1',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-11-19T00:00:00.000Z',
        startTime: '10:10',
        endTime: '10:50',
        studentIds: ['s1', 's2'],
        attendanceSubmitted: true,
      },
      {
        id: 'l2',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-11-19T00:00:00.000Z',
        startTime: '11:00',
        endTime: '11:40',
        studentIds: ['s2', 's3'],
        attendanceSubmitted: true,
      },
    ]

    const result = groupFeedbackLessonsIntoSessions(lessons, 'g1', null, referenceDateKey)
    expect(result).toHaveLength(1)
    const session = result[0]
    expect(session.id).toBe('l1')
    expect(session.allLessonIds).toEqual(['l1', 'l2'])
    expect(session.smallLessonCount).toBe(2)
    expect(session.startTime).toBe('10:10')
    expect(session.endTime).toBe('11:40')
    expect(session.studentIds).toEqual(['s1', 's2', 's3'])
    expect(session.attendanceSubmitted).toBe(true)

    const label = formatSessionOptionLabel(session)
    expect(label).toBe('今天 (11/19 周四) · 10:10-11:40 (2节连堂) · 已完成考勤')
  })

  it('correctly marks attendance status if one small lesson is pending attendance', () => {
    const lessons: RawFeedbackLesson[] = [
      {
        id: 'l1',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-11-19T00:00:00.000Z',
        startTime: '10:10',
        endTime: '10:50',
        attendanceSubmitted: true,
      },
      {
        id: 'l2',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-11-19T00:00:00.000Z',
        startTime: '11:00',
        endTime: '11:40',
        attendanceSubmitted: false, // not submitted yet
      },
    ]

    const result = groupFeedbackLessonsIntoSessions(lessons, 'g1', null, referenceDateKey)
    expect(result).toHaveLength(1)
    const session = result[0]
    expect(session.attendanceSubmitted).toBe(false)
    expect(session.hasAnyAttendanceSubmitted).toBe(true)

    const label = formatSessionOptionLabel(session)
    expect(label).toBe('今天 (11/19 周四) · 10:10-11:40 (2节连堂) · 部分待考勤')
  })

  it('formats single period lesson as (1课时)', () => {
    const lessons: RawFeedbackLesson[] = [
      {
        id: 'l1',
        groupId: 'g1',
        scopeId: 'g1',
        lessonDate: '2026-11-18T00:00:00.000Z',
        startTime: '14:00',
        endTime: '14:45',
        attendanceSubmitted: true,
      },
    ]

    const result = groupFeedbackLessonsIntoSessions(lessons, 'g1', null, referenceDateKey)
    expect(result).toHaveLength(1)
    const session = result[0]
    expect(session.smallLessonCount).toBe(1)
    const label = formatSessionOptionLabel(session)
    expect(label).toBe('昨天 (11/18 周三) · 14:00-14:45 (1课时) · 已完成考勤')
  })

  it('correctly annotates consecutive small lessons with annotateConsecutiveLessons', () => {
    const lessons = [
      { id: 'l1', groupId: 'g1', lessonDate: '2026-11-19T00:00:00.000Z', startTime: '10:10', endTime: '10:50', teacherId: 't1', subject: '数学' },
      { id: 'l2', groupId: 'g1', lessonDate: '2026-11-19T00:00:00.000Z', startTime: '11:00', endTime: '11:40', teacherId: 't1', subject: '数学' },
      { id: 'l3', groupId: 'g1', lessonDate: '2026-11-19T00:00:00.000Z', startTime: '15:00', endTime: '15:40', teacherId: 't1', subject: '数学' },
      { id: 'l4', groupId: 'g2', lessonDate: '2026-11-19T00:00:00.000Z', startTime: '10:10', endTime: '10:50', teacherId: 't1', subject: '数学' },
    ]

    const annotated = annotateConsecutiveLessons(lessons)
    expect(annotated.has('l1')).toBe(true)
    expect(annotated.has('l2')).toBe(true)
    expect(annotated.has('l3')).toBe(false) // standalone
    expect(annotated.has('l4')).toBe(false) // different group

    const meta1 = annotated.get('l1')!
    expect(meta1.isConsecutive).toBe(true)
    expect(meta1.consecutiveIndex).toBe(1)
    expect(meta1.totalInSession).toBe(2)
    expect(meta1.sessionSpan).toBe('10:10-11:40')
    expect(meta1.partnerLessonIds).toEqual(['l2'])

    const meta2 = annotated.get('l2')!
    expect(meta2.consecutiveIndex).toBe(2)
    expect(meta2.partnerLessonIds).toEqual(['l1'])
  })

  it('does not merge lessons of different subjects into consecutive sessions', () => {
    // 同一个班级、同一个老师，但前两节是生物，后两节是地理
    const lessons = [
      { id: 'bio-1', groupId: 'g1', lessonDate: '2026-10-02', startTime: '14:00', endTime: '14:40', teacherId: 'zm', subject: '生物' },
      { id: 'bio-2', groupId: 'g1', lessonDate: '2026-10-02', startTime: '14:50', endTime: '15:30', teacherId: 'zm', subject: '生物' },
      { id: 'geo-1', groupId: 'g1', lessonDate: '2026-10-02', startTime: '15:40', endTime: '16:20', teacherId: 'zm', subject: '地理' },
      { id: 'geo-2', groupId: 'g1', lessonDate: '2026-10-02', startTime: '16:30', endTime: '17:10', teacherId: 'zm', subject: '地理' },
    ]

    const annotated = annotateConsecutiveLessons(lessons)
    // 生物自成一组2节连堂
    expect(annotated.get('bio-1')?.sessionSpan).toBe('14:00-15:30')
    expect(annotated.get('bio-1')?.totalInSession).toBe(2)
    expect(annotated.get('bio-1')?.partnerLessonIds).toEqual(['bio-2'])

    // 地理自成一组2节连堂，绝对不与生物合并成4节大课
    expect(annotated.get('geo-1')?.sessionSpan).toBe('15:40-17:10')
    expect(annotated.get('geo-1')?.totalInSession).toBe(2)
    expect(annotated.get('geo-1')?.partnerLessonIds).toEqual(['geo-2'])
  })

  it('strictly caps consecutive lessons to at most 2 small lessons (双课连堂)', () => {
    // 即使同一学科同一老师排了4节，也切分成两个各自独立的2节连堂
    const lessons = [
      { id: 'l1', groupId: 'g1', lessonDate: '2026-10-02', startTime: '14:00', endTime: '14:40', teacherId: 'zm', subject: '生物' },
      { id: 'l2', groupId: 'g1', lessonDate: '2026-10-02', startTime: '14:50', endTime: '15:30', teacherId: 'zm', subject: '生物' },
      { id: 'l3', groupId: 'g1', lessonDate: '2026-10-02', startTime: '15:40', endTime: '16:20', teacherId: 'zm', subject: '生物' },
      { id: 'l4', groupId: 'g1', lessonDate: '2026-10-02', startTime: '16:30', endTime: '17:10', teacherId: 'zm', subject: '生物' },
    ]

    const annotated = annotateConsecutiveLessons(lessons)
    expect(annotated.get('l1')?.sessionSpan).toBe('14:00-15:30')
    expect(annotated.get('l1')?.totalInSession).toBe(2)
    expect(annotated.get('l2')?.sessionSpan).toBe('14:00-15:30')

    expect(annotated.get('l3')?.sessionSpan).toBe('15:40-17:10')
    expect(annotated.get('l3')?.totalInSession).toBe(2)
    expect(annotated.get('l4')?.sessionSpan).toBe('15:40-17:10')
  })
})
