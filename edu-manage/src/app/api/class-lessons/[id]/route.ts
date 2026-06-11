import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { minutesToHours } from '@/lib/hours'
import { apiHandler } from '@/lib/api-handler'

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
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

  const updated = await prisma.classLesson.update({
    where: { id },
    data: {
      ...(lessonDate && { lessonDate: new Date(lessonDate) }),
      ...(startTime && { startTime, endTime: endTime || calcEnd(startTime) }),
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
