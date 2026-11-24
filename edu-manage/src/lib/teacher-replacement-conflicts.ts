export type TeacherReplacementSlot = {
  id: string
  date: string
  startTime: string
  endTime: string
  groupName: string
}

export type TeacherReplacementConflict = TeacherReplacementSlot & {
  otherGroupName: string
  otherStartTime: string
  otherEndTime: string
}

export function findTeacherReplacementConflicts(
  targets: TeacherReplacementSlot[],
  otherLessons: Array<TeacherReplacementSlot & { teacherId: string | null }>,
) {
  const conflicts: TeacherReplacementConflict[] = []
  const seen = new Set<string>()
  const addIfOverlap = (target: TeacherReplacementSlot, other: TeacherReplacementSlot) => {
    if (target.id === other.id || target.date !== other.date) return
    if (!(target.startTime < other.endTime && target.endTime > other.startTime)) return
    const key = `${target.id}:${other.id}`
    if (seen.has(key)) return
    seen.add(key)
    conflicts.push({
      ...target,
      otherGroupName: other.groupName,
      otherStartTime: other.startTime,
      otherEndTime: other.endTime,
    })
  }

  for (const target of targets) {
    for (const other of otherLessons) addIfOverlap(target, other)
  }
  for (let index = 0; index < targets.length; index += 1) {
    for (const other of targets.slice(index + 1)) addIfOverlap(targets[index], other)
  }
  return conflicts
}
