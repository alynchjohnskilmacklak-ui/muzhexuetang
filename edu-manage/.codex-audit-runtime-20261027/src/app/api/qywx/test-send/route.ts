import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { AuthError } from '@/lib/auth/guards'
import { qywxEnabled, sendQywxMemberMessage, sendQywxParentNotice } from '@/lib/qywx'

export const dynamic = 'force-dynamic'

/**
 * 企微通道测试发送（管理员/教师自测）。
 * body: { channel?: 'member' | 'parent', title?, desc?, url? }
 * 默认向调用者自己发送员工通道消息，验证 token + 发送全链路。
 * 返回企微原始 errcode/errmsg，便于诊断配置。
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Unauthorized', 401)

  if (!qywxEnabled()) {
    return NextResponse.json({ error: '企业微信通道未开启（QYWX_ENABLED 未配置为 true）' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    channel?: 'member' | 'parent'
    title?: string
    desc?: string
    url?: string
  }
  const channel = body.channel === 'parent' ? 'parent' : 'member'
  const title = body.title || '【牧哲学堂】企微通道测试'
  const desc = body.desc || '这是一条测试消息，说明企业微信推送通道已连通。'
  const url = body.url || 'https://muzhexuetang.xyz/parent/dashboard'

  const prisma = await getRequestPrisma()
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { qywxUserId: true, qywxExternalUserId: true },
  })

  if (channel === 'parent') {
    if (!row?.qywxExternalUserId) {
      return NextResponse.json({ error: '当前账号未绑定家长企微身份（qywxExternalUserId），请先调用 /api/qywx/bind 绑定' }, { status: 400 })
    }
    const result = await sendQywxParentNotice(row.qywxExternalUserId, { title, desc, url })
    return NextResponse.json({ ok: result.success, result })
  }

  if (!row?.qywxUserId) {
    return NextResponse.json({ error: '当前账号未绑定企微成员身份（qywxUserId），请先调用 /api/qywx/bind 绑定' }, { status: 400 })
  }
  const result = await sendQywxMemberMessage(row.qywxUserId, { title, desc, url })
  return NextResponse.json({ ok: result.success, result })
})
