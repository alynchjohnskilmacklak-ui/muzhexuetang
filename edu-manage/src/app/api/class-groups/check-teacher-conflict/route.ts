import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { checkTeacherConflict } from '@/lib/teacher-conflict'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { teacherId, date, startTime, endTime, division: _division } = await req.json()

  if (!teacherId || !date || !startTime || !endTime) {
    return NextResponse.json({ conflict: false })
  }

  return NextResponse.json(await checkTeacherConflict(prisma, { teacherId, date, startTime, endTime }))
})
