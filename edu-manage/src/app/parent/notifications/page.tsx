import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentNotificationsClient } from './client'
import {
  visibleNotificationWhere,
} from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentNotificationsPage({ searchParams }: { searchParams?: Promise<{ archived?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()
  const query = await searchParams
  const archived = query?.archived === '1'

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: archived
        ? { userId, status: 'ARCHIVED', deletedAt: null }
        : { userId, ...visibleNotificationWhere },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.notification.count({
      where: { userId, read: false, ...visibleNotificationWhere },
    }),
  ])

  // 反馈类通知：关联课堂反馈，取学科用于前端展示学科徽标
  const feedbackIds = notifications
    .filter((n) => ['CLASSROOM_FEEDBACK', 'PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE'].includes(n.relatedType || '') && n.relatedId)
    .map((n) => n.relatedId as string)
  const feedbacks = feedbackIds.length
    ? await db.classroomFeedback.findMany({
        where: { id: { in: feedbackIds } },
        select: {
          id: true,
          teacher: { select: { name: true, avatar: true, tierLevel: true, gender: true } },
          classLesson: { select: { group: { select: { course: { select: { subject: true } } } } } },
        },
      })
    : []
  const feedbackInfoById = new Map(
    feedbacks.map((f) => [
      f.id,
      {
        teacherName: f.teacher?.name ?? null,
        teacherAvatar: f.teacher?.avatar ?? null,
        teacherTier: f.teacher?.tierLevel ?? null,
        teacherGender: f.teacher?.gender ?? null,
        subject: f.classLesson?.group?.course?.subject ?? null,
      },
    ]),
  )

  const enriched = notifications.map((n) => {
    const info = n.relatedId ? feedbackInfoById.get(n.relatedId) : undefined
    return {
      ...n,
      subject: info?.subject ?? null,
      teacherName: info?.teacherName ?? null,
      teacherAvatar: info?.teacherAvatar ?? null,
      teacherTier: info?.teacherTier ?? null,
      teacherGender: info?.teacherGender ?? null,
    }
  })

  return (
    <ParentNotificationsClient
      notifications={JSON.parse(JSON.stringify(enriched))}
      unreadCount={unreadCount}
      userId={userId}
      archived={archived}
    />
  )
}
