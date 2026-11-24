export type LessonPreviewSlot = {
  id: string
  groupId: string
  subject: string
  teacherId: string | null
  groupName: string
  teacherName: string
  startTime: string
  endTime: string
  studentCount: number
  material: unknown | null
}

export function lessonPreviewUploadGroupKey(lesson: Pick<LessonPreviewSlot, 'id' | 'groupId' | 'subject' | 'teacherId'>) {
  const teacherKey = lesson.teacherId || `unassigned:${lesson.id}`
  return [lesson.groupId, lesson.subject.trim(), teacherKey].join('::')
}

export type LessonPreviewUploadGroup<T extends LessonPreviewSlot> = {
  id: string
  groupId: string
  groupName: string
  subject: string
  teacherId: string | null
  teacherName: string
  lessons: T[]
  pendingLessons: T[]
  studentCount: number
  timeRanges: string[]
}

export function groupLessonPreviewSlots<T extends LessonPreviewSlot>(lessons: T[]) {
  const groups = new Map<string, LessonPreviewUploadGroup<T>>()
  for (const lesson of lessons) {
    const id = lessonPreviewUploadGroupKey(lesson)
    let group = groups.get(id)
    if (!group) {
      group = {
        id,
        groupId: lesson.groupId,
        groupName: lesson.groupName,
        subject: lesson.subject,
        teacherId: lesson.teacherId,
        teacherName: lesson.teacherName,
        lessons: [],
        pendingLessons: [],
        studentCount: lesson.studentCount,
        timeRanges: [],
      }
      groups.set(id, group)
    }
    group.lessons.push(lesson)
    if (!lesson.material) group.pendingLessons.push(lesson)
    group.studentCount = Math.max(group.studentCount, lesson.studentCount)
    group.timeRanges.push(`${lesson.startTime}–${lesson.endTime}`)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      lessons: [...group.lessons].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      pendingLessons: [...group.pendingLessons].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      timeRanges: [...new Set(group.timeRanges)].sort(),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject, 'zh-CN') || a.groupName.localeCompare(b.groupName, 'zh-CN') || a.timeRanges[0].localeCompare(b.timeRanges[0]))
}
