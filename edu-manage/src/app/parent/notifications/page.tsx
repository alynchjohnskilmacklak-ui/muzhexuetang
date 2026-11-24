import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentNotificationsClient } from './client'
import {
  parentVisibleNotificationWhere,
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
  const parentNotificationScope = { AND: [parentVisibleNotificationWhere(userId)] }

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: archived
        ? { userId, status: 'ARCHIVED', deletedAt: null, ...parentNotificationScope }
        : { userId, ...visibleNotificationWhere, ...parentNotificationScope },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        relatedType: true,
        relatedId: true,
        href: true,
        title: true,
        content: true,
        createdAt: true,
        read: true,
      },
    }),
    db.notification.count({
      where: { userId, read: false, ...visibleNotificationWhere, ...parentNotificationScope },
    }),
  ])

  // 1. 反馈类通知：关联课堂反馈，取学科与老师信息用于前端展示
  const feedbackIds = notifications
    .filter((n) => ['CLASSROOM_FEEDBACK', 'PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE'].includes(n.relatedType || '') && n.relatedId)
    .map((n) => n.relatedId as string)

  // 2. 随堂互动通知：关联 ClassroomPick，取互动课次、学科、老师及作答信息
  const pickIds = notifications
    .filter((n) => n.relatedType === 'CLASSROOM_PICK' && n.relatedId)
    .map((n) => n.relatedId as string)

  // 3. 加载全校教师档案，以姓名和ID建立索引，保证头像、性别与等级标签绝对精准匹配
  const [feedbacks, picks, allTeachers] = await Promise.all([
    feedbackIds.length
      ? db.classroomFeedback.findMany({
          where: { id: { in: feedbackIds } },
          select: {
            id: true,
            teacherId: true,
            teacher: { select: { id: true, name: true, avatar: true, tierLevel: true, gender: true, subjects: true } },
            classLesson: {
              select: {
                subject: true,
                group: { select: { course: { select: { subject: true } } } },
              },
            },
          },
        })
      : [],
    pickIds.length
      ? db.classroomPick.findMany({
          where: { id: { in: pickIds } },
          select: {
            id: true,
            teacherId: true,
            result: true,
            comment: true,
            questionLabel: true,
            lesson: {
              select: {
                subject: true,
                teacher: { select: { id: true, name: true, avatar: true, tierLevel: true, gender: true, subjects: true } },
                group: { select: { course: { select: { subject: true } } } },
              },
            },
          },
        })
      : [],
    db.teacher.findMany({
      select: {
        id: true,
        name: true,
        gender: true,
        avatar: true,
        tierLevel: true,
        subjects: true,
      },
    }),
  ])

  const teacherByName = new Map(allTeachers.map((t) => [t.name.trim(), t]))
  const teacherById = new Map(allTeachers.map((t) => [t.id, t]))

  const feedbackInfoById = new Map(
    feedbacks.map((f) => {
      const dbTeacher = f.teacher || (f.teacherId ? teacherById.get(f.teacherId) : undefined)
      return [
        f.id,
        {
          teacherId: dbTeacher?.id ?? null,
          teacherName: dbTeacher?.name ?? null,
          teacherAvatar: dbTeacher?.avatar ?? null,
          teacherTier: dbTeacher?.tierLevel ?? null,
          teacherGender: dbTeacher?.gender ?? null,
          subject: f.classLesson?.subject ?? f.classLesson?.group?.course?.subject ?? (dbTeacher?.subjects ? dbTeacher.subjects.split(',')[0] : null),
        },
      ]
    }),
  )

  const pickInfoById = new Map(
    picks.map((p) => {
      const dbTeacher = p.lesson?.teacher || (p.teacherId ? teacherById.get(p.teacherId) : undefined)
      return [
        p.id,
        {
          teacherId: dbTeacher?.id ?? null,
          teacherName: dbTeacher?.name ?? null,
          teacherAvatar: dbTeacher?.avatar ?? null,
          teacherTier: dbTeacher?.tierLevel ?? null,
          teacherGender: dbTeacher?.gender ?? null,
          subject: p.lesson?.subject ?? p.lesson?.group?.course?.subject ?? (dbTeacher?.subjects ? dbTeacher.subjects.split(',')[0] : null),
          pickResult: p.result ?? null,
          pickComment: p.comment ?? null,
          questionLabel: p.questionLabel ?? null,
        },
      ]
    }),
  )

  const enriched = notifications.map((n) => {
    const feedbackInfo = n.relatedId ? feedbackInfoById.get(n.relatedId) : undefined
    const pickInfo = n.relatedId ? pickInfoById.get(n.relatedId) : undefined
    const info = feedbackInfo || pickInfo

    // 老师名称解析：优先使用关联信息，其次从通知标题提取（如"胡思同在课堂上提问了马紫晨"）
    let teacherName = info?.teacherName ?? null
    if (!teacherName && n.title) {
      const match = n.title.match(/^(.+?)(?:老师)?(?:在课堂上提问|随堂互动|发布了)/)
      if (match && match[1]) teacherName = match[1].replace(/老师$/, '').trim()
    }

    // 核心匹配：根据 teacherName 匹配真实 Teacher 档案，彻底解决头像、性别、评级不一致问题
    const matchedTeacher = (info?.teacherId ? teacherById.get(info.teacherId) : undefined)
      || (teacherName ? teacherByName.get(teacherName) : undefined)

    const finalTeacherName = matchedTeacher?.name ?? teacherName
    const finalTeacherAvatar = matchedTeacher?.avatar ?? info?.teacherAvatar ?? null
    const finalTeacherTier = matchedTeacher?.tierLevel ?? info?.teacherTier ?? null
    const finalTeacherGender = matchedTeacher?.gender ?? info?.teacherGender ?? null
    const finalSubject = info?.subject ?? (matchedTeacher?.subjects ? matchedTeacher.subjects.split(',')[0] : null)

    return {
      ...n,
      subject: finalSubject,
      teacherName: finalTeacherName,
      teacherAvatar: finalTeacherAvatar,
      teacherTier: finalTeacherTier,
      teacherGender: finalTeacherGender,
      pickResult: pickInfo?.pickResult ?? null,
      pickComment: pickInfo?.pickComment ?? null,
      questionLabel: pickInfo?.questionLabel ?? null,
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
