import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

// GET /api/settings/subjects — 获取学科列表
export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(subjects)
})

// POST /api/settings/subjects — 新增学科
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const body = await request.json()
  const { name, color, textColor } = body
  if (!name) return NextResponse.json({ error: '学科名称不能为空' }, { status: 400 })

  const max = await prisma.subject.aggregate({ _max: { order: true } })
  const subject = await prisma.subject.create({
    data: { name, color: color || '#E8784A', textColor: textColor || '#ffffff', order: (max._max.order ?? -1) + 1 },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '新增了学科', detail: `添加了「${name}」` },
  })

  return NextResponse.json(subject, { status: 201 })
})
