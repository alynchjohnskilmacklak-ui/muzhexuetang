import { NextResponse } from 'next/server'
import { getPrismaForDivision } from '@/lib/prisma'
import admissionCutoffs2025 from '../../../../../data/volunteer/admission_cutoffs_2025.json'

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
  const schoolRows = await prisma.highSchoolInfo.findMany({
    orderBy: [{ tongZhao: 'desc' }],
    select: {
      id: true,
      schoolId: true,
      name: true,
      fullName: true,
      type: true,
      batch: true,
      category: true,
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
  const schools = schoolRows.map((school) => {
    const accessible = school.xinleAccessibleOverride ?? school.xinleAccessible
    const xinleStatus = school.xinleStatus.length > 0
      ? school.xinleStatus
      : accessible
        ? [
            '统招可报',
            ...(school.category?.includes('分配生') ? ['分配生可报'] : []),
          ]
        : ['仅供参考']

    return {
      ...school,
      xinleAccessible: accessible,
      xinleStatus,
      isProvincialDemo: school.isProvincialDemo || Boolean(school.batch?.includes('省级示范')),
      cutoffVariants2025: admissionCutoffs2025
        .filter((cutoff) => school.name.includes(cutoff.baseName) || school.fullName.includes(cutoff.baseName) || cutoff.baseName.includes(school.name))
        .map((cutoff) => ({
          regionLabel: cutoff.regionLabel,
          regionType: cutoff.regionType,
          yiTong: cutoff.yiTong,
          tongZhao: cutoff.tongZhao,
          sourceName: cutoff.schoolName,
        })),
    }
  })
  const [allocationRows, rankRows] = await Promise.all([
    prisma.allocationQuota.findMany({ where: { year: 2025 }, select: { juniorSchool: true, seniorSchool: true, quota: true } }),
    prisma.yifenYidang.findMany({ where: { year: { in: [2025, 2026] } }, select: { year: true, score: true, count: true, cumulative: true }, orderBy: [{ year: 'asc' }, { score: 'desc' }] }),
  ])
  const allocationQuotas: Record<string, Record<string, number>> = {}
  for (const row of allocationRows) {
    allocationQuotas[row.juniorSchool] ||= {}
    allocationQuotas[row.juniorSchool][row.seniorSchool] = row.quota
  }
  const rows2025 = rankRows.filter((row) => row.year === 2025).map(({ score, count, cumulative }) => ({ score, count, cumulative }))
  const rows2026 = rankRows.filter((row) => row.year === 2026).map(({ score, count, cumulative }) => ({ score, count, cumulative }))
  const scoreRanks = Object.fromEntries(rows2025.map((row) => [row.score, row.cumulative]))
  const rankMaps = {
    '2025': scoreRanks,
    '2026': Object.fromEntries(rows2026.map((row) => [row.score, row.cumulative])),
  }
  const rankRowsByYear = { '2025': rows2025, '2026': rows2026 }
  const rankMeta = Object.fromEntries(Object.entries(rankRowsByYear).map(([year, rows]) => [year, {
    total: rows.at(-1)?.cumulative ?? 0,
    minScore: rows.at(-1)?.score ?? 0,
    maxScore: rows[0]?.score ?? 0,
  }]))

  return NextResponse.json({ schools, allocationQuotas, scoreRanks, rankMaps, rankRows: rankRowsByYear, rankMeta }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
