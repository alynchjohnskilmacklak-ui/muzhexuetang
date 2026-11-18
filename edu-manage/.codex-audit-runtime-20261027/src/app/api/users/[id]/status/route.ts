import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { AuthError, requireAdminUser } from '@/lib/auth/guards'
import { getPrismaForDivision, isDualDbEnabled } from '@/lib/prisma'
import { isSuperAdminEmail } from '@/lib/super-admin'
import { isSupportedUserStatus, isUserDisabled, toStoredUserStatus } from '@/lib/user-status'

export const dynamic = 'force-dynamic'

export const PATCH = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const actor = await requireAdminUser()
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const requestedStatus = typeof body.status === 'string' ? body.status.trim() : ''
  if (!isSupportedUserStatus(requestedStatus)) {
    return NextResponse.json({ error: '无效状态' }, { status: 400 })
  }

  const requestedDivision = body.division
  if (requestedDivision != null && requestedDivision !== 'JUNIOR' && requestedDivision !== 'SENIOR') {
    return NextResponse.json({ error: '无效学部' }, { status: 400 })
  }

  const actorDivision = actor.division as 'JUNIOR' | 'SENIOR'
  const targetDivision = (requestedDivision ?? actorDivision) as 'JUNIOR' | 'SENIOR'
  const actorIsSuperAdmin = isSuperAdminEmail(actor.email)
  if (isDualDbEnabled() && targetDivision !== actorDivision && !actorIsSuperAdmin) {
    throw new AuthError('无权修改其他学部账号')
  }
  if (id === actor.id && targetDivision === actorDivision) {
    return NextResponse.json({ error: '不能停用自己的账号' }, { status: 400 })
  }

  const prisma = isDualDbEnabled() ? getPrismaForDivision(targetDivision) : actor.prisma
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!targetUser) return NextResponse.json({ error: '账号不存在' }, { status: 404 })
  if (isSuperAdminEmail(targetUser.email) && !actorIsSuperAdmin) {
    throw new AuthError('最高权益管理员账号不可由普通管理员修改')
  }

  const status = toStoredUserStatus(requestedStatus)
  const user = await prisma.user.update({
    where: { id },
    data: {
      status,
      ...(isUserDisabled(status) ? { currentSessionToken: null } : {}),
    },
  })

  try {
    await prisma.activityLog.create({
      data: {
        userId: actor.id,
        action: isUserDisabled(status) ? '停用账号' : '恢复账号',
        detail: `${user.name}（${user.email}）`,
        entityType: 'User',
        entityId: user.id,
      },
    })
  } catch (error) {
    console.error('[users:status] skipped activity log', error)
  }

  return NextResponse.json({ ok: true, status: user.status })
})
