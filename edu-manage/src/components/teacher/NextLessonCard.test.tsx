import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getTeacherLessonDetailHref } from '@/lib/teacher-lesson-navigation'
import { NextLessonCard } from './NextLessonCard'

const lesson = {
  id: 'lesson-42',
  lessonDate: '2026-11-14T00:00:00.000Z',
  startTime: '08:30',
  endTime: '09:10',
  groupName: '初一冲刺班',
  courseName: '数学',
  subject: '数学',
  room: '二楼201',
  studentCount: 3,
}

describe('teacher next lesson card', () => {
  it('opens the matching lesson detail and keeps the full schedule shortcut by default', () => {
    const html = renderToStaticMarkup(
      <NextLessonCard lesson={lesson} previewHref={getTeacherLessonDetailHref(lesson.id)} />,
    )

    expect(html).toContain('href="/teacher/lesson/lesson-42"')
    expect(html).toContain('预览课堂名单')
    expect(html).toContain('href="/teacher/schedule"')
  })

  it('can omit the repeated timetable shortcut in a multi-lesson list', () => {
    const html = renderToStaticMarkup(
      <NextLessonCard
        lesson={lesson}
        previewHref={getTeacherLessonDetailHref(lesson.id)}
        showScheduleLink={false}
      />,
    )

    expect(html).toContain('href="/teacher/lesson/lesson-42"')
    expect(html).not.toContain('href="/teacher/schedule"')
  })
})
