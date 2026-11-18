import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const consultations = await prisma.volunteerConsultation.findMany({
    where: user.role === 'parent' ? { parentId: user.id } : {},
    include: { parent: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ consultations })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) return NextResponse.json({ error: '问题不能为空' }, { status: 400 })
  if (question.length > 500) return NextResponse.json({ error: '问题不能超过500字' }, { status: 400 })

  const consultation = await prisma.volunteerConsultation.create({
    data: { parentId: user.id, question },
  })
  return NextResponse.json(consultation, { status: 201 })
})
