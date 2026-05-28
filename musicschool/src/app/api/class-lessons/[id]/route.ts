import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { minutesToHours } from '@/lib/hours'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const mins = lesson.group.lessonMinutes
  const calcEnd = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const total = h * 60 + m + mins
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  if (status === 'CANCELLED') {
    await prisma.$transaction(async (tx) => {
      await tx.classLesson.update({
        where: { id },
        data: { status: 'CANCELLED', cancelReason, note },
      })

      // Refund hours for enrolled students
      const enrollments = await tx.enrollment.findMany({
        where: { groupId: lesson.groupId, status: 'ACTIVE' },
      })
      const lessonHours = minutesToHours(lesson.group.lessonMinutes)
      for (const e of enrollments) {
        await tx.enrollment.update({
          where: { id: e.id },
          data: {
            usedHours: { decrement: Math.min(lessonHours, e.usedHours) },
            remainHours: { increment: lessonHours },
          },
        })
      }

      await tx.activityLog.create({
        data: { userId: user.id, action: '停课', detail: lesson.group.name },
      })
    })
  } else {
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
        ...(lessonDate && status !== 'POSTPONED' ? { postponeFrom: lesson.lessonDate } : {}),
      },
    })

    await prisma.activityLog.create({
      data: { userId: user.id, action: '调课', detail: lesson.group.name },
    })

    return NextResponse.json(updated)
  }

  return NextResponse.json({ success: true })
}
