import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { getSchoolAdmissionHistoryWithImportedSources } from '@/lib/school-admission-source'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prisma = await getRequestPrisma()
  const schoolRows = await prisma.highSchoolInfo.findMany({
    orderBy: [{ tongZhao: 'desc' }],
    // Keep the read path working during a rolling migration: Prisma's implicit
    // select would request the new column before every database is upgraded.
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
      yiTong: true,
      tongZhao: true,
      allocationLine: true,
      acceptsOtherCounty: true,
      xinleLine: true,
      xinleStatus: true,
      isProvincialDemo: true,
      xinleFenpeiQuota: true,
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
      updatedAt: true,
      updatedBy: true,
    },
  })
  let savedHistoryById = new Map<string, unknown>()
  try {
    const historyRows = await prisma.$queryRaw<Array<{ id: string; admissionHistory: unknown }>>`
      SELECT "id", "admissionHistory" FROM "HighSchoolInfo"
    `
    savedHistoryById = new Map(historyRows.map((row) => [row.id, row.admissionHistory]))
  } catch (error) {
    // Until the migration is deployed, parent/admin screens can still use the
    // explicitly marked legacy 2025 fields instead of failing the whole page.
    console.warn('[schools] admission history unavailable; using legacy score fields', error)
  }
  const schools = schoolRows.map((school) => {
    const accessible = school.xinleAccessibleOverride ?? school.xinleAccessible
    const statuses = Array.isArray(school.xinleStatus) ? school.xinleStatus : []
    const normalizedStatuses = statuses.map((status) => status.replace(/\s+/g, ''))
    const explicitlyDirectlyEligible = normalizedStatuses.some((status) =>
      status.includes('统招可报') || status.includes('新乐可报名') || status.includes('新乐考生可报'),
    )
    const hasAllocationPath = normalizedStatuses.some((status) => status.includes('分配生可报'))
    const explicitlyIneligible = normalizedStatuses.some((status) =>
      status.includes('不可报') || status.includes('不招新乐') || status.includes('不面向新乐'),
    )

    // `xinleAccessible` defaults to true for legacy records. Treat that default as
    // unknown unless an admin override or a stored, explicit status confirms it.
    let xinleEligibility: 'eligible' | 'allocation' | 'ineligible' | 'unverified' = 'unverified'
    if (school.xinleAccessibleOverride === true) {
      xinleEligibility = 'eligible'
    } else if (school.xinleAccessibleOverride === false || !accessible || explicitlyIneligible) {
      xinleEligibility = 'ineligible'
    } else if (accessible && explicitlyDirectlyEligible) {
      xinleEligibility = 'eligible'
    } else if (accessible && hasAllocationPath) {
      xinleEligibility = 'allocation'
    }

    return {
      ...school,
      xinleAccessible: accessible,
      xinleEligibility,
      admissionHistory: getSchoolAdmissionHistoryWithImportedSources(
        school,
        savedHistoryById.get(school.id),
      ),
    }
  })

  return NextResponse.json({ schools }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
})
