export type CopyScheduleSlot = {
  id: string
  groupId: string
  dateKey?: string
  groupName: string
  teacherId: string | null
  teacherName: string
  roomId: string | null
  roomName: string | null
  studentIds: string[]
  startTime: string
  endTime: string
}

export type CopyScheduleConflict = {
  type: 'teacher' | 'room' | 'student'
  teacherName?: string
  groupName?: string
  timeRange: string
  message: string
}

export function findClassLessonCopyConflicts(
  targets: CopyScheduleSlot[],
  existing: CopyScheduleSlot[],
): CopyScheduleConflict[] {
  const conflicts: CopyScheduleConflict[] = []
  const seen = new Set<string>()
  const pairs = [
    ...targets.flatMap((target) => existing.filter((slot) => slot.id !== target.id).map((slot) => [target, slot] as const)),
    ...targets.flatMap((target, index) => targets.slice(index + 1).map((slot) => [target, slot] as const)),
  ]

  for (const [target, other] of pairs) {
    if (target.dateKey && other.dateKey && target.dateKey !== other.dateKey) continue
    if (!(target.startTime < other.endTime && target.endTime > other.startTime)) continue
    const timeRange = `${other.startTime}-${other.endTime}`
    const add = (type: CopyScheduleConflict['type'], keyPart: string, message: string, extra: Pick<CopyScheduleConflict, 'teacherName' | 'groupName'> = {}) => {
      const key = `${type}:${target.id}:${other.id}:${keyPart}`
      if (seen.has(key)) return
      seen.add(key)
      conflicts.push({ type, timeRange, message, ...extra })
    }

    if (target.teacherId && target.teacherId === other.teacherId) {
      add('teacher', target.teacherId, `教师 ${target.teacherName || '待定'} ${target.dateKey || ''} ${other.startTime}-${other.endTime} 已有课程`, {
        teacherName: target.teacherName || other.teacherName,
        groupName: target.groupName,
      })
    }
    if (target.roomId && target.roomId === other.roomId) {
      add('room', target.roomId, `教室 ${target.roomName || '未命名'} ${target.dateKey || ''} ${other.startTime}-${other.endTime} 已被占用`, {
        groupName: target.groupName,
      })
    }
    const otherStudents = new Set(other.studentIds)
    if (target.studentIds.some((studentId) => otherStudents.has(studentId))) {
      add('student', 'shared', `学员在 ${other.groupName} ${target.dateKey || ''} ${other.startTime}-${other.endTime} 已有课程`, {
        groupName: target.groupName,
      })
    }
  }

  return conflicts
}
