import { describe, expect, it } from 'vitest'
import {
  calculatePlannedMinutes,
  canSubmitIntensiveAttendance,
  canSubmitTeacherAttendance,
  canTeacherEditIntensiveLesson,
  canAppendTeacherMealAttendance,
  getTeacherAttendanceSubmissionState,
  getTeacherIntensiveStudentCount,
  lessonStartAt,
  teacherAttendanceOpenAt,
  resolveTeacherIntensiveSubjects,
  validateTeacherIntensiveSchedule,
} from '@/lib/teacher-intensive-scheduling'

const now = new Date('2026-07-26T01:00:00.000Z')

describe('teacher intensive scheduling', () => {
  it('builds lesson start timestamps in China time for date-only database values', () => {
    const lessonDate = new Date('2026-10-31T00:00:00.000Z')

    expect(lessonStartAt(lessonDate, '08:30').toISOString()).toBe('2026-10-31T00:30:00.000Z')
    expect(lessonStartAt('2026-10-31', '08:30').toISOString()).toBe('2026-10-31T00:30:00.000Z')
    expect(new Date(lessonStartAt(lessonDate, '08:30').getTime() - 30 * 60 * 1000).toISOString())
      .toBe('2026-10-31T00:00:00.000Z')
  })

  it('only allows attendance from its opening time until the scheduled lesson ends', () => {
    const lesson = {
      lessonDate: '2026-07-26',
      startTime: '10:00',
      endTime: '10:40',
      intensiveMode: 'GROUP',
    }

    expect(getTeacherAttendanceSubmissionState({ ...lesson, now: new Date('2026-07-26T01:29:59.999Z') }))
      .toBe('UPCOMING')
    expect(getTeacherAttendanceSubmissionState({ ...lesson, now: new Date('2026-07-26T01:30:00.000Z') }))
      .toBe('OPEN')
    expect(getTeacherAttendanceSubmissionState({ ...lesson, now: new Date('2026-07-26T02:40:00.000Z') }))
      .toBe('CLOSED')
  })

  it('keeps the rejected intensive review resubmission inside its existing review workflow', () => {
    expect(getTeacherAttendanceSubmissionState({
      lessonDate: '2026-07-25',
      startTime: '10:00',
      endTime: '10:40',
      intensiveMode: 'INTENSIVE',
      allowRejectedIntensiveResubmission: true,
      now: new Date('2026-07-26T01:00:00.000Z'),
    })).toBe('OPEN')
  })

  it('allows meal additions only during a same-day active lesson', () => {
    const lesson = { lessonDate: '2026-07-26', startTime: '10:00', endTime: '10:40' }

    expect(canAppendTeacherMealAttendance({ ...lesson, now: new Date('2026-07-26T01:59:59.999Z') })).toBe(false)
    expect(canAppendTeacherMealAttendance({ ...lesson, now: new Date('2026-07-26T02:00:00.000Z') })).toBe(true)
    expect(canAppendTeacherMealAttendance({ ...lesson, now: new Date('2026-07-26T02:40:00.000Z') })).toBe(false)
    expect(canAppendTeacherMealAttendance({ ...lesson, now: new Date('2026-07-27T02:15:00.000Z') })).toBe(false)
  })

  it('requires the exact roster size for each teaching type', () => {
    expect(getTeacherIntensiveStudentCount('ONE_ON_ONE')).toBe(1)
    expect(getTeacherIntensiveStudentCount('ONE_ON_TWO')).toBe(2)
    expect(getTeacherIntensiveStudentCount('ONE_ON_THREE')).toBe(3)

    expect(validateTeacherIntensiveSchedule({
      lessonDate: '2026-07-27',
      startTime: '17:30',
      endTime: '19:00',
      teachingType: 'ONE_ON_TWO',
      studentIds: ['student-a', 'student-b'],
      now,
    })).toBeNull()

    expect(validateTeacherIntensiveSchedule({
      lessonDate: '2026-07-27',
      startTime: '17:30',
      endTime: '19:00',
      teachingType: 'ONE_ON_TWO',
      studentIds: ['student-a'],
      now,
    })).toContain('2名学生')
  })

  it('rejects duplicate students and dates outside the teacher scheduling window', () => {
    expect(validateTeacherIntensiveSchedule({
      lessonDate: '2026-07-27',
      startTime: '17:30',
      endTime: '19:00',
      teachingType: 'ONE_ON_TWO',
      studentIds: ['student-a', 'student-a'],
      now,
    })).toContain('2名学生')

    expect(validateTeacherIntensiveSchedule({
      lessonDate: '2026-07-25',
      startTime: '17:30',
      endTime: '19:00',
      teachingType: 'ONE_ON_ONE',
      studentIds: ['student-a'],
      now,
    })).toBeNull()

    expect(validateTeacherIntensiveSchedule({
      lessonDate: '2025-07-25',
      startTime: '17:30',
      endTime: '19:00',
      teachingType: 'ONE_ON_ONE',
      studentIds: ['student-a'],
      now,
    })).toContain('365天')

    expect(validateTeacherIntensiveSchedule({
      lessonDate: '2026-10-01',
      startTime: '17:30',
      endTime: '19:00',
      teachingType: 'ONE_ON_ONE',
      studentIds: ['student-a'],
      now,
    })).toContain('60天')
  })

  it('uses the actual start and end time to calculate planned minutes', () => {
    expect(calculatePlannedMinutes('17:30', '19:00')).toBe(90)
    expect(calculatePlannedMinutes('19:00', '17:30')).toBeNull()
  })

  it('locks settled lessons and lessons within 30 minutes of starting', () => {
    const lesson = {
      lessonDate: '2026-07-26',
      startTime: '18:00',
      status: 'SCHEDULED',
      settlementStatus: 'UNSETTLED',
      intensiveReviewStatus: 'DRAFT',
      attendanceSubmittedAt: null,
    }

    expect(canTeacherEditIntensiveLesson({
      ...lesson,
      now: new Date('2026-07-26T09:29:59.000Z'),
    })).toBe(true)
    expect(canTeacherEditIntensiveLesson({
      ...lesson,
      now: new Date('2026-07-26T09:30:00.000Z'),
    })).toBe(false)
    expect(canTeacherEditIntensiveLesson({
      ...lesson,
      settlementStatus: 'SETTLED',
      now: new Date('2026-07-26T08:00:00.000Z'),
    })).toBe(false)

    expect(canTeacherEditIntensiveLesson({
      ...lesson,
      lessonDate: '2026-07-25',
      now,
    })).toBe(true)
  })

  it('allows intensive attendance only after the lesson starts', () => {
    expect(canSubmitIntensiveAttendance({
      lessonDate: '2026-07-26',
      startTime: '18:00',
      now: new Date('2026-07-26T09:59:59.000Z'),
    })).toBe(false)
    expect(canSubmitIntensiveAttendance({
      lessonDate: '2026-07-26',
      startTime: '18:00',
      now: new Date('2026-07-26T10:00:00.000Z'),
    })).toBe(true)
  })

  it('opens regular attendance 30 minutes before class and intensive attendance at start', () => {
    const regular = { lessonDate: '2026-07-26', startTime: '18:00', intensiveMode: 'NORMAL' }
    const intensive = { ...regular, intensiveMode: 'INTENSIVE' }

    expect(teacherAttendanceOpenAt(regular).toISOString()).toBe('2026-07-26T09:30:00.000Z')
    expect(canSubmitTeacherAttendance({ ...regular, now: new Date('2026-07-26T09:29:59.999Z') })).toBe(false)
    expect(canSubmitTeacherAttendance({ ...regular, now: new Date('2026-07-26T09:30:00.000Z') })).toBe(true)
    expect(teacherAttendanceOpenAt(intensive).toISOString()).toBe('2026-07-26T10:00:00.000Z')
    expect(canSubmitTeacherAttendance({ ...intensive, now: new Date('2026-07-26T09:59:59.999Z') })).toBe(false)
    expect(canSubmitTeacherAttendance({ ...intensive, now: new Date('2026-07-26T10:00:00.000Z') })).toBe(true)
  })

  it('separates every subject assigned to the current teacher', () => {
    expect(resolveTeacherIntensiveSubjects({
      teacherId: 'teacher-a',
      groupTeacherId: 'teacher-a',
      assignmentSubjects: ['数学', '物理'],
      courseSubject: '数学、英语、物理',
    })).toEqual(['数学', '物理'])

    expect(resolveTeacherIntensiveSubjects({
      teacherId: 'teacher-a',
      groupTeacherId: 'teacher-a',
      assignmentSubjects: [],
      hasAnyAssignments: false,
      courseSubject: '数学、英语',
    })).toEqual(['数学', '英语'])

    expect(resolveTeacherIntensiveSubjects({
      teacherId: 'teacher-b',
      groupTeacherId: 'teacher-a',
      assignmentSubjects: [],
      hasAnyAssignments: true,
      courseSubject: '数学、英语',
    })).toEqual([])

    expect(resolveTeacherIntensiveSubjects({
      teacherId: 'teacher-b',
      groupTeacherId: 'teacher-a',
      assignmentSubjects: [],
      hasAnyAssignments: false,
      courseSubject: '数学、英语',
    })).toEqual([])
  })
})
