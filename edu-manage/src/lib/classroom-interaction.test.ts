import { describe, expect, it } from 'vitest'
import {
  buildCandidateContexts,
  computeWeight,
  isPickResult,
  isRollCallStatus,
  nextRound,
  pickUniform,
  pickWeighted,
  summarizeParticipation,
} from './classroom-interaction'

const NOW = new Date('2026-11-05T10:00:00.000Z')

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * 86_400_000)
}

describe('computeWeight', () => {
  it('从未被抽到的人权重最高', () => {
    expect(computeWeight({ studentId: 'a', lastPickedAt: null, lastResult: null }, NOW)).toBe(300)
  })

  it('越久没被抽到权重越高', () => {
    const recent = computeWeight({ studentId: 'a', lastPickedAt: daysAgo(1), lastResult: null }, NOW)
    const stale = computeWeight({ studentId: 'a', lastPickedAt: daysAgo(20), lastResult: null }, NOW)
    expect(recent).toBeLessThan(stale)
    expect(stale).toBeLessThan(300)
  })

  it('停滞超过 30 天后权重封顶，不会无限膨胀', () => {
    const thirty = computeWeight({ studentId: 'a', lastPickedAt: daysAgo(30), lastResult: null }, NOW)
    const hundred = computeWeight({ studentId: 'a', lastPickedAt: daysAgo(100), lastResult: null }, NOW)
    expect(thirty).toBe(300)
    expect(hundred).toBe(300)
  })

  it('上次需要订正的学员额外加权', () => {
    const plain = computeWeight({ studentId: 'a', lastPickedAt: daysAgo(5), lastResult: 'CORRECT' }, NOW)
    const needsWork = computeWeight({ studentId: 'a', lastPickedAt: daysAgo(5), lastResult: 'NEEDS_WORK' }, NOW)
    expect(needsWork).toBeGreaterThan(plain)
  })
})

describe('nextRound', () => {
  it('名单为空或没有历史时是第 1 轮', () => {
    expect(nextRound([], ['a', 'b'])).toBe(1)
    expect(nextRound([], [])).toBe(1)
  })

  it('本轮没抽完仍在第 1 轮', () => {
    expect(nextRound([{ studentId: 'a', round: 1, createdAt: NOW }], ['a', 'b'])).toBe(1)
  })

  it('全班走完一遍进入第 2 轮', () => {
    const history = [
      { studentId: 'a', round: 1, createdAt: NOW },
      { studentId: 'b', round: 1, createdAt: NOW },
    ]
    expect(nextRound(history, ['a', 'b'])).toBe(2)
  })

  it('名单临时加入新学员时不会误跳到下一轮', () => {
    const history = [
      { studentId: 'a', round: 1, createdAt: NOW },
      { studentId: 'b', round: 1, createdAt: NOW },
    ]
    expect(nextRound(history, ['a', 'b', 'c'])).toBe(1)
  })
})

describe('pickWeighted', () => {
  it('名单为空返回 null', () => {
    expect(pickWeighted([], [], { now: NOW })).toBeNull()
  })

  it('单人名单必然抽到该学员', () => {
    expect(pickWeighted(['a'], [], { now: NOW, random: () => 0 })?.studentId).toBe('a')
  })

  it('同一轮内不会被重复抽到', () => {
    const history = [{ studentId: 'a', round: 1, createdAt: daysAgo(3) }]
    const picked = pickWeighted(['a', 'b'], history, { now: NOW, random: () => 0 })
    expect(picked?.studentId).toBe('b')
    expect(picked?.round).toBe(1)
  })

    it('本轮抽满后自动进入下一轮，允许再抽同一人', () => {
    const history = [
      { studentId: 'a', round: 1, createdAt: daysAgo(2) },
      { studentId: 'b', round: 1, createdAt: daysAgo(2) },
    ]
    const picked = pickWeighted(['a', 'b'], history, { now: NOW, random: () => 0 })
    expect(picked?.round).toBe(2)
    expect(['a', 'b']).toContain(picked?.studentId)
  })

  it('random 取上界时仍落在池内，不会越界', () => {
    const picked = pickWeighted(['a', 'b', 'c'], [], { now: NOW, random: () => Number.MAX_SAFE_INTEGER })
    expect(['a', 'b', 'c']).toContain(picked?.studentId)
  })

  it('剩余人数口径正确', () => {
    const picked = pickWeighted(['a', 'b', 'c'], [{ studentId: 'a', round: 1, createdAt: NOW }], {
      now: NOW,
      random: () => 0,
    })
    expect(picked?.remainingThisRound).toBe(2)
  })
})

describe('buildCandidateContexts', () => {
  it('按最近一次记录取状态', () => {
    const contexts = buildCandidateContexts(['a'], [
      { studentId: 'a', round: 1, createdAt: daysAgo(10), result: 'NEEDS_WORK' },
      { studentId: 'a', round: 2, createdAt: daysAgo(1), result: 'CORRECT' },
    ])
    expect(contexts[0].lastResult).toBe('CORRECT')
  })
})

describe('summarizeParticipation', () => {
  it('只统计传入记录，不引入班级横向比较', () => {
    const summary = summarizeParticipation([
      { result: 'CORRECT', createdAt: daysAgo(1) },
      { result: 'NEEDS_WORK', createdAt: daysAgo(2) },
      { result: null, createdAt: daysAgo(3) },
    ])
    expect(summary.totalPicks).toBe(3)
    expect(summary.correctCount).toBe(1)
    expect(summary.needsWorkCount).toBe(1)
    expect(summary.lastPickedAt).toBe(daysAgo(1).toISOString())
  })

  it('没有记录时返回空汇总', () => {
    expect(summarizeParticipation([])).toEqual({
      totalPicks: 0,
      correctCount: 0,
      needsWorkCount: 0,
      lastPickedAt: null,
    })
  })
})

describe('枚举校验', () => {
  it('只接受约定的取值', () => {
    expect(isPickResult('CORRECT')).toBe(true)
    expect(isPickResult('correct')).toBe(false)
    expect(isPickResult(undefined)).toBe(false)
    expect(isRollCallStatus('LATE')).toBe(true)
    expect(isRollCallStatus('LEAVE')).toBe(false)
  })
})

describe('pickUniform 纯等概率随机抽取', () => {
  it('候选人为空时返回 null', () => {
    expect(pickUniform([])).toBeNull()
  })

  it('只有单名学员时 100% 抽中该学员', () => {
    expect(pickUniform(['student-1'])).toBe('student-1')
  })

  it('严格根据随机源下标等概率抽取，支持边界容错', () => {
    const list = ['a', 'b', 'c']
    expect(pickUniform(list, { random: () => 0 })).toBe('a')
    expect(pickUniform(list, { random: () => 1 })).toBe('b')
    expect(pickUniform(list, { random: () => 2 })).toBe('c')
    // 边界越界保护
    expect(pickUniform(list, { random: () => 999 })).toBe('c')
    expect(pickUniform(list, { random: () => -5 })).toBe('a')
  })

  it('大样本统计验证：每个学员被抽中的概率严格相等 (1/N)', () => {
    const candidates = ['student-A', 'student-B', 'student-C', 'student-D']
    const counts: Record<string, number> = {
      'student-A': 0,
      'student-B': 0,
      'student-C': 0,
      'student-D': 0,
    }
    const TOTAL_RUNS = 20_000
    for (let i = 0; i < TOTAL_RUNS; i += 1) {
      const picked = pickUniform(candidates)
      if (picked) counts[picked] += 1
    }

    // 理论期望每人 5,000 次 (25%)，在 20,000 次样本下，每人应该在 25% ± 2.5% 区间内
    for (const id of candidates) {
      const frequency = counts[id] / TOTAL_RUNS
      expect(frequency).toBeGreaterThan(0.225)
      expect(frequency).toBeLessThan(0.275)
    }
  })
})
