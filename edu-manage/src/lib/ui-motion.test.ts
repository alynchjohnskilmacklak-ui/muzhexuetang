import { describe, expect, it } from 'vitest'
import {
  easeOutDeceleration,
  getArchiveEntryTransitionName,
  getHeartReactionState,
  getRubberBandOffset,
  getTiltSurfacePosition,
  resolveDrawerSnapPoint,
  resolveTrendIndex,
} from './ui-motion'

describe('UI motion helpers', () => {
  it('clamps and decelerates numeric animation toward its final value', () => {
    expect(easeOutDeceleration(-1)).toBe(0)
    expect(easeOutDeceleration(0)).toBe(0)
    expect(easeOutDeceleration(0.5)).toBeGreaterThan(0.5)
    expect(easeOutDeceleration(1)).toBe(1)
    expect(easeOutDeceleration(2)).toBe(1)
  })

  it('counts only heart reactions and identifies the current parent', () => {
    expect(getHeartReactionState([
      { type: 'HEART', userId: 'parent-1' },
      { type: 'STAR', userId: 'parent-2' },
      { type: 'HEART', userId: 'parent-3' },
    ], 'parent-1')).toEqual({ count: 2, liked: true })
    expect(getHeartReactionState([{ type: 'HEART', userId: 'parent-2' }], 'parent-1')).toEqual({ count: 1, liked: false })
  })

  it('snaps the bottom drawer between preview, full, and closed positions', () => {
    expect(resolveDrawerSnapPoint('peek', -60)).toBe('full')
    expect(resolveDrawerSnapPoint('full', 60)).toBe('peek')
    expect(resolveDrawerSnapPoint('peek', 120)).toBe('closed')
    expect(resolveDrawerSnapPoint('peek', 20)).toBe('peek')
    expect(resolveDrawerSnapPoint('peek', 20, 0.8)).toBe('closed')
    expect(resolveDrawerSnapPoint('full', 12, 0.8)).toBe('peek')
    expect(resolveDrawerSnapPoint('peek', -12, -0.8)).toBe('full')
  })

  it('resists drawer overdrag and preserves its direction', () => {
    expect(getRubberBandOffset(0)).toBe(0)
    expect(getRubberBandOffset(100)).toBeGreaterThan(0)
    expect(getRubberBandOffset(-100)).toBeLessThan(0)
    expect(Math.abs(getRubberBandOffset(100))).toBeLessThan(76)
  })

  it('maps pointer position to a bounded card tilt and light source', () => {
    expect(getTiltSurfacePosition(150, 100, { left: 100, top: 50, width: 100, height: 100 })).toEqual({
      rotateX: 0,
      rotateY: 0,
      lightX: 50,
      lightY: 50,
    })
    expect(getTiltSurfacePosition(500, 500, { left: 100, top: 50, width: 100, height: 100 })).toEqual({
      rotateX: -4.5,
      rotateY: 4.5,
      lightX: 100,
      lightY: 100,
    })
  })

  it('snaps chart pointer values to the closest category index', () => {
    const categories = ['2026-11-01', '2026-11-02', '2026-11-03']
    expect(resolveTrendIndex('2026-11-02', categories)).toBe(1)
    expect(resolveTrendIndex(8, categories)).toBe(2)
    expect(resolveTrendIndex('unknown', categories)).toBe(-1)
  })

  it('creates stable, CSS-safe archive shared-element names', () => {
    const first = getArchiveEntryTransitionName('post', 'post-12', '孩子的进步', '2026-11-05')
    expect(first).toMatch(/^mz-entry-[a-z0-9]+$/)
    expect(getArchiveEntryTransitionName('post', 'post-12', '不同标题', '2026-11-05')).toBe(first)
    expect(getArchiveEntryTransitionName('post', 'post-13', '孩子的进步', '2026-11-05')).not.toBe(first)
  })
})
