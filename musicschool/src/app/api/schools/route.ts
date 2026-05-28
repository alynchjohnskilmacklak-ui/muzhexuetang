import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schools = await prisma.highSchoolInfo.findMany({
    orderBy: [{ tongZhao: 'desc' }],
  })
  return NextResponse.json({ schools })
}
