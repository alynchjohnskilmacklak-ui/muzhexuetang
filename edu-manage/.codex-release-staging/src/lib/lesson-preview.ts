import { localDateKey } from '@/lib/date/local-day'

export interface LessonTeacherScope {
  teacherId: string | null
  group: {
    teacherId: string | null
    teacherAssignments: Array<{ teacherId: string }>
  }
}

export function isLessonTaughtBy(lesson: LessonTeacherScope, teacherId: string) {
  if (lesson.teacherId) return lesson.teacherId === teacherId
  return lesson.group.teacherId === teacherId
    || lesson.group.teacherAssignments.some((assignment) => assignment.teacherId === teacherId)
}

export function isWeekendLesson(lessonDate: Date, termKind?: string | null) {
  if (termKind === 'WEEKEND') return true
  const dateKey = localDateKey(lessonDate)
  const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
  return weekday === 0 || weekday === 6
}

const SUBJECT_ALIASES: Record<string, string[]> = {
  语文: ['语文', '作文', '阅读'],
  数学: ['数学', '代数', '几何', '函数'],
  英语: ['英语', '英文', 'english'],
  物理: ['物理'],
  化学: ['化学'],
  生物: ['生物'],
  地理: ['地理'],
  历史: ['历史'],
  政治: ['政治', '道法'],
}

export function subjectFromFileName(fileName: string) {
  const normalized = fileName.toLowerCase().replace(/\s+/g, '')
  return Object.entries(SUBJECT_ALIASES).find(([, aliases]) => aliases.some((alias) => normalized.includes(alias)))?.[0] || null
}

export function suggestLessonForFile<T extends { id: string; subject: string }>(
  fileName: string,
  lessons: T[],
  unavailableLessonIds: Set<string> = new Set(),
) {
  const subject = subjectFromFileName(fileName)
  if (!subject) return null
  return lessons.find((lesson) => lesson.subject.includes(subject) && !unavailableLessonIds.has(lesson.id)) || null
}
