import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const body = await req.json()
  const type = typeof body.type === 'string' ? body.type : 'HEART'

  const existing = await prisma.paperReaction.findUnique({
    where: { paperId_userId: { paperId: id, userId: user.id } },
  })

  if (existing) {
    await prisma.paperReaction.delete({ where: { id: existing.id } })
    return NextResponse.json({ reacted: false })
  }

  await prisma.paperReaction.create({
    data: { paperId: id, userId: user.id, type },
  })

  return NextResponse.json({ reacted: true })
})
