import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import {
  DATA_ADMIN_ENTITIES,
  filterEditableFields,
  sanitizeDataAdminRecord,
  getSoftDeleteConfig,
  type EntityKey,
} from '@/lib/data-admin/entities'
import { createActivityLog, createDeletedRecord } from '@/lib/data-admin/entities-server'
import { getDynamicModel } from '@/lib/data-admin/dynamic-model'
import type { Prisma } from '@prisma/client'
import { softDeleteEntity, type TrashEntityType } from '@/lib/data-correction/trash'

const ALLOWED_ENTITIES = Object.keys(DATA_ADMIN_ENTITIES)

async function syncStudentHours(client: Pick<Prisma.TransactionClient, 'enrollment' | 'student'>, studentId: string) {
  const activeEnrollments = await client.enrollment.findMany({
    where: {
      studentId,
      status: 'ACTIVE',
      group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
    },
    select: { remainHours: true, totalHours: true },
  })
  const totalRemain = activeEnrollments.reduce((sum: number, enrollment: { remainHours: number | null }) => sum + Number(enrollment.remainHours || 0), 0)
  const totalAll = activeEnrollments.reduce((sum: number, enrollment: { totalHours: number | null }) => sum + Number(enrollment.totalHours || 0), 0)

  await client.student.update({
    where: { id: studentId },
    data: { remainHours: totalRemain, totalHours: totalAll },
  })
}

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
  const prisma = await getRequestPrisma()
  const prismaModel = getDynamicModel(prisma, def.model)
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  try {
    const record = await prismaModel.findUnique({ where: { id } })
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
  const prisma = await getRequestPrisma()
  const prismaModel = getDynamicModel(prisma, def.model)
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  try {
    const before = await prismaModel.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    const body = await req.json()
    const data = filterEditableFields(entityKey, body)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: '无有效字段可编辑' }, { status: 400 })
    }

    const record = entityKey === 'enrollments'
      ? await prisma.$transaction(async (tx) => {
          const enrollmentBefore = await tx.enrollment.findUnique({
            where: { id },
            select: { studentId: true },
          })
          const updated = await tx.enrollment.update({ where: { id }, data })
          const studentId = typeof data.studentId === 'string' ? data.studentId : enrollmentBefore?.studentId
          if (studentId) await syncStudentHours(tx, studentId)
          return updated
        })
      : await prismaModel.update({ where: { id }, data })

    await createActivityLog(session.user.id, 'DATA_ADMIN_UPDATE', def.model, id, {
      entity: def.model,
      entityId: id,
      before: sanitizeDataAdminRecord(before),
      after: sanitizeDataAdminRecord(record),
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
  const prisma = await getRequestPrisma()
  const prismaModel = getDynamicModel(prisma, def.model)
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const reason = body.reason || '管理员手动删除'

  try {
    const before = await prismaModel.findUnique({ where: { id } })
    if (!before) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    const trashTypeByEntity: Partial<Record<EntityKey, TrashEntityType>> = {
      students: 'Student', 'class-groups': 'ClassGroup', 'class-lessons': 'ClassLesson', 'exam-papers': 'ExamPaper', materials: 'StudyMaterial',
    }
    const trashType = trashTypeByEntity[entityKey]
    if (trashType) {
      const deleted = await softDeleteEntity(prisma, trashType, id, { id: session.user.id, name: session.user.name }, reason)
      return NextResponse.json({ success: true, message: '已移入回收站', deleted })
    }

    const softConfig = getSoftDeleteConfig(entityKey)

    if (softConfig) {
      await prismaModel.update({
        where: { id },
        data: { [softConfig.field]: softConfig.deletedValue },
      })
    } else if (entityKey === 'performance-posts') {
      await prismaModel.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
    } else {
      // For entities without soft delete, perform hard delete
      await prismaModel.delete({ where: { id } })
    }

    // Determine entity name for deleted record
    const entityName = (typeof before.name === 'string' ? before.name : null)
      || (typeof before.title === 'string' ? before.title : null)

    await createDeletedRecord(def.model, id, entityName, sanitizeDataAdminRecord(before), session.user.id, reason)
    await createActivityLog(session.user.id, 'DATA_ADMIN_SOFT_DELETE', def.model, id, {
      entity: def.model,
      entityId: id,
      entityName,
      reason,
    })

    return NextResponse.json({ success: true, message: '已删除' })
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
  const prisma = await getRequestPrisma()
  const prismaModel = getDynamicModel(prisma, def.model)
  if (!prismaModel) {
    return NextResponse.json({ error: '模型不存在' }, { status: 500 })
  }

  const body = await req.json()
  const action = body.action

  if (action === 'restore') {
    const softConfig = getSoftDeleteConfig(entityKey)

    if (!softConfig && entityKey !== 'performance-posts') {
      return NextResponse.json({ error: '该实体不支持恢复' }, { status: 400 })
    }

    try {
      const restoreData: Record<string, unknown> = {}
      if (softConfig) {
        restoreData[softConfig.field] = softConfig.activeValue
      }
      if (entityKey === 'performance-posts') {
        restoreData['deletedAt'] = null
      }

      const record = await prismaModel.update({ where: { id }, data: restoreData })
      await createActivityLog(session.user.id, 'DATA_ADMIN_RESTORE', def.model, id, {
        entity: def.model,
        entityId: id,
        restoredTo: softConfig?.activeValue || 'active',
      })

      return NextResponse.json({ success: true, data: sanitizeDataAdminRecord(record) })
    } catch (error) {
      console.error('data-admin PATCH restore error:', error)
      return NextResponse.json({ error: '恢复失败' }, { status: 500 })
    }
  }

  if (action === 'hour-adjustment') {
    const { studentId, enrollmentId, amount, reason: adjustmentReason } = body
    if (!studentId || amount === undefined || amount === null) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: '课时数无效' }, { status: 400 })
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.student.findFirst({ where: { id: studentId, deletedAt: null } })
        if (!student) throw new Error('STUDENT_NOT_FOUND')

        let beforeHours = Number(student.remainHours || 0)
        let afterHours = beforeHours

        if (enrollmentId) {
          const enrollment = await tx.enrollment.findFirst({
            where: { id: enrollmentId, studentId, deletedAt: null },
            select: { id: true, remainHours: true, totalHours: true },
          })
          if (!enrollment) throw new Error('ENROLLMENT_NOT_OWNED')
          beforeHours = Number(enrollment.remainHours || 0)

          const updated = await tx.enrollment.updateMany({
            where: {
              id: enrollmentId,
              studentId,
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
          afterHours = Number(afterEnrollment.remainHours || 0)
          await syncStudentHours(tx, studentId)
        } else {
          const updated = await tx.student.updateMany({
            where: {
              id: studentId,
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
          const afterStudent = await tx.student.findUniqueOrThrow({ where: { id: studentId } })
          afterHours = Number(afterStudent.remainHours || 0)
        }

        const reason = typeof adjustmentReason === 'string' && adjustmentReason.trim()
          ? adjustmentReason.trim()
          : '管理员手动调整'
        await tx.hourTransaction.create({
          data: {
            studentId,
            enrollmentId: enrollmentId || null,
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
            metadata: { studentId, enrollmentId: enrollmentId || null, amount, beforeHours, afterHours, reason },
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
