import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getAccessibleParentMessageWhere } from '@/lib/parent-message-access'
import {
  getParentMessageWorkflowState,
  getTeacherResponseMinutes,
  summarizeParentMessageWorkflow,
} from '@/lib/parent-message-workflow'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prisma = await getRequestPrisma()
  const where = getAccessibleParentMessageWhere(user, user.division)
  if (!where) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const noStoreHeaders = { 'Cache-Control': 'private, no-store' }
  if (user.role === 'parent' || user.role === 'teacher') {
    const isParent = user.role === 'parent'
    const count = await prisma.parentMessageReply.count({
      where: {
        message: where,
        ...(isParent
          ? { role: { not: 'parent' }, isReadByParent: false }
          : { role: 'parent', isReadByTeacher: false }),
      },
    })

    return NextResponse.json(
      isParent ? { count, pendingParentReads: count } : { count },
      { headers: noStoreHeaders },
    )
  }

  const messages = await prisma.parentMessage.findMany({
    where,
    select: {
      status: true,
      teacherId: true,
      teacher: { select: { name: true } },
      replies: {
        select: {
          role: true,
          createdAt: true,
          isReadByParent: true,
          isReadByTeacher: true,
        },
      },
    },
  })
  const summary = summarizeParentMessageWorkflow(messages)
  const count = summary.unreadForTeacher
  const responseMinutes: number[] = []
  let parentFollowUps = 0
  const pendingByTeacher = new Map<string, { id: string; name: string; count: number }>()

  if (user.role === 'admin') {
    for (const message of messages) {
      const workflow = getParentMessageWorkflowState(message)
      parentFollowUps += workflow.parentFollowUpCount
      if (workflow.pendingTeacherReply && message.teacherId && message.teacher) {
        const current = pendingByTeacher.get(message.teacherId)
        pendingByTeacher.set(message.teacherId, {
          id: message.teacherId,
          name: message.teacher.name,
          count: (current?.count || 0) + 1,
        })
      }
      responseMinutes.push(...getTeacherResponseMinutes(message.replies))
    }
  }
  const averageReplyMinutes = responseMinutes.length
    ? Math.round(responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length)
    : 0
  const replyRate24h = responseMinutes.length
    ? Math.round(responseMinutes.filter(value => value <= 24 * 60).length / responseMinutes.length * 100)
    : 100

  return NextResponse.json({
    count,
    pendingTeacherReplies: summary.pendingTeacherReplies,
    pendingParentReads: summary.pendingParentReads,
    overdueTeacherReplies: summary.overdueTeacherReplies,
    averageReplyMinutes,
    replyRate24h,
    parentFollowUps,
    pendingByTeacher: [...pendingByTeacher.values()].sort((a, b) => b.count - a.count),
  }, {
    headers: noStoreHeaders,
  })
})
