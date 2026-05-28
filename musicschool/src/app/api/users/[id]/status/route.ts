import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const currentUser = session?.user as { id?: string; role?: string } | undefined
  if (!currentUser?.id || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const status = typeof body.status === 'string' ? body.status : ''
  if (!['active', 'disabled'].includes(status)) {
    return NextResponse.json({ error: '无效状态' }, { status: 400 })
  }

  if (id === currentUser.id) {
    return NextResponse.json({ error: '不能禁用自己的账号' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      status,
      ...(status === 'disabled' ? { currentSessionToken: null } : {}),
    },
  })

  try {
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: status === 'disabled' ? '禁用账号' : '恢复账号',
        detail: `${user.name}（${user.email}）`,
      },
    })
  } catch (error) {
    console.error('[users:status] skipped activity log', error)
  }

  return NextResponse.json({ ok: true, status: user.status })
}
