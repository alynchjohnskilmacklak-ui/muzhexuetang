import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { buildSafeHomeContent } from '@/lib/wxpusher'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { createNotification } from '@/lib/notifications'
import { qywxEnabled } from '@/lib/qywx'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'
// Parent WeCom notifications are aggregated into a family digest and require manual confirmation in WeCom.

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

  if (!['system', 'wxpusher_feedback', 'wxpusher_safe'].includes(type)) {
    return NextResponse.json({ error: '通知类型无效' }, { status: 400 })
  }
  if (!studentId || !type || (type === 'system' && (!title || !content))) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const actorRole = (session.user as { role?: string }).role
  const actorTeacherId = actorRole === 'teacher'
    ? (session.user as { teacherId?: string | null }).teacherId || null
    : null
  const adminDivision = actorRole === 'admin'
    ? getRequestDivision(session.user as Record<string, unknown> | undefined, req.nextUrl.searchParams.get('division'))
    : null
  const selectedTerm = actorRole === 'admin' && adminDivision
    ? await resolveAdminTermScope(prisma, adminDivision, req)
    : null
  if (actorRole === 'admin' && !selectedTerm) {
    return NextResponse.json({ error: '请先选择运营批次，再创建该批次学员的通知' }, { status: 409 })
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      ...(actorRole === 'admin' && adminDivision && selectedTerm ? {
        division: adminDivision,
        deletedAt: null,
        status: { notIn: ['INACTIVE', 'ARCHIVED'] },
        termMemberships: {
          some: { termId: selectedTerm.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
        },
      } : {}),
    },
    include: { parent: { select: { id: true, wxpusherUid: true, qywxExternalUserId: true, qywxSenderUserId: true } } },
  })
  if (!student) return NextResponse.json({ error: '学员不存在或不属于当前运营批次' }, { status: 404 })

  const parent = student.parent || (student.parentUserId
    ? await prisma.user.findFirst({
        where: { id: student.parentUserId, role: 'parent', status: 'active' },
        select: { id: true, wxpusherUid: true, qywxExternalUserId: true, qywxSenderUserId: true },
      })
    : null)

  // 教师只能向自己授课的学生家长推送通知，防止越权/钓鱼。
  if (actorRole === 'teacher') {
    if (!actorTeacherId) return NextResponse.json({ error: '无权限' }, { status: 403 })
    const teaches = await prisma.student.findFirst({
      where: {
        id: studentId,
        enrollments: {
          some: {
            status: 'ACTIVE',
            group: {
              status: { not: 'ARCHIVED' },
              OR: [
                { teacherId: actorTeacherId },
                { teacherAssignments: { some: { teacherId: actorTeacherId } } },
              ],
            },
          },
        },
      },
      select: { id: true },
    })
    if (!teaches) return NextResponse.json({ error: '无权向该学员家长发送通知' }, { status: 403 })
  }

  const currentTermGroupIds = selectedTerm
    ? (await prisma.classGroup.findMany({
        where: { termId: selectedTerm.id, deletedAt: null },
        select: { id: true },
      })).map((group) => group.id)
    : []
  const classroomFeedback = type === 'wxpusher_feedback'
    ? await prisma.classroomFeedback.findFirst({
        where: {
          studentIds: { has: student.id },
          status: 'PUBLISHED',
          deletedAt: null,
          ...(actorTeacherId ? { teacherId: actorTeacherId } : {}),
          ...(selectedTerm ? {
            OR: [
              { termId: selectedTerm.id },
              { classLesson: { group: { termId: selectedTerm.id } } },
              ...(currentTermGroupIds.length ? [{ feedbackGroupId: { in: currentTermGroupIds } }] : []),
            ],
          } : {}),
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      })
    : null

  if (type === 'wxpusher_feedback' && !classroomFeedback) {
    return NextResponse.json({ error: '该学员当前批次暂无已发布课堂反馈，请先发布教师评语再创建通知' }, { status: 409 })
  }

  const parentUserId = parent?.id || student.parentId || student.parentUserId
  const qywxExternalUserId = parent?.qywxExternalUserId
  const qywxSenderUserId = parent?.qywxSenderUserId

  let pushStatus = 'none'
  let pushError: string | null = null
  const feedbackHref = classroomFeedback
    ? `/parent/class-feedback/${classroomFeedback.id}?childId=${encodeURIComponent(student.id)}`
    : null
  const notificationTitle = type === 'wxpusher_feedback'
    ? `${student.name}同学课上状态反馈，请点击查看`
    : type === 'wxpusher_safe'
      ? '平安回家提醒'
      : title
  const notificationContent = type === 'wxpusher_feedback'
    ? `教师已更新${student.name}同学的课上状态反馈，请点击查看详情。`
    : type === 'wxpusher_safe'
      ? buildSafeHomeContent(student.name)
      : content

  if (qywxEnabled() && type !== 'system') {
    if (!qywxExternalUserId) {
      pushStatus = 'no_bind'
      pushError = '家长账号尚未绑定企微联系人；通知仍保存在家长端'
    } else if (!(qywxSenderUserId || process.env.QYWX_MASS_SENDER)) {
      pushStatus = 'failed'
      pushError = '未配置企微发送成员，通知已保存在家长端'
    } else {
      pushStatus = 'queued'
      pushError = '已加入企微汇总队列；任务创建后需由发送成员在企微群发助手手动确认'
    }
  } else if (type !== 'system') {
    pushError = '企微通道未开启；通知仍保存在家长端'
  }

  // Create notification record
  const notification = await createNotification(prisma, {
    userId: parentUserId || senderId,
    title: notificationTitle,
    content: notificationContent,
    type,
    studentId: student.id,
    senderId,
    pushStatus,
    pushError,
    ...(classroomFeedback ? {
      relatedType: 'CLASSROOM_FEEDBACK',
      relatedId: classroomFeedback.id,
      href: feedbackHref,
      link: feedbackHref,
    } : {}),
  })

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

  return NextResponse.json({ ...notification, pushStatus, pushError }, { status: 201 })
})
