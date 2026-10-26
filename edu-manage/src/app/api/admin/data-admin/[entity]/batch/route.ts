import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import {
  DATA_ADMIN_ENTITIES,

  type EntityKey,
} from '@/lib/data-admin/entities'
import { DATA_ADMIN_BATCH_ENTITIES, mutateDataAdminRecord } from '@/lib/data-admin/mutations'
import { getDynamicModel } from '@/lib/data-admin/dynamic-model'
import { getRequestDivision } from '@/lib/division'
import { getDataAdminDivisionScope } from '@/lib/data-admin/division-scope'

const ALLOWED_ACTIONS = ['softDelete', 'restore', 'markRead'] as const
type BatchAction = typeof ALLOWED_ACTIONS[number]

const ALLOWED_ENTITIES = Object.keys(DATA_ADMIN_ENTITIES)
const BATCH_SUPPORTED_ENTITIES = new Set<EntityKey>(DATA_ADMIN_BATCH_ENTITIES)

function isBatchAction(action: unknown): action is BatchAction {
  return typeof action === 'string' && ALLOWED_ACTIONS.includes(action as BatchAction)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const prisma = await getRequestPrisma()

  const { entity } = await params
  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: '不支持的实体' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '请求内容必须为对象' }, { status: 400 })
  const { action, ids, reason } = body as { action?: unknown; ids?: unknown; reason?: unknown }

  if (!isBatchAction(action)) {
    return NextResponse.json({ error: '不支持的批量操作' }, { status: 400 })
  }
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'ids 必须是字符串数组' }, { status: 400 })
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: '请选择要操作的数据' }, { status: 400 })
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: '单次最多处理 100 条数据' }, { status: 400 })
  }
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 1000)) return NextResponse.json({ error: '操作原因须为1000字以内的文本' }, { status: 400 })

  const entityKey = entity as EntityKey
  if (action === 'markRead' && entityKey !== 'notifications') {
    return NextResponse.json({ error: '仅通知支持批量标记已读' }, { status: 400 })
  }
  if (action !== 'markRead' && !BATCH_SUPPORTED_ENTITIES.has(entityKey)) {
    return NextResponse.json({ error: '该类型暂不支持批量操作' }, { status: 400 })
  }

  const def = DATA_ADMIN_ENTITIES[entityKey]
  const prismaModel = getDynamicModel(prisma, def.model)
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  const uniqueIds = [...new Set(ids)]
  const recordScope = getDataAdminDivisionScope(entityKey, getRequestDivision(session.user))
  if (action === 'markRead') {
    try {
      const count = await prisma.$transaction(async (tx) => {
        const updated = await tx.notification.updateMany({ where: { id: { in: uniqueIds }, deletedAt: null, ...recordScope }, data: { read: true, readAt: new Date() } })
        await tx.activityLog.create({ data: { userId: session.user.id, action: 'DATA_ADMIN_BATCH_MARK_READ', entityType: 'Notification', detail: '批量标记通知已读', metadata: { ids: uniqueIds, count: updated.count } } })
        return updated.count
      })
      return NextResponse.json({ success: true, count, message: '已标记通知为已读' })
    } catch { return NextResponse.json({ error: '标记失败，请重试' }, { status: 500 }) }
  }
  const succeededIds: string[] = []
  const failures: Array<{ id: string; error: string }> = []
  for (const id of uniqueIds) {
    try {
      if (!await prismaModel.findUnique({ where: { id, ...recordScope } })) throw new Error('记录不存在或不在当前学部')
      await mutateDataAdminRecord(prisma, entityKey, id, action, session.user, typeof reason === 'string' ? reason : '管理员批量操作')
      succeededIds.push(id)
    } catch (error) { failures.push({ id, error: error instanceof Error ? error.message : '操作失败' }) }
  }
  return NextResponse.json({ success: failures.length === 0, partial: succeededIds.length > 0 && failures.length > 0, count: succeededIds.length, succeededIds, failures, message: '已完成 ' + succeededIds.length + ' 条，失败 ' + failures.length + ' 条' })
}
