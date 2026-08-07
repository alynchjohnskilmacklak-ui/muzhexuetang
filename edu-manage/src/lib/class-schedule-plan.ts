export type ReplaceableLesson = {
  id: string
  lessonDate: Date
}

function dayKey(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value.getTime()
}

export function selectReplacementTeachingDay(
  lessons: ReplaceableLesson[],
  requiredLessonCount: number,
) {
  if (requiredLessonCount <= 0) return null

  const lessonsByDay = new Map<number, ReplaceableLesson[]>()
  for (const lesson of lessons) {
    const key = dayKey(lesson.lessonDate)
    const current = lessonsByDay.get(key) || []
    current.push(lesson)
    lessonsByDay.set(key, current)
  }

  const matchingDays = [...lessonsByDay.entries()]
    .filter(([, dayLessons]) => dayLessons.length === requiredLessonCount)
    .sort(([left], [right]) => right - left)

  if (!matchingDays.length) return null

  const [date, dayLessons] = matchingDays[0]
  return {
    date: new Date(date),
    lessonIds: dayLessons.map((lesson) => lesson.id),
  }
}
