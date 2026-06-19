import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getTeacherBusy } from '@/lib/teacher-busy'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { teacherId, date, startTime, endTime, division } = await req.json()

  if (!teacherId || !date || !startTime || !endTime) {
    return NextResponse.json({ conflict: false })
  }

  const busy = await getTeacherBusy(prisma, teacherId, date, startTime, endTime)
  if (busy) {
    return NextResponse.json({ conflict: true, conflictDetail: `${busy.label} ${busy.start}-${busy.end}` })
  }
  return NextResponse.json({ conflict: false })
})
