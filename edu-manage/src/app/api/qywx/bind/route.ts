import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { AuthError } from '@/lib/auth/guards'
import { qywxEnabled, getQywxUserIdByMobile } from '@/lib/qywx'

export const dynamic = 'force-dynamic'

/**
 * 企业微信身份绑定。
 * - 管理员：可绑定任意用户（传 targetUserId）；也支持仅传 mobile 自动查员工 userid
 * - 家长/教师：绑定自己
 * body: { targetUserId?, qywxUserId?, qywxExternalUserId?, mobile? }
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Unauthorized', 401)

  const body = (await req.json().catch(() => ({}))) as {
    targetUserId?: string
    qywxUserId?: string
    qywxExternalUserId?: string
    mobile?: string
  }

  if (!qywxEnabled()) {
    return NextResponse.json({ error: '企业微信通道未开启（QYWX_ENABLED 未配置为 true）' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  const isAdmin = user.role === 'admin'
  const targetUserId = isAdmin && body.targetUserId ? body.targetUserId : user.id

  if (body.mobile) {
    // 按手机号查企业成员 userid（员工通道自动绑定）
    const qywxUserId = await getQywxUserIdByMobile(body.mobile)
    if (!qywxUserId) {
      return NextResponse.json({ error: `手机号 ${body.mobile} 未在企业微信通讯录中找到对应成员（请确认通讯录读取权限/手机号一致）` }, { status: 400 })
    }
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { qywxUserId },
      select: { id: true, qywxUserId: true, qywxExternalUserId: true },
    })
    return NextResponse.json({ ok: true, user: updated })
  }

  if (!body.qywxUserId && !body.qywxExternalUserId) {
    return NextResponse.json({ error: '请提供 qywxUserId、qywxExternalUserId 或 mobile 三者之一' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      qywxUserId: body.qywxUserId ?? undefined,
      qywxExternalUserId: body.qywxExternalUserId ?? undefined,
    },
    select: { id: true, qywxUserId: true, qywxExternalUserId: true },
  })
  return NextResponse.json({ ok: true, user: updated })
})

/** 查询当前用户/指定用户的企微绑定状态 */
export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Unauthorized', 401)
  const prisma = await getRequestPrisma()
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { qywxUserId: true, qywxExternalUserId: true },
  })
  return NextResponse.json({ ok: true, bound: row ?? null })
})
