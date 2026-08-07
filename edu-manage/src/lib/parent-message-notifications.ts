import type { Prisma } from '@prisma/client'
import { resolveUserForTeacher } from '@/lib/teacher-account-binding'

type NotificationClient = Pick<Prisma.TransactionClient, 'notification' | 'user' | 'teacher'>

export async function notifyTeacherAboutParentMessage(
  prisma: NotificationClient,
  params: {
    teacherId: string
    messageId: string
    parentName: string
    studentId: string | null
    studentName: string | null
    senderId?: string
  },
) {
  const teacherAccount = await resolveUserForTeacher(prisma, params.teacherId)
  if (!teacherAccount) {
    console.error('[parent-message:teacher-account-not-found]', {
      teacherId: params.teacherId,
      messageId: params.messageId,
    })
    return null
  }

  return prisma.notification.create({
    data: {
      userId: teacherAccount.id,
      senderId: params.senderId,
      studentId: params.studentId,
      type: 'PARENT_MESSAGE',
      title: '家长发来了新留言',
      content: params.studentName
        ? `${params.parentName}就${params.studentName}的情况发来了留言，请及时查看并回复。`
        : `${params.parentName}发来了留言，请及时查看并回复。`,
      link: '/teacher/messages',
      href: '/teacher/messages',
      relatedType: 'PARENT_MESSAGE',
      relatedId: params.messageId,
    },
  })
}

export async function notifyParentAboutMessageReply(
  prisma: NotificationClient,
  params: {
    parentId: string
    messageId: string
    replierName: string
    replierRole: 'teacher' | 'admin'
    studentId: string | null
    senderId?: string
  },
) {
  const roleLabel = params.replierRole === 'admin' ? '管理员' : '老师'
  return prisma.notification.create({
    data: {
      userId: params.parentId,
      senderId: params.senderId,
      studentId: params.studentId,
      type: 'PARENT_MESSAGE_REPLY',
      title: `${roleLabel}回复了您的留言`,
      content: `${params.replierName || roleLabel}已回复，请进入“我的留言”查看。`,
      link: '/parent/messages',
      href: '/parent/messages',
      relatedType: 'PARENT_MESSAGE',
      relatedId: params.messageId,
    },
  })
}
