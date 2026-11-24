import { describe, expect, it } from 'vitest'
import { chinaClock, isEditableSubjectRosterLesson, resolveLessonSubjectForEnrollment } from './enrollment-subject-change'

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

  it('课次学科为空时按课次教师分配恢复学科，避免新报名学员漏进未来课次', () => {
    const group = {
      teacherId: 'teacher-math',
      courseSubject: '综合课程',
      teacherAssignments: [
        { teacherId: 'teacher-math', subject: '数学' },
        { teacherId: 'teacher-english', subject: '英语' },
      ],
    }

    expect(resolveLessonSubjectForEnrollment({ subject: null, teacherId: 'teacher-english' }, group)).toBe('英语')
    expect(resolveLessonSubjectForEnrollment({ subject: null, teacherId: null }, group)).toBe('数学')
    expect(resolveLessonSubjectForEnrollment({ subject: '物理', teacherId: 'teacher-math' }, group)).toBe('物理')
  })
})
