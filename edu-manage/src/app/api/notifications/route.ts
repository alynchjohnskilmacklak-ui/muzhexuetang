import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { buildFeedbackContent, buildSafeHomeContent } from '@/lib/wxpusher'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { createNotification } from '@/lib/notifications'
import { qywxEnabled, sendQywxParentMass } from '@/lib/qywx'
import { buildDailyDigest } from '@/lib/daily-digest'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
 
  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, searchParams.get('division'))

  const [records, total] = await Promise.all([
    prisma.notification.findMany({
      where: { senderId: { not: null }, ...visibleNotificationWhere, student: { division } },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { senderId: { not: null }, ...visibleNotificationWhere, student: { division } } }),
  ])
  return NextResponse.json({ records, total })
})

/** 企微群发错误码 → 语义化状态 */
function massErrorStatus(rawCode?: number): { status: string; error: string } {
  if (rawCode === 60019) return { status: 'limit_today', error: '该家长今日接收企微群发已达上限，已并入/明日重发' }
  if (rawCode === 84061) return { status: 'no_bind', error: '家长微信未添加为企微学员（外部联系人）' }
  return { status: 'failed', error: '企微群发创建失败' }
}

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()
  const senderId = (session.user as { id: string }).id

  const body = await req.json()
  const { studentId, title, content, type } = body as {
    studentId: string; title: string; content: string;
    type: 'system' | 'wxpusher_feedback' | 'wxpusher_safe'
  }

  if (!studentId || !type || (type === 'system' && (!title || !content))) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId },
    include: { parent: { select: { id: true, wxpusherUid: true, qywxExternalUserId: true, qywxSenderUserId: true } } },
  })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  // 教师只能向自己授课的学生家长推送通知，防止越权/钓鱼。
  const actorRole = (session.user as { role?: string }).role
  if (actorRole === 'teacher') {
    const teacherId = (session.user as { teacherId?: string | null }).teacherId
    if (!teacherId) return NextResponse.json({ error: '无权限' }, { status: 403 })
    const teaches = await prisma.student.findFirst({
      where: {
        id: studentId,
        enrollments: {
          some: {
            status: 'ACTIVE',
            group: {
              status: { not: 'ARCHIVED' },
              OR: [
                { teacherId },
                { teacherAssignments: { some: { teacherId } } },
              ],
            },
          },
        },
      },
      select: { id: true },
    })
    if (!teaches) return NextResponse.json({ error: '无权向该学员家长发送通知' }, { status: 403 })
  }

  const parentUserId = student.parent?.id || student.parentId || student.parentUserId
  const qywxExternalUserId = student.parent?.qywxExternalUserId
  const qywxSenderUserId = student.parent?.qywxSenderUserId

  let pushStatus = 'none'
  let pushError: string | null = null
  let qywxMsgId: string | null = null
  const notificationTitle = type === 'wxpusher_feedback'
    ? '课堂反馈通知'
    : type === 'wxpusher_safe'
      ? '平安回家通知'
      : title
  const notificationContent = type === 'wxpusher_feedback'
    ? buildFeedbackContent(student.name)
    : type === 'wxpusher_safe'
      ? buildSafeHomeContent(student.name)
      : content

  // Create notification record
  const notification = await createNotification(prisma, {
    userId: parentUserId || senderId,
    title: notificationTitle,
    content: notificationContent,
    type,
    studentId: student.id,
    senderId,
    pushStatus: 'none',
  })

  // 家长推送：企业微信「学员联系」群发（同日合并策略，替代已失效的 wxpusher）
  if (qywxEnabled()) {
    if (!qywxExternalUserId) {
      pushStatus = 'no_bind'
      pushError = '家长微信未添加为企微学员，请先在企业微信「学员联系-加学员」中添加该家长'
    } else {
      // 同日合并：当天已为该学生创建过企微群发 → 不重复建任务，避免触发每家长每日 1 条上限
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const existingMass = await prisma.notification.findFirst({
        where: {
          studentId: student.id,
          qywxMsgId: { not: null },
          createdAt: { gte: todayStart },
        },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
      })
      if (existingMass) {
        pushStatus = 'merged_today'
        pushError = `今日已生成企微汇总卡片（${existingMass.title}），本条已并入，请明日再单独发送`
      } else {
        const digest = await buildDailyDigest(prisma, student.id, student.name)
        const senderUserid = qywxSenderUserId || process.env.QYWX_MASS_SENDER || 'RenWenTao'
        const result = await sendQywxParentMass(senderUserid, [qywxExternalUserId], digest)
        if (result.success && result.msgid) {
          pushStatus = 'pending_confirm'
          qywxMsgId = result.msgid
          pushError = '已生成企微群发任务，请在企微「群发助手」确认发送'
        } else {
          const mapped = massErrorStatus(result.rawCode)
          pushStatus = mapped.status
          pushError = mapped.error + (result.error ? `（${result.error}）` : '')
        }
      }
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        pushStatus,
        pushError,
        qywxMsgId,
        attempts: { increment: 1 },
        sentAt: pushStatus === 'sent' ? new Date() : undefined,
        lastError: pushStatus === 'failed' || pushStatus === 'limit_today' || pushStatus === 'merged_today' ? pushError : undefined,
      },
    })
  }

  // Activity log
  await prisma.activityLog.create({
    data: {
      userId: senderId,
      action: '发送通知',
      detail: `${student.name} - ${notificationTitle}`,
      entityType: 'Notification',
      entityId: notification.id,
    },
  })

  return NextResponse.json({ ...notification, pushStatus, pushError, qywxMsgId }, { status: 201 })
})
