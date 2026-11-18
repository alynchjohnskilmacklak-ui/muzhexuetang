import type { Prisma } from '@prisma/client'
import { createManyNotifications } from '@/lib/notifications'

type CourseChangeInput = {
  eventType: string
  actorUserId: string
  groupId?: string | null
  lessonIds: string[]
  studentIds: string[]
  title: string
  summary: string
  href?: string
  notifyParents?: boolean
}

export async function recordCourseChangeEvent(tx: Prisma.TransactionClient, input: CourseChangeInput) {
  const students = input.studentIds.length
    ? await tx.student.findMany({
        where: { id: { in: [...new Set(input.studentIds)] } },
        select: { id: true, name: true, parentId: true, parentUserId: true },
      })
    : []
  const recipients = new Map<string, typeof students>()
  for (const student of input.notifyParents === false ? [] : students) {
    const parentUserId = student.parentId || student.parentUserId
    if (!parentUserId) continue
    const current = recipients.get(parentUserId) || []
    current.push(student)
    recipients.set(parentUserId, current)
  }

  const event = await tx.courseChangeEvent.create({
    data: {
      eventType: input.eventType,
      actorUserId: input.actorUserId,
      groupId: input.groupId || null,
      lessonIds: [...new Set(input.lessonIds)],
      studentIds: [...new Set(input.studentIds)],
      title: input.title,
      summary: input.summary,
      recipientCount: recipients.size,
      notificationCount: recipients.size,
    },
  })

  if (recipients.size) {
    await createManyNotifications(tx, [...recipients].map(([parentUserId, rows]) => ({
      userId: parentUserId,
      type: 'SCHEDULE_CHANGE',
      title: input.title,
      content: `${rows.map((student) => student.name).join('、')}：${input.summary}`.slice(0, 300),
      studentId: rows.length === 1 ? rows[0].id : null,
      href: input.href || '/parent/schedule',
      relatedType: 'COURSE_CHANGE_EVENT',
      relatedId: event.id,
    })))
  }

  return { event, recipientCount: recipients.size, notificationCount: recipients.size }
}
