import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { resolveUserForTeacher } from '@/lib/teacher-account-binding'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

const REMINDER_COOLDOWN_MS = 15 * 60 * 1000

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const body = await req.json().catch(() => ({}))
  const { teacherId, lessonId, lessonInfo } = body
  if (!teacherId) return NextResponse.json({ error: '缺少 teacherId' }, { status: 400 })

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, name: true },
  })
  if (!teacher) return NextResponse.json({ error: '教师不存在' }, { status: 404 })

  const teacherAccount = await resolveUserForTeacher(prisma, teacherId)
  if (!teacherAccount) {
    return NextResponse.json({ error: '未找到可接收提醒的教师账号' }, { status: 400 })
  }

  const recentReminder = await prisma.notification.findFirst({
    where: {
      userId: teacherAccount.id,
      type: 'CLASSROOM_FEEDBACK_REMINDER',
      ...(lessonId ? { relatedId: lessonId } : {}),
      createdAt: { gte: new Date(Date.now() - REMINDER_COOLDOWN_MS) },
    },
    select: { id: true },
  })

  if (recentReminder) {
    return NextResponse.json({
      reminded: false,
      message: '15分钟内已经提醒过该教师，请勿重复催促。',
    })
  }

  const desc = lessonInfo || '您有结课考勤已完成的课程尚未提交随堂成长反馈'
  await prisma.$transaction(async (tx) => {
    await createNotification(tx, {
      userId: teacherAccount.id,
      senderId: user.id,
      type: 'CLASSROOM_FEEDBACK_REMINDER',
      title: '教研主管提醒您及时提交随堂反馈',
      content: `${teacher.name}老师，${desc}，家长正关注孩子的课堂动态，请及时填写。`,
      link: '/teacher/feedback',
      relatedType: 'CLASS_LESSON',
      relatedId: lessonId || null,
      href: lessonId ? `/teacher/feedback?lessonId=${lessonId}` : '/teacher/feedback',
    })
  })

  return NextResponse.json({
    reminded: true,
    message: `已向${teacher.name}老师发送随堂反馈催办提醒。`,
  })
})
