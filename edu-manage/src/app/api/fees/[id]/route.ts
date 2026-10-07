import { NextRequest, NextResponse } from 'next/server'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { revalidatePath } from 'next/cache'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { requireFeeAdminScope } from '@/lib/fee-admin-scope'
import { AuthError } from '@/lib/auth/guards'
import { randomUUID } from 'crypto'
import { TRASH_RETENTION_DAYS } from '@/lib/data-correction/trash'

export const dynamic = 'force-dynamic'

async function requestFeePrisma(req: NextRequest) {
  const requestedDivision = new URL(req.url).searchParams.get('division')
  const scope = await requireFeeAdminScope(requestedDivision)
  if (scope.division === 'all') throw new AuthError('收费记录操作必须指定学部', 400)
  const db = isDualDbEnabled() ? getPrismaForDivision(scope.division) : await getRequestPrisma()
  return { ...scope, db }
}

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { db, user } = await requestFeePrisma(req)
  const { id } = await params
  const body = await req.json()

  const existing = await db.fee.findFirst({ where: { id, deletedAt: null } })
  const selectedTerm = existing ? await resolveAdminTermScope(db, existing.division, req) : null
  if (existing && (!selectedTerm || selectedTerm.status !== 'ACTIVE' || existing.termId !== selectedTerm.id)) {
    return NextResponse.json({ error: '只能修改当前已启用运营批次的收费记录' }, { status: 409 })
  }
  if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  const { amount, type, hours, campus, operator, notes, paidAt, courseId, studentId } = body

  if (amount !== undefined && (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0)) {
    return NextResponse.json({ error: '金额必须 >= 0' }, { status: 400 })
  }
  if (hours !== undefined && hours !== null && (typeof hours !== 'number' || !Number.isFinite(hours) || hours < 0)) {
    return NextResponse.json({ error: '课时数必须 >= 0' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof amount === 'number') data.amount = amount
  if (typeof type === 'string') data.type = type
  if (hours !== undefined) data.hours = hours
  if (campus !== undefined) data.campus = campus
  if (operator !== undefined) data.operator = operator
  if (notes !== undefined) data.notes = notes
  if (paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null
  if (courseId !== undefined) data.courseId = courseId
  if (studentId !== undefined) {
    const student = await db.student.findFirst({
      where: {
        id: studentId,
        division: existing.division,
        termMemberships: { some: { termId: selectedTerm!.id, status: 'ACTIVE' } },
      },
      select: { id: true },
    })
    if (!student) return NextResponse.json({ error: '学生不存在' }, { status: 404 })
    data.studentId = studentId
  }

  const updated = await db.$transaction(async (tx) => {
    const record = await tx.fee.update({ where: { id }, data })
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: '编辑收费记录',
        entityType: 'Fee',
        entityId: id,
        detail: `${existing.studentId} ¥${existing.amount} → ¥${amount ?? existing.amount}`,
      },
    })
    return record
  })

  revalidatePath('/fees')
  return NextResponse.json(updated)
})

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { db, user } = await requestFeePrisma(req)
  const { id } = await params

  const existing = await db.fee.findFirst({
    where: { id, deletedAt: null },
    include: { student: { select: { name: true } } },
  })
  const selectedTerm = existing ? await resolveAdminTermScope(db, existing.division, req) : null
  if (existing && (!selectedTerm || selectedTerm.status !== 'ACTIVE' || existing.termId !== selectedTerm.id)) {
    return NextResponse.json({ error: '只能删除当前已启用运营批次的收费记录' }, { status: 409 })
  }
  if (!existing) return NextResponse.json({ error: '记录不存在' }, { status: 404 })

  const deletedAt = new Date()
  const deletionBatchId = randomUUID()
  const expiresAt = new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 86_400_000)
  await db.$transaction(async (tx) => {
    await tx.fee.update({ where: { id }, data: { deletedAt, deletionBatchId } })
    await tx.deletedRecord.create({
      data: {
        entityType: 'CleanupBatch',
        entityId: deletionBatchId,
        entityName: `收费记录：${existing.student?.name || existing.studentId} ¥${existing.amount}`,
        payload: {
          categories: ['fee'],
          scope: { division: existing.division, termId: existing.termId, studentId: existing.studentId, feeId: id },
        },
        deletedById: user.id,
        reason: '管理员删除收费记录',
        deletionBatchId,
        termId: existing.termId,
        impact: { total: 1, summary: '1 条收费记录' },
        expiresAt,
      },
    })
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: 'SOFT_DELETE',
        entityType: 'Fee',
        entityId: id,
        detail: `${existing.student?.name || existing.studentId} ¥${existing.amount} 已进入回收站`,
        metadata: { deletionBatchId },
      },
    })
  })

  revalidatePath('/fees')
  return NextResponse.json({ success: true })
})
