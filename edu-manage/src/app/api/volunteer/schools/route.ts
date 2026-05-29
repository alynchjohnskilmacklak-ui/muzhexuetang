import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const schools = await prisma.highSchoolInfo.findMany({
    orderBy: [{ tongZhao: 'desc' }],
  })
  return NextResponse.json({ schools })
}
