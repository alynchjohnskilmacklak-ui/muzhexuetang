import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { dateRangeDays, getLocalDayRange, localDateKey, todayLocal } from '@/lib/date/local-day'
import { requireCurrentTeacher, teacherLessonWhere } from '@/lib/teacher-portal'
import { resolveLessonStudentIds } from '@/lib/lesson-roster'

export const dynamic = 'force-dynamic'

function addDays(date: string, days: number) {
  return dateRangeDays(date, days + 1)[days]
}

function isWeekendDate(date: Date) {
  const dateKey = localDateKey(date)
  const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
  return weekday === 0 || weekday === 6
}

export const GET = apiHandler(async () => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const today = todayLocal()
  const tomorrow = addDays(todayLocal(), 1)
  const rangeStart = getLocalDayRange(today).start

  const lessons = await prisma.classLesson.findMany({
    where: {
      ...teacherLessonWhere(teacher.id),
      lessonDate: { gte: rangeStart },
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
    },
    select: {
      id: true,
      lessonDate: true,
      startTime: true,
      endTime: true,
      subject: true,
      group: {
        select: {
          id: true,
          name: true,
          term: { select: { kind: true } },
          room: { select: { name: true } },
          course: { select: { grade: true, subject: true } },
          enrollments: { where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } }, select: { id: true, studentId: true } },
        },
      },
      lessonPreviewMaterial: {
        select: { id: true, title: true, fileName: true, fileType: true, description: true, status: true, createdAt: true, uploadedByRole: true },
      },
      lessonStudents: { select: { studentId: true } },
    },
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    take: 120,
  })

  const weekendLessons = lessons.filter((lesson) => lesson.group.term?.kind === 'WEEKEND' || isWeekendDate(lesson.lessonDate))
  const days = new Map<string, {
    id: string
    lessonDate: string
    grade: string | null
    lessons: Array<{
      id: string
      grade: string | null
      startTime: string
      endTime: string
      subject: string
      groupName: string
      roomName: string
      studentCount: number
      material: typeof weekendLessons[number]['lessonPreviewMaterial']
    }>
  }>()

  for (const lesson of weekendLessons) {
    const lessonDate = localDateKey(lesson.lessonDate)
    const existing = days.get(lessonDate)
    const material = lesson.lessonPreviewMaterial?.status === 'DELETED' ? null : lesson.lessonPreviewMaterial
    const lessonSummary = {
      id: lesson.id,
      groupId: lesson.group.id,
      grade: lesson.group.course.grade,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      subject: lesson.subject || lesson.group.course.subject,
      groupName: lesson.group.name,
      roomName: lesson.group.room?.name || '教室待定',
      studentCount: resolveLessonStudentIds(
        lesson.lessonStudents.map((item) => item.studentId),
        lesson.group.enrollments.map((enrollment) => enrollment.studentId),
        lesson.lessonDate,
      ).length,
      material,
    }
    if (existing) {
      existing.lessons.push(lessonSummary)
    } else {
      days.set(lessonDate, {
        id: lesson.id,
        lessonDate,
        grade: lesson.group.course.grade || '通用',
        lessons: [lessonSummary],
      })
    }
  }

  return NextResponse.json({
    today,
    tomorrow,
    days: [...days.values()].map((day) => ({ ...day, teacherName: teacher.name })),
  })
})
