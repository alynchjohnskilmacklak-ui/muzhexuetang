import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'
import { requireFeeAdminScope } from '@/lib/fee-admin-scope'

export const dynamic = 'force-dynamic'
const CATEGORIES = new Set(['RENT', 'SALARY', 'SUPPLIES', 'UTILITIES', 'OTHER'])

async function scopedDbs(division: string, userDivision: string) {
  if (division === 'all' && isDualDbEnabled()) return [getPrismaForDivision('JUNIOR'), getPrismaForDivision('SENIOR')]
  if (isDualDbEnabled()) return [getPrismaForDivision((division === 'all' ? userDivision : division) as 'JUNIOR' | 'SENIOR')]
  return [await getRequestPrisma()]
}

export const GET = apiHandler(async (request: NextRequest) => {
  const { user, division } = await requireFeeAdminScope(request.nextUrl.searchParams.get('division'))
  const dbs = await scopedDbs(division, user.division)
  const [expenses, sums] = await Promise.all([
    Promise.all(dbs.map(db => db.operatingExpense.findMany({ where: { deletedAt: null, ...(division === 'all' ? {} : { division }) }, orderBy: { occurredAt: 'desc' }, take: 200 }))).then(rows => rows.flat().sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 200)),
    Promise.all(dbs.map(db => db.operatingExpense.findMany({ where: { deletedAt: null, occurredAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1) }, ...(division === 'all' ? {} : { division }) }, select: { amount: true, occurredAt: true } }))).then(rows => rows.flat()),
  ])
  const monthlyMap = new Map<string, number>()
  for (const item of sums) {
    const key = item.occurredAt.toISOString().slice(0, 7)
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + item.amount)
  }
  return NextResponse.json({ expenses, monthly: [...monthlyMap].map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 })).sort((a, b) => a.month.localeCompare(b.month)), division })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const { user, division } = await requireFeeAdminScope(request.nextUrl.searchParams.get('division'))
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const category = typeof body?.category === 'string' ? body.category : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const amount = typeof body?.amount === 'number' ? body.amount : Number(body?.amount)
  const occurredAtRaw = typeof body?.occurredAt === 'string' ? body.occurredAt : ''
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : ''
  if (!CATEGORIES.has(category) || !description || description.length > 120 || !Number.isFinite(amount) || amount <= 0 || amount > 100_000_000 || !/^\d{4}-\d{2}-\d{2}$/.test(occurredAtRaw) || notes.length > 1000) {
    return NextResponse.json({ error: '请填写有效类别、用途、金额和日期' }, { status: 400 })
  }
  const occurredAt = new Date(`${occurredAtRaw}T00:00:00.000Z`)
  if (Number.isNaN(occurredAt.getTime()) || occurredAt.toISOString().slice(0, 10) !== occurredAtRaw) return NextResponse.json({ error: '支出日期无效' }, { status: 400 })
  const targetDivision = division === 'all' ? user.division : division
  const db = isDualDbEnabled() ? getPrismaForDivision(targetDivision as 'JUNIOR' | 'SENIOR') : await getRequestPrisma()
  const expense = await db.operatingExpense.create({ data: { division: targetDivision, category, description, amount, occurredAt, notes: notes || null, createdById: user.id } })
  await db.activityLog.create({ data: { userId: user.id, action: '登记经营支出', detail: `${category} · ${description} · ¥${amount.toFixed(2)}`, entityType: 'OperatingExpense', entityId: expense.id } })
  return NextResponse.json({ expense }, { status: 201 })
})

export const DELETE = apiHandler(async (request: NextRequest) => {
  const { user, division } = await requireFeeAdminScope(request.nextUrl.searchParams.get('division'))
  const id = request.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: '缺少支出记录编号' }, { status: 400 })
  const dbs = await scopedDbs(division, user.division)
  for (const db of dbs) {
    const existing = await db.operatingExpense.findFirst({ where: { id, deletedAt: null, ...(division === 'all' ? {} : { division }) }, select: { description: true, amount: true } })
    if (!existing) continue
    const changed = await db.operatingExpense.updateMany({ where: { id, deletedAt: null, ...(division === 'all' ? {} : { division }) }, data: { deletedAt: new Date() } })
    if (changed.count) {
      await db.activityLog.create({ data: { userId: user.id, action: '删除经营支出', detail: `${existing.description} · ¥${existing.amount.toFixed(2)}`, entityType: 'OperatingExpense', entityId: id } })
      return NextResponse.json({ ok: true })
    }
  }
  return NextResponse.json({ error: '支出记录不存在或无权删除' }, { status: 404 })
})
