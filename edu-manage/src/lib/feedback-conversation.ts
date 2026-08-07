import type { PrismaClient } from '@prisma/client'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { notifyTeacherAboutParentMessage } from '@/lib/parent-message-notifications'

export async function createParentFeedbackMessage(params: {
  prisma: PrismaClient
  feedbackId: string
  parentId: string
  parentName: string
  content: string
}) {
  const content = params.content.trim().slice(0, 300)
  if (!content) throw new Error('MESSAGE_CONTENT_REQUIRED')

  const feedback = await params.prisma.classroomFeedback.findFirst({
    where: { id: params.feedbackId, status: 'PUBLISHED' },
    select: {
      id: true,
      teacherId: true,
      studentIds: true,
      classLesson: {
        select: {
          subject: true,
          group: { select: { course: { select: { subject: true } } } },
        },
      },
    },
  })
  if (!feedback) throw new Error('FEEDBACK_NOT_FOUND')

  const student = await params.prisma.student.findFirst({
    where: {
      id: { in: feedback.studentIds },
      ...parentLinkedStudentWhere(params.parentId),
    },
    select: { id: true, name: true },
  })
  if (!student) throw new Error('FEEDBACK_PARENT_FORBIDDEN')

  const subject = feedback.classLesson?.subject || feedback.classLesson?.group.course.subject || null
  return params.prisma.$transaction(async (tx) => {
    const now = new Date()
    const conversation = await tx.parentMessage.upsert({
      where: {
        feedbackId_parentId: { feedbackId: feedback.id, parentId: params.parentId },
      },
      create: {
        parentId: params.parentId,
        studentId: student.id,
        teacherId: feedback.teacherId,
        feedbackId: feedback.id,
        subject,
        title: `${student.name}的课堂反馈留言`,
        status: 'OPEN',
        replies: {
          create: {
            authorId: params.parentId,
            authorName: params.parentName || '家长',
            role: 'parent',
            content,
            isReadByParent: true,
            isReadByTeacher: false,
          },
        },
      },
      update: {
        studentId: student.id,
        teacherId: feedback.teacherId,
        subject,
        status: 'OPEN',
        updatedAt: now,
        replies: {
          create: {
            authorId: params.parentId,
            authorName: params.parentName || '家长',
            role: 'parent',
            content,
            isReadByParent: true,
            isReadByTeacher: false,
          },
        },
      },
      include: {
        parent: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        replies: { orderBy: { createdAt: 'asc' } },
      },
    })

    await tx.classroomFeedback.update({
      where: { id: feedback.id },
      data: { parentReply: content, parentRepliedAt: now },
    })

    await notifyTeacherAboutParentMessage(tx, {
      teacherId: feedback.teacherId,
      messageId: conversation.id,
      parentName: params.parentName || '家长',
      studentId: student.id,
      studentName: student.name,
      senderId: params.parentId,
    })

    return conversation
  })
}
