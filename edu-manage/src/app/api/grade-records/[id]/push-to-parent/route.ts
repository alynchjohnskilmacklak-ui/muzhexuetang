import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { id } = await params

  const record = await prisma.gradeRecord.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, parentPhone: true } },
      assessment: { select: { name: true } },
    },
  })
  if (!record) return NextResponse.json({ error: '成绩记录不存在' }, { status: 404 })

  await prisma.gradeRecord.update({
    where: { id },
    data: { notifySent: true },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: '推送成绩报告',
      detail: `${record.student.name} - ${record.assessment.name}`,
    },
  })

  // In production, this would trigger an async push notification
  return NextResponse.json({ success: true })
})
