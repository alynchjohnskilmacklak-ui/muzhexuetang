import { describe, expect, it } from 'vitest'
import { chinaClock, isEditableSubjectRosterLesson } from './enrollment-subject-change'

const now = new Date('2026-10-02T05:30:00.000Z') // 北京时间 13:30
const lesson = (day: string, startTime: string, hasAttendance = false, hasFeedback = false) => ({
  lessonDate: new Date(`${day}T00:00:00.000Z`), startTime, hasAttendance, hasFeedback,
})

describe('增减学科的课次边界', () => {
  it('按北京时间判断教学日与开课时间', () => {
    expect(chinaClock(now)).toEqual({ day: '2026-10-02', time: '13:30' })
    expect(isEditableSubjectRosterLesson(lesson('2026-10-02', '14:00'), now)).toBe(true)
    expect(isEditableSubjectRosterLesson(lesson('2026-10-02', '13:00'), now)).toBe(true)
    expect(isEditableSubjectRosterLesson(lesson('2026-10-01', '18:00'), now)).toBe(false)
    expect(isEditableSubjectRosterLesson(lesson('2026-10-03', '08:00'), now)).toBe(true)
  })

  it('保留已有考勤或反馈的名单', () => {
    expect(isEditableSubjectRosterLesson(lesson('2026-10-03', '08:00', true), now)).toBe(false)
    expect(isEditableSubjectRosterLesson(lesson('2026-10-03', '08:00', false, true), now)).toBe(false)
  })
})
