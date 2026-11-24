import type { Prisma } from '@prisma/client'
import { parentVisibleLessonWhere } from './business-visibility'

type ParentLessonDetailLinkInput = {
  lessonId?: string | null
  teacher?: string | null
  course?: string | null
  childId?: string | null
  time?: string | null
  room?: string | null
  lessonDate?: string | null
}

type ParentLessonPresentationRecord = {
  lessonDate: Date | string
  startTime: string
  endTime: string
  subject?: string | null
  group?: {
    course?: { name?: string | null } | null
    room?: { name?: string | null } | null
  } | null
}

export type ParentLessonPresentation = {
  course: string
  time: string
  room: string
  lessonDate: string
}

export function buildParentLessonDetailWhere(
  parentUserId: string,
  lessonId: string,
  studentIds: string[],
): Prisma.ClassLessonWhereInput {
  return {
    id: lessonId,
    ...parentVisibleLessonWhere(parentUserId, studentIds),
  }
}

export function buildParentLessonDetailHref(input: ParentLessonDetailLinkInput): string {
  const params = new URLSearchParams()
  const values: Array<[string, string | null | undefined]> = [
    ['lessonId', input.lessonId],
    ['teacher', input.teacher],
    ['course', input.course],
    ['childId', input.childId],
    ['time', input.time],
    ['room', input.room],
    ['date', input.lessonDate],
  ]

  for (const [key, value] of values) {
    if (value) params.set(key, value)
  }

  return `/parent/lesson-detail?${params.toString()}`
}

export function resolveParentLessonPresentation(
  lesson: ParentLessonPresentationRecord | null,
  fallback: ParentLessonPresentation,
): ParentLessonPresentation {
  const rawCourse = lesson?.group?.course?.name || lesson?.subject || fallback.course
  const course = rawCourse.replace(/^牧哲学堂/, '').trim() || '小班课程'
  if (!lesson) return { ...fallback, course }

  const lessonDate = lesson.lessonDate instanceof Date
    ? lesson.lessonDate.toISOString().slice(0, 10)
    : lesson.lessonDate.slice(0, 10)

  return {
    course,
    time: `${lesson.startTime}-${lesson.endTime}`,
    room: lesson.group?.room?.name || '',
    lessonDate,
  }
}

