import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { AuthError } from '@/lib/auth/guards'
import { qywxEnabled, getQywxUserIdByMobile } from '@/lib/qywx'

export const dynamic = 'force-dynamic'

/**
 * 企业微信身份绑定。
 * - 管理员：可为本校区员工绑定企业成员 userid，也支持按手机号查询
 * - 教师：只能绑定自己的企业成员 userid
 * - 家长外部联系人必须经管理员在 bind-management 中核验后绑定
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
  if (!isAdmin && user.role !== 'teacher') {
    return NextResponse.json({ error: '家长外部联系人身份只能由校区管理员核验后关联' }, { status: 403 })
  }
  if (body.qywxExternalUserId) {
    return NextResponse.json({ error: '外部联系人请通过企微绑定管理完成校验后关联' }, { status: 403 })
  }
  if (!body.mobile && !body.qywxUserId) {
    return NextResponse.json({ error: '请提供 qywxUserId 或 mobile' }, { status: 400 })
  }

  const targetUserId = isAdmin && body.targetUserId ? body.targetUserId : user.id
  const target = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      division: user.division,
      role: { in: ['admin', 'teacher'] },
      status: 'active',
    },
    select: { id: true },
  })
  if (!target) return NextResponse.json({ error: '目标账号不存在或不属于当前校区员工' }, { status: 404 })

  if (body.mobile) {
    // 按手机号查企业成员 userid（员工通道自动绑定）
    const qywxUserId = await getQywxUserIdByMobile(body.mobile)
    if (!qywxUserId) {
      return NextResponse.json({ error: `手机号 ${body.mobile} 未在企业微信通讯录中找到对应成员（请确认通讯录读取权限/手机号一致）` }, { status: 400 })
    }
    const duplicate = await prisma.user.findFirst({
      where: { qywxUserId, id: { not: targetUserId } },
      select: { id: true },
    })
    if (duplicate) return NextResponse.json({ error: '该企微员工已绑定其他系统账号' }, { status: 409 })
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { qywxUserId },
      select: { id: true, qywxUserId: true, qywxExternalUserId: true },
    })
    return NextResponse.json({ ok: true, user: updated })
  }

  const duplicate = await prisma.user.findFirst({
    where: { qywxUserId: body.qywxUserId, id: { not: targetUserId } },
    select: { id: true },
  })
  if (duplicate) return NextResponse.json({ error: '该企微员工已绑定其他系统账号' }, { status: 409 })

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      qywxUserId: body.qywxUserId ?? undefined,
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
