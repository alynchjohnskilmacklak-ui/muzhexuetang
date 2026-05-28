import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const REACTIONS = new Set(['HEART', 'STAR', 'CLAP'])

async function canAccessPost(userId: string, postId: string) {
  const post = await prisma.performancePost.findFirst({
    where: {
      id: postId,
      deletedAt: null,
      student: { OR: [{ parentId: userId }, { parentUserId: userId }], status: { not: 'INACTIVE' } },
    },
    select: { id: true },
  })
  return Boolean(post)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!(await canAccessPost(user.id, id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const type = typeof body.type === 'string' && REACTIONS.has(body.type) ? body.type : 'HEART'
  const reaction = await prisma.postReaction.upsert({
    where: { postId_userId_type: { postId: id, userId: user.id, type } },
    create: { postId: id, userId: user.id, type },
    update: {},
  })
  return NextResponse.json(reaction, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'HEART'
  await prisma.postReaction.deleteMany({ where: { postId: id, userId: user.id, type } })
  return NextResponse.json({ success: true })
}
