/**
 * Classroom roll-call reveal pacing. These timings affect presentation only;
 * the server remains the sole source of the selected student.
 */
export function getPickRevealDuration(candidateCount: number, reducedMotion = false): number {
  if (reducedMotion || candidateCount <= 0) return 0
  if (candidateCount === 1) return 0
  if (candidateCount === 2) return 500
  if (candidateCount <= 4) return 1200
  return 2200
}

/** Increase the interval quadratically to create a restrained deceleration. */
export function getPickRollInterval(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0
  const progress = Math.max(0, Math.min(1, elapsedMs / durationMs))
  return Math.round(48 + 252 * progress ** 2)
}

/** A visual-only cycle over the locally eligible roster. */
export function getRollCandidateId(candidateIds: string[], index: number): string | null {
  if (candidateIds.length === 0) return null
  const normalizedIndex = ((Math.trunc(index) % candidateIds.length) + candidateIds.length) % candidateIds.length
  return candidateIds[normalizedIndex]
}

/** Never reveal a rolling placeholder; only a server response can be shown. */
export function shouldRevealServerPick(input: {
  serverPickReady: boolean
  animationDone: boolean
  revealRequested: boolean
}): boolean {
  return input.serverPickReady && (input.animationDone || input.revealRequested)
}
