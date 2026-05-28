import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/get-user'
import { checkScheduleConflict } from '@/lib/schedule-conflict'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const teacherId = searchParams.get('teacherId')
  const studentId = searchParams.get('studentId') || undefined
  const roomId = searchParams.get('roomId') || undefined
  const date = searchParams.get('date')
  const startTime = searchParams.get('startTime')
  const endTime = searchParams.get('endTime')
  const excludeLessonId = searchParams.get('excludeLessonId') || undefined

  if (!teacherId || !date || !startTime || !endTime) {
    return NextResponse.json({ conflicts: [], message: '缺少必填参数' })
  }

  const conflicts = await checkScheduleConflict({
    teacherId,
    studentId,
    roomId,
    date,
    startTime,
    endTime,
    excludeLessonId,
  })

  return NextResponse.json({
    conflicts,
    hasConflict: conflicts.length > 0,
  })
})
