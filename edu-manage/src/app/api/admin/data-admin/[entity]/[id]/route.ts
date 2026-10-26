import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import {
  DATA_ADMIN_ENTITIES,
  filterEditableFields,
  sanitizeDataAdminRecord,

  type EntityKey,
} from '@/lib/data-admin/entities'
import { getRequestDivision } from '@/lib/division'
import { getDataAdminDivisionScope } from '@/lib/data-admin/division-scope'
import { mutateDataAdminRecord, DATA_ADMIN_TRASH_TYPES } from '@/lib/data-admin/mutations'
import { getDynamicModel } from '@/lib/data-admin/dynamic-model'
import { syncStudentHourSnapshot } from '@/lib/student-hour-snapshot'


const ALLOWED_ENTITIES = Object.keys(DATA_ADMIN_ENTITIES)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { entity, id } = await params
  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: '不支持的实体' }, { status: 400 })
  }

  const entityKey = entity as EntityKey
  const def = DATA_ADMIN_ENTITIES[entityKey]
  const division = getRequestDivision(session.user)
  const recordScope = getDataAdminDivisionScope(entityKey, division)
  const prisma = await getRequestPrisma()
  const prismaModel = getDynamicModel(prisma, def.model)
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  try {
    const record = await prismaModel.findUnique({ where: { id, ...recordScope } })
    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: sanitizeDataAdminRecord(record) })
  } catch (error) {
    console.error('data-admin GET by id error:', error)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { entity, id } = await params
  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: '不支持的实体' }, { status: 400 })
  }

  const entityKey = entity as EntityKey
  const def = DATA_ADMIN_ENTITIES[entityKey]
  const division = getRequestDivision(session.user)
  const recordScope = getDataAdminDivisionScope(entityKey, division)
  const prisma = await getRequestPrisma()
  const prismaModel = getDynamicModel(prisma, def.model)
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  try {
    const before = await prismaModel.findUnique({ where: { id, ...recordScope } })
    if (!before) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '请求内容格式无效' }, { status: 400 })
    let data: Record<string, unknown>
    try { data = filterEditableFields(entityKey, body) }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '字段校验失败' }, { status: 400 }) }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: '无有效字段可编辑' }, { status: 400 })
    }

    const record = await prisma.$transaction(async tx => {
      const model = getDynamicModel(tx, def.model)
      if (!model) throw new Error('模型不存在')
      const updated = await model.update({ where: { id, ...recordScope }, data })
      await tx.activityLog.create({ data: {
        userId: session.user.id, action: 'DATA_ADMIN_UPDATE', entityType: def.model, entityId: id,
        detail: '数据管理安全字段修正',
        metadata: JSON.parse(JSON.stringify({ before: sanitizeDataAdminRecord(before), after: sanitizeDataAdminRecord(updated) })),
      } })
      return updated
    })

    return NextResponse.json({ success: true, data: sanitizeDataAdminRecord(record) })
  } catch (error) {
    console.error('data-admin PUT error:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { entity, id } = await params
  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: '不支持的实体' }, { status: 400 })
  }

  const entityKey = entity as EntityKey
  const def = DATA_ADMIN_ENTITIES[entityKey]
  const division = getRequestDivision(session.user)
  const recordScope = getDataAdminDivisionScope(entityKey, division)
  const prisma = await getRequestPrisma()
  const prismaModel = getDynamicModel(prisma, def.model)
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '请求内容必须为对象' }, { status: 400 })
  if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 1000)) return NextResponse.json({ error: '删除原因须为1000字以内的文本' }, { status: 400 })
  const reason = body.reason || '管理员手动删除'

  try {
    const before = await prismaModel.findUnique({ where: { id, ...recordScope } })
    if (!before) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    if (!DATA_ADMIN_TRASH_TYPES[entityKey]) return NextResponse.json({ error: '请到对应业务页面处理，此处不支持底层删除' }, { status: 409 })
    const deleted = await mutateDataAdminRecord(prisma, entityKey, id, 'softDelete', session.user, reason)
    return NextResponse.json({ success: true, message: '已移入回收站', deleted })
  } catch (error) {
    console.error('data-admin DELETE error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { entity, id } = await params
  if (!ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: '不支持的实体' }, { status: 400 })
  }

  const entityKey = entity as EntityKey
  const def = DATA_ADMIN_ENTITIES[entityKey]
  const division = getRequestDivision(session.user)
  const recordScope = getDataAdminDivisionScope(entityKey, division)
  const prisma = await getRequestPrisma()
  const prismaModel = getDynamicModel(prisma, def.model)
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: '请求内容必须为对象' }, { status: 400 })
  const action = body.action

  if (action === 'restore') {
    try {
      if (!await prismaModel.findUnique({ where: { id, ...recordScope } })) return NextResponse.json({ error: '记录不存在或不在当前学部' }, { status: 404 })
      await mutateDataAdminRecord(prisma, entityKey, id, 'restore', session.user, '管理员恢复')
      return NextResponse.json({ success: true, message: '已恢复记录及关联数据' })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : '恢复失败' }, { status: 409 })
    }
  }

  if (action === 'hour-adjustment') {
    if (entityKey !== 'enrollments') return NextResponse.json({ error: '课时调整请使用报名课时操作' }, { status: 400 })
    const { studentId, enrollmentId, amount, reason: adjustmentReason } = body
    if (!studentId || typeof enrollmentId !== 'string' || !enrollmentId || amount === undefined || amount === null) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: '课时数无效' }, { status: 400 })
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.student.findFirst({ where: { id: studentId, deletedAt: null, division } })
        if (!student) throw new Error('STUDENT_NOT_FOUND')

        const enrollment = await tx.enrollment.findFirst({
          where: {
            id: enrollmentId,
            studentId,
            status: 'ACTIVE',
            deletedAt: null,
            group: { status: { not: 'ARCHIVED' }, deletedAt: null, course: { isActive: true, deletedAt: null } },
          },
          select: { id: true, remainHours: true, totalHours: true },
        })
        if (!enrollment) throw new Error('ENROLLMENT_NOT_OWNED')
        const beforeHours = Number(enrollment.remainHours || 0)

        const updated = await tx.enrollment.updateMany({
          where: {
            id: enrollmentId,
            studentId,
            status: 'ACTIVE',
            deletedAt: null,
            ...(amount < 0 ? {
              remainHours: { gte: Math.abs(amount) },
              totalHours: { gte: Math.abs(amount) },
            } : {}),
          },
          data: {
            remainHours: { increment: amount },
            totalHours: { increment: amount },
          },
        })
        if (updated.count !== 1) throw new Error('INSUFFICIENT_HOURS')
        const afterEnrollment = await tx.enrollment.findUniqueOrThrow({ where: { id: enrollmentId } })
        const afterHours = Number(afterEnrollment.remainHours || 0)
        await syncStudentHourSnapshot(tx, studentId)

        const reason = typeof adjustmentReason === 'string' && adjustmentReason.trim()
          ? adjustmentReason.trim()
          : '管理员手动调整'
        await tx.hourTransaction.create({
          data: {
            studentId,
            enrollmentId,
            amount,
            beforeHours,
            afterHours,
            type: amount > 0 ? 'ADMIN_ADD' : 'ADMIN_DEDUCT',
            reason,
            operatorId: session.user.id,
          },
        })
        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            action: 'HOUR_ADJUSTMENT',
            entityType: 'Student',
            entityId: studentId,
            detail: `${student.name} 课时 ${beforeHours} → ${afterHours}`,
            metadata: { studentId, enrollmentId, amount, beforeHours, afterHours, reason },
          },
        })
        return { beforeHours, afterHours }
      })

      return NextResponse.json({
        success: true,
        message: `课时已${amount > 0 ? '增加' : '减少'}${Math.abs(amount)}`,
        ...result,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'STUDENT_NOT_FOUND') {
        return NextResponse.json({ error: '学员不存在' }, { status: 404 })
      }
      if (error instanceof Error && error.message === 'ENROLLMENT_NOT_OWNED') {
        return NextResponse.json({ error: '报名记录不存在或不属于该学员' }, { status: 400 })
      }
      if (error instanceof Error && error.message === 'INSUFFICIENT_HOURS') {
        return NextResponse.json({ error: '课时余额不足，不能扣为负数' }, { status: 409 })
      }
      console.error('data-admin PATCH hour-adjustment error:', error)
      return NextResponse.json({ error: '课时调整失败' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: '不支持的操作' }, { status: 400 })
}
