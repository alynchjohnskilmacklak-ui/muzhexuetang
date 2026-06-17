import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPrismaForDivision } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

// 高中学校信息为初中部志愿模块参考数据，固定 JUNIOR 库，与 /api/volunteer/schools 保持一致。
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
  'admitRankByYear',
  'admitRankRef',
])

export const PUT = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth()
  const role = (session?.user as Record<string, unknown> | undefined)?.role
  if (!session?.user || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const prisma = getPrismaForDivision('JUNIOR')

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

  const school = await prisma.highSchoolInfo.update({
    where: { id },
    data: { ...data, updatedBy: userId },
  })

  return NextResponse.json(school)
})
