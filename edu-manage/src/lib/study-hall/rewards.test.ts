import { describe, expect, it } from 'vitest'
import {
  COMPLETED_ATTENDANCE_STATUSES,
  STUDY_HALL_REWARD,
  createStudyHallAttendanceReward,
  createStudyHallHomeworkReward,
  studyHallAttendanceRewardKey,
} from './rewards'

describe('study hall salary rewards', () => {
  it('uses product rule A1 for completed attendance', () => {
    expect(COMPLETED_ATTENDANCE_STATUSES).toEqual(['PRESENT', 'PERSONAL_LEAVE', 'ABSENT'])
    expect(STUDY_HALL_REWARD).toEqual({ fullAttendance: 40, homeworkEntry: 0.5 })
  })

  it('builds one stable database key per class and natural day', () => {
    expect(studyHallAttendanceRewardKey('class-1', '2026-08-29'))
      .toBe('STUDY_HALL_ATTENDANCE:class-1:2026-08-29')
  })

  it('does not issue duplicate rewards under concurrent submissions', async () => {
    const ledger = new Set<string>()
    const client = {
      teacherSalaryTransaction: {
        async create({ data }: { data: { lessonPayKey: string } }) {
          await Promise.resolve()
          if (ledger.has(data.lessonPayKey)) throw Object.assign(new Error('unique'), { code: 'P2002' })
          ledger.add(data.lessonPayKey)
          return { id: data.lessonPayKey }
        },
      },
    }
    const input = {
      teacherId: 'teacher-1', termId: 'term-1', classId: 'class-1', className: '晚托作业班',
      studyDate: '2026-08-29', lessonDate: new Date('2026-08-29T00:00:00.000Z'),
    }

    const results = await Promise.all([
      createStudyHallAttendanceReward(client, input),
      createStudyHallAttendanceReward(client, input),
    ])

    expect(results.sort()).toEqual([false, true])
    expect(ledger.size).toBe(1)
  })

  it('only rewards the same student homework entry once', async () => {
    const ledger = new Set<string>()
    const client = {
      teacherSalaryTransaction: {
        async create({ data }: { data: { feedbackId: string; type: string } }) {
          const key = `${data.feedbackId}:${data.type}`
          await Promise.resolve()
          if (ledger.has(key)) throw Object.assign(new Error('unique'), { code: 'P2002' })
          ledger.add(key)
          return { id: key }
        },
      },
    }
    const input = {
      teacherId: 'teacher-1', termId: 'term-1', entryId: 'entry-1', className: '晚托作业班',
      studentName: '刘子旭', lessonDate: new Date('2026-08-29T00:00:00.000Z'),
    }

    const results = await Promise.all([
      createStudyHallHomeworkReward(client, input),
      createStudyHallHomeworkReward(client, input),
    ])

    expect(results.sort()).toEqual([false, true])
    expect(ledger.size).toBe(1)
  })
})
