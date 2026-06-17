import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPrismaForDivision } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

// 高中学校信息为初中部志愿模块参考数据，固定 JUNIOR 库，与 /api/volunteer/schools 保持一致。
export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prisma = getPrismaForDivision('JUNIOR')
  const schools = await prisma.highSchoolInfo.findMany({
    orderBy: [{ tongZhao: 'desc' }],
  })
  return NextResponse.json({ schools }, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300' },
  })
})
