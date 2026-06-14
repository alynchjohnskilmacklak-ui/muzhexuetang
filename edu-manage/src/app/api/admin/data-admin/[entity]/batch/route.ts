import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  DATA_ADMIN_ENTITIES,
  getSoftDeleteConfig,
  type EntityKey,
} from '@/lib/data-admin/entities'
import { createActivityLog } from '@/lib/data-admin/entities-server'

const ALLOWED_ACTIONS = ['softDelete', 'restore', 'markRead'] as const
type BatchAction = typeof ALLOWED_ACTIONS[number]

const ALLOWED_ENTITIES = Object.keys(DATA_ADMIN_ENTITIES)
const BATCH_SUPPORTED_ENTITIES = new Set<EntityKey>([
  'students',
  'teachers',
  'class-groups',
  'class-lessons',
  'exam-papers',
  'notifications',
  'materials',
  'performance-posts',
])

function isBatchAction(action: unknown): action is BatchAction {
  return typeof action === 'string' && ALLOWED_ACTIONS.includes(action as BatchAction)
}

function logActionName(action: BatchAction) {
  if (action === 'softDelete') return 'DATA_ADMIN_BATCH_SOFT_DELETE'
  if (action === 'restore') return 'DATA_ADMIN_BATCH_RESTORE'
  return 'DATA_ADMIN_BATCH_MARK_READ'
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { entity } = await params
  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: '不支持的实体' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
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

  const entityKey = entity as EntityKey
  if (action === 'markRead' && entityKey !== 'notifications') {
    return NextResponse.json({ error: '仅通知支持批量标记已读' }, { status: 400 })
  }
  if (action !== 'markRead' && !BATCH_SUPPORTED_ENTITIES.has(entityKey)) {
    return NextResponse.json({ error: '该类型暂不支持批量操作' }, { status: 400 })
  }

  const def = DATA_ADMIN_ENTITIES[entityKey]
  const prismaModel = (prisma as any)[def.model]
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  const uniqueIds = [...new Set(ids)]
  const softConfig = getSoftDeleteConfig(entityKey)
  const data: Record<string, unknown> = {}

  if (action === 'softDelete') {
    if (entityKey === 'performance-posts') {
      data.deletedAt = new Date()
    } else if (softConfig) {
      data[softConfig.field] = softConfig.deletedValue
    } else {
      return NextResponse.json({ error: '该类型暂不支持批量操作' }, { status: 400 })
    }
  }

  if (action === 'restore') {
    if (entityKey === 'performance-posts') {
      data.deletedAt = null
    } else if (softConfig) {
      data[softConfig.field] = softConfig.activeValue
    } else {
      return NextResponse.json({ error: '该类型暂不支持批量恢复' }, { status: 400 })
    }
  }

  if (action === 'markRead') {
    data.read = true
    data.readAt = new Date()
  }

  try {
    const result = await prismaModel.updateMany({
      where: { id: { in: uniqueIds } },
      data,
    })

    await createActivityLog(session.user.id, logActionName(action), def.model, uniqueIds[0], {
      entity,
      ids: uniqueIds,
      count: result.count,
      reason: typeof reason === 'string' ? reason : undefined,
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `已处理 ${result.count} 条数据`,
    })
  } catch (error) {
    console.error('data-admin batch error:', error)
    return NextResponse.json({ error: '批量操作失败' }, { status: 500 })
  }
}
