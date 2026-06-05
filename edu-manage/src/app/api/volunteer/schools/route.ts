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
      type: true,
      location: true,
      tongZhao: true,
      yiTong: true,
      allocationLine: true,
      xinleAccessible: true,
      xinleAllocationId: true,
      boardingAvail: true,
      acceptsOtherCounty: true,
    },
  })
  return NextResponse.json({ schools }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
    },
  })
}
