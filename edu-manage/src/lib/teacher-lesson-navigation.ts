import { localDateKey } from '@/lib/date/local-day'
import {
  getTeacherAttendanceSubmissionState,
  lessonStartAt,
  teacherAttendanceOpenAt,
} from '@/lib/teacher-intensive-scheduling'

export type TeacherLessonNavigationItem = {
  id: string
  lessonDate?: string | Date | null
  startTime?: string | null
  endTime?: string | null
  intensiveMode?: string | null
  status?: string | null
  attendanceSubmitted?: boolean
  attendanceSubmittedAt?: string | Date | null
}

export type TeacherLessonAttendanceState = 'UPCOMING' | 'READY' | 'BACKFILL' | 'DONE' | 'INVALID'

export type TeacherLessonDateGroup<T extends TeacherLessonNavigationItem> = {
  dateKey: string
  lessons: T[]
}

export type TeacherLessonMonthGroup<T extends TeacherLessonNavigationItem> = {
  monthKey: string
  days: TeacherLessonDateGroup<T>[]
}

const CLOSED_LESSON_STATUSES = new Set(['CANCELLED', 'POSTPONED'])

function lessonTimestamp(lesson: TeacherLessonNavigationItem, time: string | null | undefined) {
  if (!lesson.lessonDate || !time || !/^\d{2}:\d{2}$/.test(time)) return null
  try {
    const date = lessonStartAt(lesson.lessonDate, time)
    return Number.isFinite(date.getTime()) ? date.getTime() : null
  } catch {
    return null
  }
}

function lessonDateKey(lesson: TeacherLessonNavigationItem) {
  if (!lesson.lessonDate) return null
  try {
    return localDateKey(lesson.lessonDate)
  } catch {
    return null
  }
}

function isSubmitted(lesson: TeacherLessonNavigationItem) {
  return Boolean(lesson.attendanceSubmitted || lesson.attendanceSubmittedAt)
}

export function getTeacherLessonAttendanceState(
  lesson: TeacherLessonNavigationItem,
  now: Date = new Date(),
): TeacherLessonAttendanceState {
  if (CLOSED_LESSON_STATUSES.has(String(lesson.status || '').toUpperCase())) return 'INVALID'
  if (isSubmitted(lesson) || lesson.status === 'COMPLETED') return 'DONE'

  const startAt = lessonTimestamp(lesson, lesson.startTime)
  const endAt = lessonTimestamp(lesson, lesson.endTime)
  if (startAt === null || endAt === null || endAt <= startAt || !Number.isFinite(now.getTime())) {
    return 'INVALID'
  }

  let openAt: number
  try {
    openAt = teacherAttendanceOpenAt({
      lessonDate: lesson.lessonDate!,
      startTime: lesson.startTime!,
      intensiveMode: lesson.intensiveMode,
    }).getTime()
  } catch {
    return 'INVALID'
  }
  if (!Number.isFinite(openAt)) return 'INVALID'
  if (now.getTime() < openAt) return 'UPCOMING'
  if (now.getTime() < endAt) return 'READY'
  return 'BACKFILL'
}

export function canWriteTeacherInteraction(
  lesson: TeacherLessonNavigationItem,
  now: Date = new Date(),
) {
  if (CLOSED_LESSON_STATUSES.has(String(lesson.status || '').toUpperCase())) return false
  if (!Number.isFinite(now.getTime())) return false
  const startAt = lessonTimestamp(lesson, lesson.startTime)
  if (startAt === null) return false
  // 课程开始前 10 分钟开放互动与点名
  const TEN_MINUTES_MS = 10 * 60 * 1000
  return now.getTime() >= startAt - TEN_MINUTES_MS
}

export function canWriteTeacherAttendance(
  lesson: TeacherLessonNavigationItem,
  now: Date = new Date(),
) {
  if (CLOSED_LESSON_STATUSES.has(String(lesson.status || '').toUpperCase())) return false
  if (!lesson.lessonDate || !lesson.startTime || !lesson.endTime) return false
  return getTeacherAttendanceSubmissionState({
    lessonDate: lesson.lessonDate,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    intensiveMode: lesson.intensiveMode,
    now,
  }) === 'OPEN'
}

export function getNextTeacherLesson<T extends TeacherLessonNavigationItem>(
  lessons: T[],
  now: Date = new Date(),
): T | null {
  const nowTime = now.getTime()
  if (!Number.isFinite(nowTime)) return null

  return lessons
    .map((lesson) => ({
      lesson,
      startAt: lessonTimestamp(lesson, lesson.startTime),
      endAt: lessonTimestamp(lesson, lesson.endTime),
    }))
    .filter(({ lesson, startAt, endAt }) => (
      startAt !== null
      && endAt !== null
      && endAt > startAt
      && startAt > nowTime
      && !CLOSED_LESSON_STATUSES.has(String(lesson.status || '').toUpperCase())
      && lesson.status !== 'COMPLETED'
    ))
    .sort((a, b) => a.startAt! - b.startAt!)[0]?.lesson ?? null
}

export function getNextTeacherLessons<T extends TeacherLessonNavigationItem>(
  lessons: T[],
  now: Date = new Date(),
): T[] {
  const nextLesson = getNextTeacherLesson(lessons, now)
  const nextDateKey = nextLesson ? lessonDateKey(nextLesson) : null
  if (!nextDateKey) return []

  const nowTime = now.getTime()
  return lessons
    .map((lesson) => ({
      lesson,
      startAt: lessonTimestamp(lesson, lesson.startTime),
      endAt: lessonTimestamp(lesson, lesson.endTime),
    }))
    .filter(({ lesson, startAt, endAt }) => (
      lessonDateKey(lesson) === nextDateKey
      && startAt !== null
      && endAt !== null
      && endAt > startAt
      && startAt > nowTime
      && !CLOSED_LESSON_STATUSES.has(String(lesson.status || '').toUpperCase())
      && lesson.status !== 'COMPLETED'
    ))
    .sort((a, b) => a.startAt! - b.startAt!)
    .map(({ lesson }) => lesson)
}

/**
 * The attendance workspace keeps only today's classes visible. If there are
 * none today, it previews the single nearest future class instead of exposing
 * historical sessions that invite teacher backfill.
 */
export function getTeacherAttendanceDisplayLessons<T extends TeacherLessonNavigationItem>(
  lessons: T[],
  now: Date = new Date(),
): T[] {
  const todayKey = localDateKey(now)
  const todayLessons = lessons
    .filter((lesson) => (
      lessonDateKey(lesson) === todayKey
      && !CLOSED_LESSON_STATUSES.has(String(lesson.status || '').toUpperCase())
    ))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  if (todayLessons.length) return todayLessons
  const nextLesson = getNextTeacherLesson(lessons, now)
  return nextLesson ? [nextLesson] : []
}

export function getTeacherLessonDetailHref(lessonId: string) {
  return `/teacher/lesson/${encodeURIComponent(lessonId)}`
}

export function getTeacherAttendanceHref(lessonId: string) {
  return `/teacher/attendance?lessonId=${encodeURIComponent(lessonId)}`
}

export function getTeacherInteractionHref(lessonId: string) {
  return `/teacher/interaction?lessonId=${encodeURIComponent(lessonId)}`
}

export function getDefaultTeacherInteractionLesson<T extends TeacherLessonNavigationItem>(
  lessons: T[],
  now: Date = new Date(),
): T | null {
  const nowTime = now.getTime()
  if (!Number.isFinite(nowTime)) return null

  const valid = lessons
    .map((lesson) => ({
      lesson,
      startAt: lessonTimestamp(lesson, lesson.startTime),
      endAt: lessonTimestamp(lesson, lesson.endTime),
    }))
    .filter(({ lesson, startAt, endAt }) => (
      startAt !== null
      && endAt !== null
      && endAt > startAt
      && !CLOSED_LESSON_STATUSES.has(String(lesson.status || '').toUpperCase())
    ))
    .sort((a, b) => a.startAt! - b.startAt!)

  const inProgress = valid.find(({ startAt, endAt }) => startAt! <= nowTime && nowTime < endAt!)
  if (inProgress) return inProgress.lesson

  const upcoming = valid.find(({ lesson, startAt }) => (
    startAt! > nowTime
    && !isSubmitted(lesson)
    && lesson.status !== 'COMPLETED'
  ))
  if (upcoming) return upcoming.lesson

  const backfill = valid
    .filter(({ endAt, lesson }) => endAt! <= nowTime && getTeacherLessonAttendanceState(lesson, now) === 'BACKFILL')
    .at(-1)
  if (backfill) return backfill.lesson

  return valid[0]?.lesson ?? null
}

export function groupTeacherLessonsByMonthAndDate<T extends TeacherLessonNavigationItem>(
  lessons: T[],
): TeacherLessonMonthGroup<T>[] {
  const months = new Map<string, Map<string, T[]>>()
  for (const lesson of lessons) {
    const dateKey = lessonDateKey(lesson) ?? 'unknown'
    const monthKey = dateKey === 'unknown' ? 'unknown' : dateKey.slice(0, 7)
    let days = months.get(monthKey)
    if (!days) {
      days = new Map<string, T[]>()
      months.set(monthKey, days)
    }
    const dayLessons = days.get(dateKey) ?? []
    dayLessons.push(lesson)
    days.set(dateKey, dayLessons)
  }

  return [...months.entries()]
    .sort(([a], [b]) => a === 'unknown' ? 1 : b === 'unknown' ? -1 : a.localeCompare(b))
    .map(([monthKey, days]) => ({
      monthKey,
      days: [...days.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, dayLessons]) => ({
          dateKey,
          lessons: dayLessons.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
        })),
    }))
}
