import type { PrismaClient } from '@prisma/client'
import { createManyNotifications } from '@/lib/notifications'

type RenewalAlertDb = Pick<PrismaClient, 'academicTerm' | 'renewalFollowUp' | 'user' | '$transaction'>

function startOfLocalDay(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export async function createRenewalTermAlerts(db: RenewalAlertDb, now = new Date()) {
  const start = startOfLocalDay(now)
  const end = new Date(start)
  end.setDate(end.getDate() + 45)
  const terms = await db.academicTerm.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { gte: start, lte: end },
      memberships: {
        some: { status: 'ACTIVE', student: { status: 'ACTIVE', deletedAt: null } },
      },
    },
    include: {
      memberships: {
        where: { status: 'ACTIVE', student: { status: 'ACTIVE', deletedAt: null } },
        select: { studentId: true, student: { select: { id: true, name: true } } },
      },
    },
  })

  let notified = 0
  for (const term of terms) {
    const admins = await db.user.findMany({
      where: { role: 'admin', status: 'active', division: term.division },
      select: { id: true },
    })
    if (admins.length === 0) continue

    for (const membership of term.memberships) {
      const followUp = await db.renewalFollowUp.upsert({
        where: { studentId_termId: { studentId: membership.studentId, termId: term.id } },
        create: { studentId: membership.studentId, termId: term.id },
        update: {},
        select: { id: true, status: true, reminderSentAt: true },
      })
      if (followUp.reminderSentAt || followUp.status === 'RENEWED' || followUp.status === 'NOT_RENEWING') continue

      const claimed = await db.$transaction(async (tx) => {
        const claim = await tx.renewalFollowUp.updateMany({
          where: { id: followUp.id, reminderSentAt: null, status: { notIn: ['RENEWED', 'NOT_RENEWING'] } },
          data: { reminderSentAt: now },
        })
        if (claim.count !== 1) return false
        await createManyNotifications(tx, admins.map((admin) => ({
          userId: admin.id,
          type: 'RENEWAL_TERM_END',
          title: `${membership.student.name}的课程批次将在 45 天内结束`,
          content: `${term.name}预计于 ${term.endDate.toLocaleDateString('zh-CN')} 结束，请联系家长了解后续学习和续费安排。`,
          relatedType: 'RENEWAL_FOLLOW_UP',
          relatedId: followUp.id,
          studentId: membership.studentId,
          href: `/renewals?termId=${encodeURIComponent(term.id)}&studentId=${encodeURIComponent(membership.studentId)}`,
          pushStatus: 'none',
        })))
        return true
      })
      if (claimed) notified += admins.length
    }
  }
  return { notified }
}
