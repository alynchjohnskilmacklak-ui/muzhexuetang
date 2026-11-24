import type { PrismaClient } from '@prisma/client'
import { createManyNotifications } from '@/lib/notifications'
import { qywxEnabled } from '@/lib/qywx'

type OverdueFeeDb = Pick<PrismaClient, 'notifyConfig' | 'fee' | 'user' | '$transaction'>

export async function createOverdueFeeAlerts(db: OverdueFeeDb, now = new Date()) {
  const config = await db.notifyConfig.findUnique({
    where: { id: 'singleton' },
    select: { overdueFeeAlert: true },
  })
  if (!(config?.overdueFeeAlert ?? true)) return { notified: 0, unbound: 0 }
  const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => Number(todayParts.find(item => item.type === type)?.value || 0)
  const overdueBefore = new Date(Date.UTC(part('year'), part('month') - 1, part('day')) - 8 * 60 * 60 * 1000)

  const overdueFees = await db.fee.findMany({
    where: {
      status: 'pending',
      dueDate: { lt: overdueBefore },
      overdueNotifiedAt: null,
      deletedAt: null,
    },
    include: {
      student: { select: { id: true, name: true, division: true, parentId: true, parentUserId: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 200,
  })

  let notified = 0
  let unbound = 0
  for (const fee of overdueFees) {
    const parentCandidateId = fee.student.parentId || fee.student.parentUserId
    const parent = parentCandidateId
      ? await db.user.findFirst({
          where: { id: parentCandidateId, role: 'parent', status: 'active' },
          select: { id: true },
        })
      : null
    const admins = parent ? [] : await db.user.findMany({
      where: { role: 'admin', status: 'active', division: fee.student.division },
      select: { id: true },
    })
    const recipients = parent ? [{ id: parent.id, role: 'parent' as const }] : admins.map((admin) => ({ id: admin.id, role: 'admin' as const }))
    if (recipients.length === 0) continue

    const created = await db.$transaction(async (tx) => {
      const claim = await tx.fee.updateMany({
        where: { id: fee.id, status: 'pending', dueDate: { lt: overdueBefore }, overdueNotifiedAt: null, deletedAt: null },
        data: { overdueNotifiedAt: now },
      })
      if (claim.count !== 1) return false

      await createManyNotifications(tx, recipients.map((recipient) => ({
        userId: recipient.id,
        type: recipient.role === 'parent' ? 'FEE_OVERDUE' : 'FEE_OVERDUE_UNBOUND',
        title: recipient.role === 'parent' ? `${fee.student.name}有一笔费用已逾期` : '有一笔逾期费用需要联系家长',
        content: `${fee.student.name}的${fee.type} ¥${fee.amount.toFixed(2)} 已超过缴费期限，请${recipient.role === 'parent' ? '尽快联系管理人员核对缴费' : '联系家长跟进'}。`,
        relatedType: 'FEE_OVERDUE',
        relatedId: fee.id,
        studentId: fee.student.id,
        href: recipient.role === 'parent' ? '/parent/fees' : `/fees?studentId=${encodeURIComponent(fee.student.id)}`,
        pushStatus: recipient.role === 'parent' && qywxEnabled() ? 'queued' : 'none',
      })))
      return true
    })

    if (created) {
      notified += parent ? 1 : admins.length
      if (!parent) unbound += 1
    }
  }

  return { notified, unbound }
}
