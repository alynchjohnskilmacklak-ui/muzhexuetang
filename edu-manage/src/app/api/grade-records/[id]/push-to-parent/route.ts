import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { createNotification } from '@/lib/notifications'
import { qywxEnabled } from '@/lib/qywx'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()
  const { id } = await params

  const record = await prisma.gradeRecord.findFirst({
    where: { id, deletedAt: null, assessment: { group: { division: user.division } } },
    select: {
      id: true,
      score: true,
      notifySent: true,
      student: { select: { id: true, name: true, parentId: true, parentUserId: true } },
      assessment: { select: { name: true, fullScore: true, group: { select: { division: true } } } },
    },
  })
  if (!record) return NextResponse.json({ error: '成绩记录不存在' }, { status: 404 })
  const parentUserId = record.student.parentId || record.student.parentUserId
  if (!parentUserId) return NextResponse.json({ error: '该学员尚未绑定家长账号，无法推送' }, { status: 409 })
  if (record.notifySent) return NextResponse.json({ error: '该成绩已推送给家长' }, { status: 409 })

  const pushed = await prisma.$transaction(async (tx) => {
    const claim = await tx.gradeRecord.updateMany({
      where: { id, deletedAt: null, notifySent: false },
      data: { notifySent: true },
    })
    if (claim.count !== 1) return false

    await createNotification(tx, {
      userId: parentUserId,
      studentId: record.student.id,
      type: 'GRADE_RECORD',
      title: `${record.student.name}的成绩已发布`,
      content: `${record.assessment.name}：${record.score} / ${record.assessment.fullScore} 分。`,
      relatedType: 'GRADE_RECORD',
      relatedId: id,
      href: '/parent',
      pushStatus: qywxEnabled() ? 'queued' : 'none',
    })
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: '推送成绩报告',
        detail: `${record.student.name} - ${record.assessment.name}`,
      },
    })
    return true
  })

  if (!pushed) return NextResponse.json({ error: '该成绩已推送或正在推送' }, { status: 409 })
  return NextResponse.json({ success: true })
})
