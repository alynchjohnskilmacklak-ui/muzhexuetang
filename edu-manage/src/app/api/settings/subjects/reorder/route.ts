import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PATCH /api/settings/subjects/reorder — 拖拽排序
export const PATCH = apiHandler(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const body = await request.json()
  const { ids } = body as { ids: string[] }
  if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'ids 必须是一个数组' }, { status: 400 })

  await prisma.$transaction(
    ids.map((id, index) => prisma.subject.update({ where: { id }, data: { order: index } }))
  )

  return NextResponse.json({ success: true })
})
