import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere } from '@/lib/business-visibility'
import { addDays } from 'date-fns'
import { apiHandler } from '@/lib/api-handler'

const WEEK_DAYS = new Set(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])

function normalizeRecurringDays(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((day): day is string => typeof day === 'string' && WEEK_DAYS.has(day))
}

function normalizeTemplate(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const entry = item as Record<string, unknown>
      const teacherId = typeof entry.teacherId === 'string' ? entry.teacherId : ''
      const subject = typeof entry.subject === 'string' ? entry.subject.trim() : ''
      const startTime = typeof entry.startTime === 'string' ? entry.startTime : ''
      const endTime = typeof entry.endTime === 'string' ? entry.endTime : ''
      if (!teacherId || !subject || !startTime || !endTime) return null
      return { teacherId, subject, startTime, endTime, order: Number(entry.order || index + 1) }
    })
    .filter((item): item is { teacherId: string; subject: string; startTime: string; endTime: string; order: number } => Boolean(item))
    .sort((a, b) => a.order - b.order)
}

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { startDate, recurringDays, totalLessons, lessonStartTime, lessonMinutes, totalDays } = body
  const scheduleTemplate = normalizeTemplate(body.scheduleTemplate)

  const group = await prisma.classGroup.findFirst({
    where: { id, ...visibleClassGroupWhere },
    include: { course: true, teacherAssignments: { orderBy: { createdAt: 'asc' } } },
  })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })

  const start = startDate ? new Date(startDate) : group.startDate
  const requestDays = normalizeRecurringDays(recurringDays)
  const days = requestDays.length ? requestDays : group.recurringDays
  const mins = lessonMinutes || group.lessonMinutes
  const total = totalDays || totalLessons || group.totalLessons
  const startTime = lessonStartTime || group.lessonStartTime

  if (!days.length) return NextResponse.json({ error: '请选择上课日期' }, { status: 400 })

  await prisma.classLesson.deleteMany({
    where: { groupId: id, status: { not: 'COMPLETED' } },
  })

  const dates: Date[] = []
  let cursor = new Date(start)
  const dayMap: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }
  const targetDays = days.map((d: string) => dayMap[d] ?? -1).filter((d: number) => d >= 0)

  while (dates.length < total) {
    if (targetDays.includes(cursor.getDay())) {
      dates.push(new Date(cursor))
    }
    cursor = addDays(cursor, 1)
    if (dates.length === 0 && cursor.getTime() > addDays(start, 365).getTime()) break
  }

  const endTime = (t: string, m: number) => {
    const [h, min] = t.split(':').map(Number)
    const totalMin = h * 60 + min + m
    return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`
  }

  const assignments = group.teacherAssignments.length
    ? group.teacherAssignments
    : [{ teacherId: group.teacherId, subject: group.course.subject }]
  const dailyTemplate = scheduleTemplate.length
    ? scheduleTemplate
    : assignments.map((assignment) => ({
        teacherId: assignment.teacherId,
        subject: assignment.subject || group.course.subject,
        startTime,
        endTime: endTime(startTime, mins),
        order: 1,
      }))

  await prisma.classLesson.createMany({
    data: dates.flatMap((d) => dailyTemplate.map((slot) => ({
      groupId: id,
      teacherId: slot.teacherId,
      subject: slot.subject,
      lessonDate: d,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: 'SCHEDULED' as const,
    }))),
  })

  await prisma.classGroup.update({
    where: { id },
    data: { totalLessons: dates.length, lessonStartTime: startTime, lessonMinutes: mins,
      recurringDays: days, startDate: start },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '生成课次', detail: `${group.name} 共${dates.length}节` },
  })

  const lessons = await prisma.classLesson.findMany({
    where: { groupId: id, group: visibleClassGroupWhere },
    orderBy: { lessonDate: 'asc' },
  })

  return NextResponse.json({ lessons, count: lessons.length })
})
