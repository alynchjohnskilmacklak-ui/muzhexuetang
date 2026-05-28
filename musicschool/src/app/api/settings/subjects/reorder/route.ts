import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/settings/subjects/reorder — 拖拽排序
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { ids } = body as { ids: string[] }
  if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'ids 必须是一个数组' }, { status: 400 })

  await prisma.$transaction(
    ids.map((id, index) => prisma.subject.update({ where: { id }, data: { order: index } }))
  )

  return NextResponse.json({ success: true })
}
