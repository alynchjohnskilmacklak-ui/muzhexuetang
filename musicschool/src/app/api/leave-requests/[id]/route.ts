import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || !['admin', 'teacher'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const userId = (session.user as { id: string }).id

  const body = await req.json()
  const { status, replyNote } = body as { status: 'approved' | 'rejected'; replyNote?: string }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: '无效的状态' }, { status: 400 })
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status,
      replyNote: replyNote || null,
      repliedAt: new Date(),
      repliedBy: userId,
    },
    include: {
      student: { select: { id: true, name: true } },
      schedule: { select: { id: true, startTime: true, course: { select: { name: true } } } },
    },
  })

  await prisma.activityLog.create({
    data: {
      userId,
      action: status === 'approved' ? '批准请假' : '拒绝请假',
      detail: `${updated.student.name} - ${updated.reason}`,
      entityType: 'LeaveRequest',
      entityId: id,
    },
  })

  return NextResponse.json(updated)
}
