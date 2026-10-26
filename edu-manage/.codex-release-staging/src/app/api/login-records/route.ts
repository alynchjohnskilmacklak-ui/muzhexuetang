import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import {
  mergeLoginRecordPage,
  parseLoginRecordDivision,
  type LoginRecordDivision,
} from '@/lib/login-records'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'

export const dynamic = 'force-dynamic'

const recordInclude = Prisma.validator<Prisma.LoginRecordInclude>()({
  user: {
    select: { id: true, name: true, role: true, status: true, division: true },
  },
})

type LoginRecordWithUser = Prisma.LoginRecordGetPayload<{ include: typeof recordInclude }>
type DividedRecord = LoginRecordWithUser & { division: LoginRecordDivision }

async function queryDivision(
  client: PrismaClient,
  division: LoginRecordDivision,
  where: Prisma.LoginRecordWhereInput,
  skip: number,
  take: number,
  todayStart: Date,
  todayEnd: Date,
  lockWindowStart: Date,
) {
  const [records, total, todayTotal, todayFail, recentFailures] = await Promise.all([
    client.loginRecord.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip,
      take,
      include: recordInclude,
    }),
    client.loginRecord.count({ where }),
    client.loginRecord.count({
      where: { success: true, createdAt: { gte: todayStart, lt: todayEnd } },
    }),
    client.loginRecord.count({
      where: { success: false, createdAt: { gte: todayStart, lt: todayEnd } },
    }),
    client.loginRecord.groupBy({
      by: ['email'],
      where: {
        success: false,
        failReason: { not: 'locked' },
        createdAt: { gte: lockWindowStart },
      },
      _count: { email: true },
    }),
  ])

  return {
    records: records.map((record): DividedRecord => ({ ...record, division })),
    total,
    todayTotal,
    todayFail,
    lockedCount: recentFailures.filter((item) => item._count.email >= 5).length,
  }
}

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { role?: string; division?: string } | undefined
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || '50')))
  const offset = (page - 1) * limit
  const successParam = searchParams.get('success')
  const search = searchParams.get('search')?.trim()
  const divisionFilter = parseLoginRecordDivision(searchParams.get('division'))
  if (!divisionFilter) {
    return NextResponse.json({ error: '无效学部' }, { status: 400 })
  }

  const filters: Prisma.LoginRecordWhereInput[] = []
  if (successParam === 'true') filters.push({ success: true })
  if (successParam === 'false') filters.push({ success: false })
  if (search) {
    filters.push({
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ],
    })
  }

  const { start: todayStart, end: todayEnd } = getLocalDayRange(todayLocal())
  const lockWindowStart = new Date(Date.now() - 30 * 60 * 1000)
  const dualDb = isDualDbEnabled()

  let records: DividedRecord[]
  let total: number
  let todayTotal: number
  let todayFail: number
  let lockedCount: number

  if (dualDb && divisionFilter === 'ALL') {
    const where: Prisma.LoginRecordWhereInput = filters.length ? { AND: filters } : {}
    // Each sorted stream only needs its first offset + limit rows to construct
    // the exact global page. Slicing happens once, after the cross-DB merge.
    const take = offset + limit
    const [junior, senior] = await Promise.all([
      queryDivision(getPrismaForDivision('JUNIOR'), 'JUNIOR', where, 0, take, todayStart, todayEnd, lockWindowStart),
      queryDivision(getPrismaForDivision('SENIOR'), 'SENIOR', where, 0, take, todayStart, todayEnd, lockWindowStart),
    ])
    records = mergeLoginRecordPage(junior.records, senior.records, offset, limit)
    total = junior.total + senior.total
    todayTotal = junior.todayTotal + senior.todayTotal
    todayFail = junior.todayFail + senior.todayFail
    lockedCount = junior.lockedCount + senior.lockedCount
  } else {
    const requestedDivision = divisionFilter === 'ALL'
      ? (user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR')
      : divisionFilter
    if (!dualDb && divisionFilter !== 'ALL') {
      filters.push({ user: { division: requestedDivision } })
    }
    const where: Prisma.LoginRecordWhereInput = filters.length ? { AND: filters } : {}
    const client = dualDb ? getPrismaForDivision(requestedDivision) : await getRequestPrisma()
    const result = await queryDivision(
      client,
      requestedDivision,
      where,
      offset,
      limit,
      todayStart,
      todayEnd,
      lockWindowStart,
    )
    records = result.records.map((record) => ({
      ...record,
      division: dualDb
        ? requestedDivision
        : record.user?.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR',
    }))
    total = result.total
    todayTotal = result.todayTotal
    todayFail = result.todayFail
    lockedCount = result.lockedCount
  }

  return NextResponse.json({
    records: records.map((record) => ({
      id: record.id,
      division: record.division,
      email: record.email,
      success: record.success,
      failReason: record.failReason,
      ip: record.ip,
      device: record.device,
      os: record.os,
      browser: record.browser,
      createdAt: record.createdAt,
      userId: record.userId,
      userName: record.user?.name,
      userRole: record.user?.role,
      userStatus: record.user?.status,
    })),
    total,
    stats: { todayTotal, todayFail, lockedCount },
  })
})
