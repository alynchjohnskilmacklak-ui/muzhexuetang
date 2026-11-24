import { localDateColumnValue, localDateKey } from './date/local-day'

export type ReplaceableLesson = {
  id: string
  lessonDate: Date
}

function dayKey(date: Date) {
  return localDateKey(date)
}

export function selectReplacementTeachingDay(
  lessons: ReplaceableLesson[],
  requiredLessonCount: number,
) {
  if (requiredLessonCount <= 0) return null

  const lessonsByDay = new Map<string, ReplaceableLesson[]>()
  for (const lesson of lessons) {
    const key = dayKey(lesson.lessonDate)
    const current = lessonsByDay.get(key) || []
    current.push(lesson)
    lessonsByDay.set(key, current)
  }

  const matchingDays = [...lessonsByDay.entries()]
    .filter(([, dayLessons]) => dayLessons.length === requiredLessonCount)
    .sort(([left], [right]) => right.localeCompare(left))

  if (!matchingDays.length) return null

  const [date, dayLessons] = matchingDays[0]
  return {
    date: localDateColumnValue(date),
    lessonIds: dayLessons.map((lesson) => lesson.id),
  }
}
