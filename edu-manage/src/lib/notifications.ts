import type { Prisma } from '@prisma/client'

/**
 * 统一通知创建 service。
 * 所有业务方应通过 createNotification / createManyNotifications 创建通知，
 * 避免散落的 prisma.notification.create 造成类型/字段/截断不一致。
 *
 * 约定：
 * - title 截断 120 字符；content 截断 300 字符（空 content 落库为空串）
 * - type 默认 INFO；status 默认 ACTIVE（归档逻辑依赖该值）
 * - href / link 同步：未显式传 link 时取 href
 */

export type NotificationInput = {
  userId: string
  title: string
  content?: string | null
  type?: string
  href?: string | null
  link?: string | null
  relatedType?: string | null
  relatedId?: string | null
  studentId?: string | null
  senderId?: string | null
  /** 推送状态（'none' | 'pending' | 'sent' | 'failed'）；不传则由数据库默认 'none' */
  pushStatus?: string | null
  /** 首次创建时的推送原因或队列状态说明。 */
  pushError?: string | null
}

const MAX_TITLE = 120
const MAX_CONTENT = 300

// 结构化类型：任意 PrismaClient / 事务客户端（或仅含 notification 委托的对象）都满足
export type NotificationDb = {
  notification: Pick<Prisma.TransactionClient['notification'], 'create' | 'createMany'>
}

function toData(input: NotificationInput): Prisma.NotificationUncheckedCreateInput {
  const href = input.href ?? null
  return {
    userId: input.userId,
    type: input.type || 'INFO',
    title: String(input.title ?? '').slice(0, MAX_TITLE),
    content: input.content != null ? String(input.content).slice(0, MAX_CONTENT) : '',
    href,
    link: input.link ?? href,
    relatedType: input.relatedType ?? null,
    relatedId: input.relatedId ?? null,
    studentId: input.studentId ?? null,
    senderId: input.senderId ?? null,
    pushStatus: input.pushStatus ?? undefined,
    pushError: input.pushError ?? undefined,
    status: 'ACTIVE',
  }
}

export async function createNotification(db: NotificationDb, input: NotificationInput) {
  return db.notification.create({ data: toData(input) })
}

export async function createManyNotifications(db: NotificationDb, inputs: NotificationInput[]) {
  if (inputs.length === 0) return { count: 0 }
  return db.notification.createMany({ data: inputs.map(toData) })
}
