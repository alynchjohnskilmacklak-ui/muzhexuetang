import { findSchedulePeriod, type SchedulePeriod } from '@/lib/schedule-periods'

export type ScheduleClass = {
  id: string
  name: string
  course?: { grade?: string | null; subject?: string | null; type?: string | null } | null
  teacherAssignments?: { subject?: string | null }[] | null
}

export type ScheduleLesson = {
  id: string
  groupId: string
  subject: string
  teacherName: string
  roomName: string
  startTime: string
  endTime: string
  headcount?: number
  [key: string]: unknown
}

export function configuredSubjects(group: ScheduleClass): string[] {
  const assigned = (group.teacherAssignments || [])
    .map((item) => item.subject?.trim())
    .filter((subject): subject is string => Boolean(subject))
  const fallback = (group.course?.subject || '').split(/[、,，]/).map((subject) => subject.trim()).filter(Boolean)
  return [...new Set(assigned.length ? assigned : fallback)]
}

function gradeRank(grade: string) {
  const labels = ['初一', '初二', '初三', '高一', '高二', '高三']
  const aliases = ['七年级', '八年级', '九年级', '高一年级', '高二年级', '高三年级']
  const index = labels.findIndex((label, i) => grade.includes(label) || grade.includes(aliases[i]))
  return index < 0 ? labels.length : index
}

export function buildClassSchedule(groups: ScheduleClass[], lessons: ScheduleLesson[], periods: SchedulePeriod[]) {
  const classes = groups
    .filter((group) => group.course?.type === 'GROUP')
    .sort((a, b) => {
      const gradeA = a.course?.grade || a.name
      const gradeB = b.course?.grade || b.name
      return gradeRank(gradeA) - gradeRank(gradeB)
        || gradeA.localeCompare(gradeB, 'zh-CN', { numeric: true })
        || a.name.localeCompare(b.name, 'zh-CN', { numeric: true })
    })
  const validGroupIds = new Set(classes.map((group) => group.id))
  const byGroup: Record<string, Record<string, ScheduleLesson[]>> = {}
  const otherByGroup: Record<string, ScheduleLesson[]> = {}
  for (const lesson of lessons) {
    if (!validGroupIds.has(lesson.groupId)) continue
    const periodId = findSchedulePeriod(periods, lesson.startTime)?.id
    if (periodId) {
      byGroup[lesson.groupId] ??= {}
      byGroup[lesson.groupId][periodId] ??= []
      byGroup[lesson.groupId][periodId].push(lesson)
    } else {
      otherByGroup[lesson.groupId] ??= []
      otherByGroup[lesson.groupId].push(lesson)
    }
  }
  return { classes, byGroup, otherByGroup }
}
