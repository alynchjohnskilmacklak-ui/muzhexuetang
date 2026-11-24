import { describe, expect, it } from 'vitest'
import {
  canWriteTeacherInteraction,
  getTeacherAttendanceDisplayLessons,
  getDefaultTeacherInteractionLesson,
  getNextTeacherLessons,
  getNextTeacherLesson,
  getTeacherAttendanceHref,
  getTeacherInteractionHref,
  getTeacherLessonDetailHref,
  getTeacherLessonAttendanceState,
  groupTeacherLessonsByMonthAndDate,
  type TeacherLessonNavigationItem,
} from './teacher-lesson-navigation'

const regularLesson: TeacherLessonNavigationItem = {
  id: 'regular',
  lessonDate: '2026-11-09T00:00:00.000Z',
  startTime: '10:00',
  endTime: '10:40',
  intensiveMode: 'GROUP',
  status: 'SCHEDULED',
}

describe('教师课次时间导航', () => {
  it('考勤页优先显示当天有效课次并按时间排序', () => {
    const now = new Date('2026-11-09T01:00:00.000Z')
    const todayEarly = { ...regularLesson, id: 'today-early', startTime: '09:00', endTime: '09:40' }
    const todayLate = { ...regularLesson, id: 'today-late', startTime: '10:00', endTime: '10:40' }
    const yesterday = { ...regularLesson, id: 'yesterday', lessonDate: '2026-11-08T00:00:00.000Z' }
    const tomorrow = { ...regularLesson, id: 'tomorrow', lessonDate: '2026-11-10T00:00:00.000Z' }

    expect(getTeacherAttendanceDisplayLessons([tomorrow, todayLate, yesterday, todayEarly], now)
      .map((lesson) => lesson.id)).toEqual(['today-early', 'today-late'])
  })

  it('当天没有课时只展示最近的下一节课，不暴露历史课次', () => {
    const now = new Date('2026-11-09T01:00:00.000Z')
    const next = { ...regularLesson, id: 'next', lessonDate: '2026-11-10T00:00:00.000Z', startTime: '09:00' }
    const later = { ...regularLesson, id: 'later', lessonDate: '2026-11-11T00:00:00.000Z' }
    const past = { ...regularLesson, id: 'past', lessonDate: '2026-11-08T00:00:00.000Z' }

    expect(getTeacherAttendanceDisplayLessons([later, past, next], now).map((lesson) => lesson.id))
      .toEqual(['next'])
    expect(getTeacherAttendanceDisplayLessons([past], now)).toEqual([])
  })

  it('普通课在开课前30分钟的边界开放考勤，并在课后归入待补录', () => {
    expect(getTeacherLessonAttendanceState(regularLesson, new Date('2026-11-09T01:29:59.999Z')))
      .toBe('UPCOMING')
    expect(getTeacherLessonAttendanceState(regularLesson, new Date('2026-11-09T01:30:00.000Z')))
      .toBe('READY')
    expect(getTeacherLessonAttendanceState(regularLesson, new Date('2026-11-09T02:40:00.000Z')))
      .toBe('BACKFILL')
  })

  it('突击班只在开课时开放考勤', () => {
    const lesson = { ...regularLesson, intensiveMode: 'INTENSIVE' }

    expect(getTeacherLessonAttendanceState(lesson, new Date('2026-11-09T01:59:59.999Z')))
      .toBe('UPCOMING')
    expect(getTeacherLessonAttendanceState(lesson, new Date('2026-11-09T02:00:00.000Z')))
      .toBe('READY')
  })

  it('已提交或已完成课次不计入待录状态，缺失时间不作为可操作课次', () => {
    expect(getTeacherLessonAttendanceState({ ...regularLesson, attendanceSubmitted: true }, new Date('2026-11-09T03:00:00.000Z')))
      .toBe('DONE')
    expect(getTeacherLessonAttendanceState({ ...regularLesson, status: 'COMPLETED' }, new Date('2026-11-09T03:00:00.000Z')))
      .toBe('DONE')
    expect(getTeacherLessonAttendanceState({ ...regularLesson, startTime: '' }, new Date('2026-11-09T01:45:00.000Z')))
      .toBe('INVALID')
  })

  it('用中国本地日期时间选择最近有效的未来课次', () => {
    const soon = { ...regularLesson, id: 'soon', startTime: '10:30' }
    const later = { ...regularLesson, id: 'later', lessonDate: '2026-11-10T00:00:00.000Z', startTime: '09:00' }
    const now = new Date('2026-11-09T01:00:00.000Z')

    expect(getNextTeacherLesson([later, soon], now)?.id).toBe('soon')
    expect(getNextTeacherLesson([
      { ...soon, id: 'cancelled', status: 'CANCELLED' },
      { ...soon, id: 'completed', status: 'COMPLETED' },
    ], now)).toBeNull()
    expect(getNextTeacherLesson([{ ...soon, id: 'invalid-end', endTime: '10:20' }], now)).toBeNull()
  })

  it('返回最近一个未来排课日的全部有效课次并按开始时间排序', () => {
    const now = new Date('2026-11-09T01:00:00.000Z')
    const lessons = [
      { ...regularLesson, id: 'next-day', lessonDate: '2026-11-10T00:00:00.000Z', startTime: '09:00' },
      { ...regularLesson, id: 'near-late', startTime: '12:00', endTime: '12:40' },
      { ...regularLesson, id: 'near-early', startTime: '10:30' },
      { ...regularLesson, id: 'near-first' },
      { ...regularLesson, id: 'past', startTime: '08:00' },
      { ...regularLesson, id: 'cancelled', startTime: '13:00', status: 'CANCELLED' },
      { ...regularLesson, id: 'completed', startTime: '14:00', status: 'COMPLETED' },
    ]

    expect(getNextTeacherLessons(lessons, now).map((lesson) => lesson.id))
      .toEqual(['near-first', 'near-early', 'near-late'])
    expect(getNextTeacherLessons([], now)).toEqual([])
  })

  it('将课堂名单、考勤和课堂互动分别接到对应课次页面', () => {
    expect(getTeacherLessonDetailHref('lesson-42')).toBe('/teacher/lesson/lesson-42')
    expect(getTeacherAttendanceHref('lesson 42')).toBe('/teacher/attendance?lessonId=lesson%2042')
    expect(getTeacherInteractionHref('lesson-42')).toBe('/teacher/interaction?lessonId=lesson-42')
  })

  it('互动页默认选择正在上的课，其次最近未来课，最后最近的待补录课', () => {
    const current = { ...regularLesson, id: 'current', startTime: '09:50', endTime: '10:40' }
    const future = { ...regularLesson, id: 'future', startTime: '11:00', endTime: '11:40' }
    const past = { ...regularLesson, id: 'past', startTime: '08:00', endTime: '08:40' }

    expect(getDefaultTeacherInteractionLesson([future, current], new Date('2026-11-09T02:00:00.000Z'))?.id)
      .toBe('current')
    expect(getDefaultTeacherInteractionLesson([past, future], new Date('2026-11-09T02:00:00.000Z'))?.id)
      .toBe('future')
    expect(getDefaultTeacherInteractionLesson([past], new Date('2026-11-09T02:00:00.000Z'))?.id)
      .toBe('past')
  })

  it('未来互动预览在开课前10分钟只读，到开课前10分钟时允许写入', () => {
    // regularLesson 10:00 开始 (UTC 02:00)，开课前 10 分钟即 09:50 (UTC 01:50) 开放
    expect(canWriteTeacherInteraction(regularLesson, new Date('2026-11-09T01:49:59.999Z'))).toBe(false)
    expect(canWriteTeacherInteraction(regularLesson, new Date('2026-11-09T01:50:00.000Z'))).toBe(true)
    expect(canWriteTeacherInteraction({ ...regularLesson, startTime: '' }, new Date('2026-11-09T03:00:00.000Z')))
      .toBe(false)
    expect(canWriteTeacherInteraction({ ...regularLesson, status: 'POSTPONED' }, new Date('2026-11-09T03:00:00.000Z')))
      .toBe(false)
  })

  it('按中国本地日期将课次分组到月份和日期，并保持顺序', () => {
    const nov10 = { ...regularLesson, id: 'nov10', lessonDate: '2026-11-10T00:00:00.000Z' }
    const nov9 = { ...regularLesson, id: 'nov9' }
    const dec1 = { ...regularLesson, id: 'dec1', lessonDate: '2026-12-01T00:00:00.000Z' }

    expect(groupTeacherLessonsByMonthAndDate([dec1, nov10, nov9])).toEqual([
      {
        monthKey: '2026-11',
        days: [
          { dateKey: '2026-11-09', lessons: [nov9] },
          { dateKey: '2026-11-10', lessons: [nov10] },
        ],
      },
      { monthKey: '2026-12', days: [{ dateKey: '2026-12-01', lessons: [dec1] }] },
    ])
  })
})
