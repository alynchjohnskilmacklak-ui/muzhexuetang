import { describe, it, expect } from 'vitest'

function calcAttendanceRate(records: { status: string }[]): number | null {
  const total = records.length
  if (total === 0) return null
  const present = records.filter(r => r.status === 'PRESENT' || r.status === 'MAKEUP').length
  return Math.round((present / total) * 100)
}

function calcMasteryPct(counts: Record<string, number>): { masteredPct: number; reviewPct: number; weakPct: number } {
  const total = (counts.MASTERED || 0) + (counts.NEEDS_REVIEW || 0) + (counts.NEEDS_PRACTICE || 0)
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  return { masteredPct: pct(counts.MASTERED || 0), reviewPct: pct(counts.NEEDS_REVIEW || 0), weakPct: pct(counts.NEEDS_PRACTICE || 0) }
}

function calcHomeworkDoneRate(feedbacks: { homeworkDone: boolean | null }[]): number | null {
  const withData = feedbacks.filter(f => f.homeworkDone !== null)
  if (!withData.length) return null
  return Math.round((withData.filter(f => f.homeworkDone).length / withData.length) * 100)
}

describe('attendanceRate', () => {
  it('PRESENT + MAKEUP / total', () => {
    expect(calcAttendanceRate([{ status: 'PRESENT' }, { status: 'LEAVE' }, { status: 'PRESENT' }])).toBe(67)
  })

  it('all PRESENT → 100', () => {
    expect(calcAttendanceRate([{ status: 'PRESENT' }, { status: 'PRESENT' }])).toBe(100)
  })

  it('all ABSENT → 0', () => {
    expect(calcAttendanceRate([{ status: 'ABSENT' }, { status: 'ABSENT' }])).toBe(0)
  })

  it('total=0 → null', () => {
    expect(calcAttendanceRate([])).toBeNull()
  })

  it('MAKEUP 计入出勤', () => {
    expect(calcAttendanceRate([{ status: 'MAKEUP' }, { status: 'ABSENT' }])).toBe(50)
  })
})

describe('masteryPct', () => {
  it('均分', () => {
    const r = calcMasteryPct({ MASTERED: 5, NEEDS_REVIEW: 3, NEEDS_PRACTICE: 2 })
    expect(r.masteredPct).toBe(50)
    expect(r.reviewPct).toBe(30)
    expect(r.weakPct).toBe(20)
  })

  it('total=0 → all 0', () => {
    const r = calcMasteryPct({})
    expect(r.masteredPct).toBe(0)
    expect(r.weakPct).toBe(0)
  })
})

describe('homeworkDoneRate', () => {
  it('3/4 完成 → 75%', () => {
    expect(calcHomeworkDoneRate([{ homeworkDone: true }, { homeworkDone: true }, { homeworkDone: true }, { homeworkDone: false }])).toBe(75)
  })

  it('无 homeworkDone 数据 → null', () => {
    expect(calcHomeworkDoneRate([{ homeworkDone: null }, { homeworkDone: null }])).toBeNull()
  })

  it('全部完成 → 100%', () => {
    expect(calcHomeworkDoneRate([{ homeworkDone: true }, { homeworkDone: true }])).toBe(100)
  })
})
