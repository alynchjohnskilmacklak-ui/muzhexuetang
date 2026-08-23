import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { minutesToHours } from '@/lib/hours'
import { apiHandler } from '@/lib/api-handler'
import { isClassLessonInActiveTerm } from '@/lib/admin-term-scope'
import { findScheduleMoveConflicts } from '@/lib/schedule-conflicts'

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  if (!await isClassLessonInActiveTerm(prisma, id)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能调整课次' }, { status: 409 })
  }
  const body = await req.json()
  const { lessonDate, startTime, endTime, status, cancelReason, note, teacherId, subject } = body

  const lesson = await prisma.classLesson.findUnique({
    where: { id },
    include: { group: true },
  })
  if (!lesson) return NextResponse.json({ error: '课次不存在' }, { status: 404 })

  const mins = lesson.group.lessonMinutes || 45
  const calcEnd = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return t
    const total = h * 60 + m + mins
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  if (status === 'CANCELLED') {
    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await tx.classLesson.update({
        where: { id },
        data: { status: 'CANCELLED', cancelReason, note },
      })

      const enrollments = await tx.enrollment.findMany({
        where: { groupId: lesson.groupId, status: 'ACTIVE' },
      })
      const lessonHours = minutesToHours(lesson.group.lessonMinutes)
      for (const e of enrollments) {
        const refundAmount = Math.min(lessonHours, e.usedHours)
        await tx.enrollment.update({
          where: { id: e.id },
          data: {
            usedHours: { decrement: refundAmount },
            remainHours: { increment: refundAmount },
          },
        })
      }

      await tx.activityLog.create({
        data: { userId: user.id, action: '停课', detail: lesson.group.name },
      })

      return updated
    })
    return NextResponse.json(cancelled)
  }

  const targetDate = lessonDate ? new Date(`${lessonDate}T00:00:00`) : lesson.lessonDate
  const targetStart = startTime || lesson.startTime
  const targetEnd = endTime || (startTime ? calcEnd(startTime) : lesson.endTime)
  if (!/^\d{2}:\d{2}$/.test(targetStart) || !/^\d{2}:\d{2}$/.test(targetEnd) || targetStart >= targetEnd || Number.isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: '调课日期或时间不正确' }, { status: 400 })
  }
  const targetTeacherId = teacherId !== undefined ? teacherId || null : lesson.teacherId || lesson.group.teacherId
  const sameDayLessons = await prisma.classLesson.findMany({
    where: {
      id: { not: id },
      lessonDate: targetDate,
      status: { not: 'CANCELLED' },
      division: lesson.division,
      OR: [
        ...(targetTeacherId ? [
          { teacherId: targetTeacherId },
          { teacherId: null, group: { teacherId: targetTeacherId } },
          { teacherId: null, group: { teacherAssignments: { some: { teacherId: targetTeacherId } } } },
        ] : []),
        ...(lesson.group.roomId ? [{ group: { roomId: lesson.group.roomId } }] : []),
      ],
    },
    include: { group: { select: { name: true, roomId: true, teacherId: true, teacherAssignments: { select: { teacherId: true } } } } },
  })
  const conflicts = findScheduleMoveConflicts(targetStart, targetEnd, sameDayLessons.map((candidate) => ({
    id: candidate.id,
    startTime: candidate.startTime,
    endTime: candidate.endTime,
    label: candidate.group.name,
    teacherConflict: Boolean(targetTeacherId) && (
      candidate.teacherId === targetTeacherId
      || (!candidate.teacherId && candidate.group.teacherId === targetTeacherId)
      || (!candidate.teacherId && candidate.group.teacherAssignments.some((item) => item.teacherId === targetTeacherId))
    ),
    roomConflict: Boolean(lesson.group.roomId) && candidate.group.roomId === lesson.group.roomId,
  })))
  if (conflicts.length) {
    const conflict = conflicts[0]
    const reasons = [conflict.teacherConflict ? '教师' : '', conflict.roomConflict ? '教室' : ''].filter(Boolean).join('和')
    return NextResponse.json({ error: `${reasons}时间冲突：${conflict.label || '已有课程'} ${conflict.startTime}-${conflict.endTime}` }, { status: 409 })
  }

  const updated = await prisma.classLesson.update({
    where: { id },
    data: {
      ...(lessonDate && { lessonDate: targetDate }),
      ...(startTime && { startTime: targetStart, endTime: targetEnd }),
      ...(endTime && { endTime }),
      ...(teacherId !== undefined && { teacherId: teacherId || null }),
      ...(subject !== undefined && { subject: subject || null }),
      ...(status && { status }),
      ...(note !== undefined && { note }),
      ...(status === 'POSTPONED' ? { postponeFrom: lesson.lessonDate } : {}),
    },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '调课', detail: lesson.group.name },
  })

  return NextResponse.json(updated)
})
