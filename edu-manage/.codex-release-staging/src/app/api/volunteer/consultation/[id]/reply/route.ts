import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string; name?: string | null } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'teacher'].includes(user.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const body = await req.json()
  const reply = typeof body.reply === 'string' ? body.reply.trim() : ''
  if (!reply) return NextResponse.json({ error: '回复不能为空' }, { status: 400 })

  const consultation = await prisma.volunteerConsultation.update({
    where: { id },
    data: {
      reply,
      repliedBy: user.name || user.id,
      isReplied: true,
      repliedAt: new Date(),
    },
  })
  return NextResponse.json(consultation)
})
