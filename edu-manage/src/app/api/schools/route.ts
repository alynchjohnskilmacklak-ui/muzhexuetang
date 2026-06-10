import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schools = await prisma.highSchoolInfo.findMany({
    orderBy: [{ tongZhao: 'desc' }],
  })
  return NextResponse.json({ schools }, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300' },
  })
})
