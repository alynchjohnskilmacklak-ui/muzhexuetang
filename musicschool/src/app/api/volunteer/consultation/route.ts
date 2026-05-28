import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const consultations = await prisma.volunteerConsultation.findMany({
    where: user.role === 'parent' ? { parentId: user.id } : {},
    include: { parent: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ consultations })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) return NextResponse.json({ error: '问题不能为空' }, { status: 400 })
  if (question.length > 500) return NextResponse.json({ error: '问题不能超过500字' }, { status: 400 })

  const consultation = await prisma.volunteerConsultation.create({
    data: { parentId: user.id, question },
  })
  return NextResponse.json(consultation, { status: 201 })
}
