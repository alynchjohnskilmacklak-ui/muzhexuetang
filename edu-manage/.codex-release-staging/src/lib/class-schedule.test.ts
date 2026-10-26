import { describe, expect, it } from 'vitest'
import { buildClassSchedule, configuredSubjects, type ScheduleClass, type ScheduleLesson } from './class-schedule'
import type { SchedulePeriod } from './schedule-periods'

const periods: SchedulePeriod[] = [{ id: 'am1', name: '上午第一节', type: 'CLASS', start: '08:30', end: '09:10' }]
const groups: ScheduleClass[] = [
  { id: 'class-1', name: '初一一班', course: { grade: '初一', subject: '英语、数学、语文、物理', type: 'GROUP' }, teacherAssignments: [{ subject: '英语' }, { subject: '数学' }, { subject: '语文' }, { subject: '物理' }] },
  { id: 'class-2', name: '初二一班', course: { grade: '初二', type: 'GROUP' } },
  { id: 'private', name: '一对一', course: { type: 'ONE_ON_ONE' } },
]

function lesson(id: string, groupId: string, subject: string, startTime = '08:30'): ScheduleLesson {
  return { id, groupId, subject, startTime, endTime: '09:10', teacherName: '老师', roomName: '一楼101' }
}

describe('班级课表归组', () => {
  it('同一教室的不同班级不会合并，未排的第四科仍保留在班级配置中', () => {
    const result = buildClassSchedule(groups, [lesson('a', 'class-1', '英语'), lesson('b', 'class-2', '数学'), lesson('c', 'private', '语文')], periods)
    expect(result.classes.map((item) => item.name)).toEqual(['初一一班', '初二一班'])
    expect(result.byGroup['class-1'].am1.map((item) => item.subject)).toEqual(['英语'])
    expect(result.byGroup['class-2'].am1.map((item) => item.subject)).toEqual(['数学'])
    expect(configuredSubjects(groups[0])).toEqual(['英语', '数学', '语文', '物理'])
  })

  it('非标准时间课次仍展示在班级的其他时间，不会静默丢失', () => {
    const result = buildClassSchedule(groups, [lesson('late', 'class-1', '物理', '18:20')], periods)
    expect(result.otherByGroup['class-1'].map((item) => item.subject)).toEqual(['物理'])
  })
})
