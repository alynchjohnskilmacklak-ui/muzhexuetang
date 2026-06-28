import { NextResponse } from 'next/server'
import { getPrismaForDivision } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * 志愿模拟填报 — 高中学校数据接口。
 *
 * 本模块是【初中部中考志愿模拟】专属模块，始终读取初中部 (JUNIOR) 数据库。
 * 高中部管理员菜单中不展示此入口，以避免误读/误改初中部数据。
 * 如需高中部使用类似功能，需单独创建模块和菜单。
 */
export async function GET() {
  const prisma = getPrismaForDivision('JUNIOR')
  const schools = await prisma.highSchoolInfo.findMany({
    where: { xinleStatus: { isEmpty: false } },
    orderBy: [{ tongZhao: 'desc' }],
    select: {
      id: true,
      schoolId: true,
      name: true,
      fullName: true,
      type: true,
      location: true,
      address: true,
      distanceFromXinle: true,
      tongZhao: true,
      yiTong: true,
      allocationLine: true,
      xinleAccessible: true,
      xinleAccessibleOverride: true,
      xinleAllocationId: true,
      enrollment: true,
      boardingAvail: true,
      boardingFee: true,
      tuitionFee: true,
      keyFeature: true,
      gaokaoRate: true,
      intro: true,
      tips: true,
      website: true,
      phone: true,
      sourceUrl: true,
      sourceNote: true,
      infoVerifiedAt: true,
      infoConfidence: true,
      acceptsOtherCounty: true,
      xinleLine: true,
      xinleStatus: true,
      isProvincialDemo: true,
      xinleFenpeiQuota: true,
    },
  })
  const [allocationRows, rankRows] = await Promise.all([
    prisma.allocationQuota.findMany({ where: { year: 2025 }, select: { juniorSchool: true, seniorSchool: true, quota: true } }),
    prisma.yifenYidang.findMany({ where: { year: 2025 }, select: { score: true, cumulative: true }, orderBy: { score: 'desc' } }),
  ])
  const allocationQuotas: Record<string, Record<string, number>> = {}
  for (const row of allocationRows) {
    allocationQuotas[row.juniorSchool] ||= {}
    allocationQuotas[row.juniorSchool][row.seniorSchool] = row.quota
  }
  const scoreRanks = Object.fromEntries(rankRows.map((row) => [row.score, row.cumulative]))
  return NextResponse.json({ schools, allocationQuotas, scoreRanks }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
    },
  })
}
