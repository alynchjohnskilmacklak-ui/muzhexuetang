/**
 * 统一教师冲突源 — 同时查 ClassLesson + Schedule 两张表。
 * 解决两套排课互不可见对方占用的根因。
 */
import type { PrismaClient } from '@prisma/client'
import { hasTimeOverlap } from './schedule-conflict'

const toHHmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

export interface BusySlot {
  source: 'lesson' | 'schedule'
  label: string
  start: string
  end: string
}

export async function getTeacherBusy(
  prisma: PrismaClient,
  teacherId: string,
  dateStr: string,
  start: string,
  end: string,
): Promise<BusySlot | null> {
  const dayStart = new Date(`${dateStr}T00:00:00`)
  const dayEnd = new Date(`${dateStr}T23:59:59`)

  // A) ClassLesson（字符串时间，状态大写）
  const lessons = await prisma.classLesson.findMany({
    where: { teacherId, lessonDate: { gte: dayStart, lte: dayEnd }, status: { not: 'CANCELLED' } },
    select: { startTime: true, endTime: true, group: { select: { course: { select: { name: true } } } } },
  })
  for (const l of lessons)
    if (hasTimeOverlap(start, end, l.startTime, l.endTime))
      return { source: 'lesson', label: l.group?.course?.name || '班课', start: l.startTime, end: l.endTime }

  // B) Schedule（Date 时间，状态小写）→ 归一化为 HH:mm
  const schedules = await prisma.schedule.findMany({
    where: { teacherId, startTime: { gte: dayStart, lte: dayEnd }, status: { not: 'cancelled' } },
    select: { startTime: true, endTime: true, title: true },
  })
  for (const s of schedules) {
    const ss = toHHmm(s.startTime), se = toHHmm(s.endTime)
    if (hasTimeOverlap(start, end, ss, se))
      return { source: 'schedule', label: s.title || '排课', start: ss, end: se }
  }

  return null
}
