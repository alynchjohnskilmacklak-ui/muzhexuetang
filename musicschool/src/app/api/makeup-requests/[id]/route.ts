import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { targetLessonId, status } = body

  const existing = await prisma.makeupRequest.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '补课工单不存在' }, { status: 404 })

  const updated = await prisma.$transaction(async (tx) => {
    const mr = await tx.makeupRequest.update({
      where: { id },
      data: {
        targetLessonId: targetLessonId || null,
        status: status || 'ARRANGED',
        ...(status === 'ARRANGED' || targetLessonId ? { resolvedAt: new Date() } : {}),
      },
    })

    if (targetLessonId) {
      const att = await tx.attendance.findUnique({ where: { id: existing.attendanceId } })
      if (att) {
        await tx.attendance.create({
          data: {
            lessonId: targetLessonId,
            studentId: existing.studentId,
            enrollmentId: att.enrollmentId,
            status: 'MAKEUP',
            hoursDeducted: 0,
          },
        })
      }
    }

    await tx.activityLog.create({
      data: { userId: user.id, action: '安排补课', detail: existing.studentId },
    })

    return mr
  })

  return NextResponse.json(updated)
}
