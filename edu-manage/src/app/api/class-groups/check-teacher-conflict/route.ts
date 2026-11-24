import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { checkTeacherConflict } from '@/lib/teacher-conflict'
import { requireAdminUser } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const { prisma } = await requireAdminUser()

  const { teacherId, date, startTime, endTime, division: _division } = await req.json()

  if (!teacherId || !date || !startTime || !endTime) {
    return NextResponse.json({ conflict: false })
  }

  return NextResponse.json(await checkTeacherConflict(prisma, { teacherId, date, startTime, endTime }))
})
