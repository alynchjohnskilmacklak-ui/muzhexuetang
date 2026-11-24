import { describe, expect, it } from 'vitest'
import {
  getPickRevealDuration,
  getPickRollInterval,
  getRollCandidateId,
  shouldRevealServerPick,
} from './classroom-interaction-roll'

describe('课堂随机点名揭晓节奏', () => {
  it('小候选池缩短等待，普通班约 2.2 秒，减少动效用户跳过滚动', () => {
    expect(getPickRevealDuration(0)).toBe(0)
    expect(getPickRevealDuration(1)).toBe(0)
    expect(getPickRevealDuration(2)).toBe(500)
    expect(getPickRevealDuration(3)).toBe(1200)
    expect(getPickRevealDuration(4)).toBe(1200)
    expect(getPickRevealDuration(5)).toBe(2200)
    expect(getPickRevealDuration(20, true)).toBe(0)
  })

  it('滚动间隔随进度阻尼增加，并限制在 300ms 内', () => {
    const duration = 2200
    const first = getPickRollInterval(0, duration)
    const middle = getPickRollInterval(1100, duration)
    const last = getPickRollInterval(duration, duration)

    expect(first).toBe(48)
    expect(first).toBeLessThan(middle)
    expect(middle).toBeLessThan(last)
    expect(last).toBe(300)
    expect(getPickRollInterval(duration * 2, duration)).toBe(last)
  })

  it('滚动只循环展示传入的在场候选学员', () => {
    expect(getRollCandidateId([], 0)).toBeNull()
    expect(getRollCandidateId(['present-a', 'present-b'], 0)).toBe('present-a')
    expect(getRollCandidateId(['present-a', 'present-b'], 3)).toBe('present-b')
    expect(getRollCandidateId(['present-a', 'present-b'], -1)).toBe('present-b')
  })

  it('服务端结果未返回前，无论动画结束还是点击立即揭晓都不展示名字', () => {
    expect(shouldRevealServerPick({
      serverPickReady: false,
      animationDone: true,
      revealRequested: false,
    })).toBe(false)
    expect(shouldRevealServerPick({
      serverPickReady: false,
      animationDone: false,
      revealRequested: true,
    })).toBe(false)
  })

  it('服务端结果返回后，动画完成或老师立即揭晓都可以展示同一结果', () => {
    expect(shouldRevealServerPick({
      serverPickReady: true,
      animationDone: true,
      revealRequested: false,
    })).toBe(true)
    expect(shouldRevealServerPick({
      serverPickReady: true,
      animationDone: false,
      revealRequested: true,
    })).toBe(true)
    expect(shouldRevealServerPick({
      serverPickReady: true,
      animationDone: false,
      revealRequested: false,
    })).toBe(false)
  })
})
