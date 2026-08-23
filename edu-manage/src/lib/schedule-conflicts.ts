export type ScheduleConflictCandidate = {
  id: string
  startTime: string
  endTime: string
  teacherConflict?: boolean
  roomConflict?: boolean
  label?: string
}

export function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA
}

export function findScheduleMoveConflicts(
  startTime: string,
  endTime: string,
  candidates: ScheduleConflictCandidate[],
) {
  return candidates.filter((candidate) => (
    (candidate.teacherConflict || candidate.roomConflict)
    && timeRangesOverlap(startTime, endTime, candidate.startTime, candidate.endTime)
  ))
}
