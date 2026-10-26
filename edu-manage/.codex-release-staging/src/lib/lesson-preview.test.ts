import { describe, expect, it } from 'vitest'
import { isLessonTaughtBy, isWeekendLesson, subjectFromFileName, suggestLessonForFile } from './lesson-preview'

describe('isLessonTaughtBy', () => {
  it('uses the explicit lesson teacher without mixing in group teachers', () => {
    const lesson = {
      teacherId: 'english-teacher',
      group: {
        teacherId: 'math-teacher',
        teacherAssignments: [{ teacherId: 'assistant-teacher' }],
      },
    }

    expect(isLessonTaughtBy(lesson, 'english-teacher')).toBe(true)
    expect(isLessonTaughtBy(lesson, 'math-teacher')).toBe(false)
    expect(isLessonTaughtBy(lesson, 'assistant-teacher')).toBe(false)
  })

  it('falls back to the group teacher assignments when a lesson has no explicit teacher', () => {
    const lesson = {
      teacherId: null,
      group: {
        teacherId: 'math-teacher',
        teacherAssignments: [{ teacherId: 'assistant-teacher' }],
      },
    }

    expect(isLessonTaughtBy(lesson, 'math-teacher')).toBe(true)
    expect(isLessonTaughtBy(lesson, 'assistant-teacher')).toBe(true)
    expect(isLessonTaughtBy(lesson, 'english-teacher')).toBe(false)
  })
})

describe('lesson preview helpers', () => {
  it('recognizes weekend dates and weekend operating terms', () => {
    expect(isWeekendLesson(new Date('2026-09-05T00:00:00.000Z'))).toBe(true)
    expect(isWeekendLesson(new Date('2026-09-07T00:00:00.000Z'))).toBe(false)
    expect(isWeekendLesson(new Date('2026-09-07T00:00:00.000Z'), 'WEEKEND')).toBe(true)
  })

  it('matches common subject words in filenames without guessing unknown files', () => {
    expect(subjectFromFileName('初二数学_二次函数.pdf')).toBe('数学')
    expect(subjectFromFileName('English Unit 5.pptx')).toBe('英语')
    expect(subjectFromFileName('周末讲义3.pdf')).toBeNull()
  })

  it('does not automatically assign a lesson that is already occupied', () => {
    const lessons = [{ id: 'math-a', subject: '数学' }, { id: 'math-b', subject: '数学' }]
    expect(suggestLessonForFile('数学A.pdf', lessons, new Set(['math-a']))?.id).toBe('math-b')
  })
})
