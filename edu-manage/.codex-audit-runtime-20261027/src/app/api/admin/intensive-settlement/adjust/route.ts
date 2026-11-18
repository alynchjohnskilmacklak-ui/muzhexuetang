import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { adjustIntensiveSettlement } from '@/lib/intensive-settlement'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json() as { lessonId?: unknown; newMinutes?: unknown; reason?: unknown }
  const lessonId = typeof body.lessonId === 'string' ? body.lessonId.trim() : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
  const newMinutes = Number(body.newMinutes)
  if (!lessonId || !Number.isFinite(newMinutes) || newMinutes <= 0 || !reason) {
    return NextResponse.json({ error: '请提供课次、有效的新实际分钟和调整原因' }, { status: 400 })
  }

  try {
    const prisma = await getRequestPrisma()
    const result = await adjustIntensiveSettlement({
      prisma,
      lessonId,
      newMinutes,
      reason,
      operatorId: user.id,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'INTENSIVE_LESSON_REQUIRED') {
      return NextResponse.json({ error: '课次不存在或不是突击全能班课次' }, { status: 404 })
    }
    if (code === 'INTENSIVE_LESSON_NOT_SETTLED') {
      return NextResponse.json({ error: '该课次尚未结算，不能执行结算调整' }, { status: 409 })
    }
    if (code === 'SETTLEMENT_CHANGED_CONCURRENTLY') {
      return NextResponse.json({ error: '结算数据已被其他操作修改，请刷新后重试' }, { status: 409 })
    }
    if (code === 'INVALID_NEW_MINUTES' || code === 'ADJUSTMENT_REASON_REQUIRED') {
      return NextResponse.json({ error: '调整分钟或原因无效' }, { status: 400 })
    }
    throw error
  }
})
