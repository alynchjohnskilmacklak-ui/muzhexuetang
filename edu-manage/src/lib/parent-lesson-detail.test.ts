import { describe, expect, it } from 'vitest'
import { buildParentLessonDetailHref, buildParentLessonDetailWhere, resolveParentLessonPresentation } from './parent-lesson-detail'

describe('parent lesson detail routing', () => {
  it('scopes lesson lookup by id and the parent’s selected child enrollment', () => {
    const where = buildParentLessonDetailWhere('parent-1', 'lesson-1', ['child-1'])

    expect(where).toMatchObject({
      id: 'lesson-1',
      group: {
        enrollments: {
          some: {
            studentId: { in: ['child-1'] },
            student: {
              OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }],
            },
          },
        },
      },
    })
  })

  it('includes the stable lesson id in links while retaining legacy display parameters', () => {
    const href = buildParentLessonDetailHref({
      lessonId: 'lesson-1',
      teacher: '胡老师',
      course: '初一冲刺班',
      childId: 'child-1',
      time: '08:30-09:10',
      room: '二楼201',
      lessonDate: '2026-11-14',
    })

    expect(href).toContain('lessonId=lesson-1')
    expect(href).toContain('childId=child-1')
    expect(href).toContain(encodeURIComponent('08:30-09:10'))
  })

  it('uses current lesson fields instead of stale URL display values', () => {
    const presentation = resolveParentLessonPresentation({
      lessonDate: new Date('2026-11-14T00:00:00.000Z'),
      startTime: '09:20',
      endTime: '10:00',
      subject: '数学',
      group: {
        course: { name: '牧哲学堂初一冲刺班' },
        room: { name: '三楼201' },
      },
    }, {
      course: '旧课程',
      time: '08:30-09:10',
      room: '旧教室',
      lessonDate: '2026-10-31',
    })

    expect(presentation).toEqual({
      course: '初一冲刺班',
      time: '09:20-10:00',
      room: '三楼201',
      lessonDate: '2026-11-14',
    })
  })

  it('keeps legacy query values when no current lesson was resolved', () => {
    expect(resolveParentLessonPresentation(null, {
      course: '牧哲学堂旧课程',
      time: '08:30-09:10',
      room: '旧教室',
      lessonDate: '2026-10-31',
    })).toEqual({
      course: '旧课程',
      time: '08:30-09:10',
      room: '旧教室',
      lessonDate: '2026-10-31',
    })
  })
})
