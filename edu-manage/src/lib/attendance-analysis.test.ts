import { describe, expect, it } from 'vitest'
import { analyzeAttendance } from './attendance-analysis'

describe('analyzeAttendance', () => {
  it('computes weekly attendance and flags only current consecutive absence streaks', () => {
    const now = new Date('2026-11-05T12:00:00')
    const result = analyzeAttendance([
      { studentId: 's1', studentName: '小明', groupName: '一班', status: 'ABSENT', lessonDate: '2026-11-04T10:00:00' },
      { studentId: 's1', studentName: '小明', groupName: '一班', status: 'ABSENT', lessonDate: '2026-11-02T10:00:00' },
      { studentId: 's1', studentName: '小明', groupName: '一班', status: 'PRESENT', lessonDate: '2026-10-30T10:00:00' },
      { studentId: 's2', studentName: '小红', groupName: '一班', status: 'ABSENT', lessonDate: '2026-11-04T10:00:00' },
      { studentId: 's3', studentName: '未来', groupName: '一班', status: 'ABSENT', lessonDate: '2026-11-07T10:00:00' },
    ], now)
    expect(result.consecutiveAbsences.map(item => [item.studentId, item.streak])).toEqual([['s1', 2]])
    expect(result.trend).toHaveLength(2)
    expect(result.trend.at(-1)?.attendanceRate).toBe(0)
  })
})
