import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const schools = await prisma.highSchoolInfo.findMany({
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
    },
  })
  return NextResponse.json({ schools }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
    },
  })
}
