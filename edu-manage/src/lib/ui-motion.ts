export function easeOutDeceleration(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress))
  return 1 - (1 - clamped) ** 3
}

export type HeartReaction = { type?: string | null; userId?: string | null }

export function getHeartReactionState(reactions: readonly HeartReaction[], userId?: string) {
  const hearts = reactions.filter((reaction) => reaction.type === 'HEART')
  return {
    count: hearts.length,
    liked: Boolean(userId && hearts.some((reaction) => reaction.userId === userId)),
  }
}

export type DrawerSnapPoint = 'peek' | 'full' | 'closed'

export function resolveDrawerSnapPoint(current: Exclude<DrawerSnapPoint, 'closed'>, deltaY: number, velocityY = 0): DrawerSnapPoint {
  if (velocityY <= -0.55 && current === 'peek') return 'full'
  if (velocityY >= 0.55 && current === 'full') return 'peek'
  if (velocityY >= 0.55 && current === 'peek' && deltaY > 18) return 'closed'
  if (deltaY < -42) return 'full'
  if (current === 'full' && deltaY > 48) return 'peek'
  if (current === 'peek' && deltaY > 96) return 'closed'
  return current
}

export function getRubberBandOffset(distance: number, limit = 76): number {
  if (!Number.isFinite(distance) || !Number.isFinite(limit) || limit <= 0) return 0
  const magnitude = Math.abs(distance)
  const resisted = limit * (1 - 1 / (magnitude / limit + 1))
  return Math.sign(distance) * resisted
}

export type TiltSurfaceRect = { left: number; top: number; width: number; height: number }
export type TiltSurfacePosition = { rotateX: number; rotateY: number; lightX: number; lightY: number }

export function getTiltSurfacePosition(
  clientX: number,
  clientY: number,
  rect: TiltSurfaceRect,
  maxTilt = 4.5,
): TiltSurfacePosition {
  const x = rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0.5
  const y = rect.height > 0 ? Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)) : 0.5
  return {
    rotateX: (0.5 - y) * 2 * maxTilt,
    rotateY: (x - 0.5) * 2 * maxTilt,
    lightX: x * 100,
    lightY: y * 100,
  }
}

export function resolveTrendIndex(value: string | number, categories: readonly string[]): number {
  if (!categories.length) return -1
  const exactIndex = categories.indexOf(String(value))
  if (exactIndex >= 0) return exactIndex
  const numericIndex = typeof value === 'number' ? Math.round(value) : Number.NaN
  if (!Number.isFinite(numericIndex)) return -1
  return Math.max(0, Math.min(categories.length - 1, numericIndex))
}

export function getArchiveEntryTransitionName(
  type?: string | null,
  id?: string | null,
  title?: string | null,
  date?: string | Date | null,
): string {
  const dateKey = date instanceof Date ? date.toISOString().slice(0, 10) : String(date || '').slice(0, 10)
  const source = `${type || 'entry'}|${id || title || 'record'}|${dateKey}`
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `mz-entry-${(hash >>> 0).toString(36)}`
}

export function runDocumentViewTransition(update: () => void | Promise<void>): boolean {
  if (typeof document === 'undefined') return false
  const viewTransitionDocument = document as Document & {
    startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> }
  }
  if (typeof viewTransitionDocument.startViewTransition !== 'function') return false
  try {
    const transition = viewTransitionDocument.startViewTransition(update)
    void transition.finished.catch(() => undefined)
    return true
  } catch {
    return false
  }
}
