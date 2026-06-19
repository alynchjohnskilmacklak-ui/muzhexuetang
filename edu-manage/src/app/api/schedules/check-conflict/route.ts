import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { getTeacherBusy } from '@/lib/teacher-busy'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { searchParams } = new URL(req.url)
  const teacherId = searchParams.get('teacherId')
  const date = searchParams.get('date')
  const startTime = searchParams.get('startTime')
  const endTime = searchParams.get('endTime')

  if (!teacherId || !date || !startTime || !endTime) {
    return NextResponse.json({ conflicts: [], message: '缺少必填参数' })
  }

  const busy = await getTeacherBusy(prisma, teacherId, date, startTime, endTime)
  const conflicts = busy ? [{ type: 'teacher', message: `${busy.label} ${busy.start}-${busy.end}`, source: busy.source }] : []

  return NextResponse.json({ conflicts, hasConflict: conflicts.length > 0 })
})
