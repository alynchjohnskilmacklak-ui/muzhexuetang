import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import type { Prisma } from '@prisma/client'
import { normalizeSchoolAdmissionHistory, type SchoolAdmissionYearRecord } from '@/lib/school-admission-history'

export const dynamic = 'force-dynamic'

// 字段白名单：仅允许通过此接口更新的字段。
// 系统字段 (id, schoolId, createdAt, updatedAt) 不允许前端传入。
const ALLOWED_UPDATE_FIELDS = new Set([
  'name',
  'fullName',
  'type',
  'location',
  'address',
  'distanceFromXinle',
  'yiTong',
  'tongZhao',
  'allocationLine',
  'acceptsOtherCounty',
  'xinleAccessible',
  'xinleAccessibleOverride',
  'xinleAllocationId',
  'enrollment',
  'boardingAvail',
  'boardingFee',
  'tuitionFee',
  'keyFeature',
  'gaokaoRate',
  'intro',
  'tips',
  'website',
  'phone',
  'sourceUrl',
  'sourceNote',
  'infoVerifiedAt',
  'infoConfidence',
  'admissionHistory',
])

function validateAdmissionHistory(value: unknown): SchoolAdmissionYearRecord[] | null {
  if (!Array.isArray(value) || value.length > 20) return null
  const history = normalizeSchoolAdmissionHistory(value)
  if (history.length !== value.length) return null

  const years = new Set<number>()
  for (const record of history) {
    if (record.year < 2000 || record.year > 2100 || record.fullScore > 1000 || years.has(record.year)) return null
    years.add(record.year)
    const rawRecord = value.find((item) => item && typeof item === 'object' && Number((item as Record<string, unknown>).year) === record.year) as Record<string, unknown> | undefined
    if (!rawRecord || !Array.isArray(rawRecord.lines) || rawRecord.lines.length > 30 || record.lines.length !== rawRecord.lines.length) return null
    if (record.lines.some((line) => line.score > record.fullScore)) return null
    if (record.sourceUrl && !/^https?:\/\//i.test(record.sourceUrl)) return null
    if (record.verifiedAt && Number.isNaN(Date.parse(record.verifiedAt))) return null
  }
  return history
}

export const PUT = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const role = (session?.user as Record<string, unknown> | undefined)?.role
  if (!session?.user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()

  const { id } = await params
  const rawData = await req.json()
  const userId = (session.user as Record<string, string>).id

  // 只提取白名单字段，禁止前端写入系统字段
  const data: Record<string, unknown> = {}
  for (const key of Object.keys(rawData)) {
    if (ALLOWED_UPDATE_FIELDS.has(key)) {
      data[key] = rawData[key]
    }
  }

  if (Object.prototype.hasOwnProperty.call(rawData, 'admissionHistory')) {
    const history = validateAdmissionHistory(rawData.admissionHistory)
    if (!history) {
      return NextResponse.json({ error: '历年分数数据格式不正确，请检查年份、满分、分数和来源链接。' }, { status: 400 })
    }
    data.admissionHistory = history as Prisma.InputJsonValue
  }

  let school
  try {
    school = await prisma.highSchoolInfo.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    })
  } catch (error) {
    const prismaError = error as { code?: string; meta?: { code?: string } }
    if (Object.prototype.hasOwnProperty.call(data, 'admissionHistory') && (prismaError.code === 'P2022' || prismaError.meta?.code === '42703')) {
      return NextResponse.json({ error: '数据库尚未升级到历年录取线版本，请先应用 school_admission_history 数据库迁移。' }, { status: 503 })
    }
    throw error
  }

  return NextResponse.json(school)
})
