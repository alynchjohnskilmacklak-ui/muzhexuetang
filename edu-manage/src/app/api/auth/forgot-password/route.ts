import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const POST = apiHandler(async (req: NextRequest) => {
  const prisma = await getRequestPrisma()
  const body = await req.json()
  const account = typeof body.account === 'string' ? body.account.trim() : ''

  if (!account) {
    return NextResponse.json({ error: '请输入手机号或账号' }, { status: 400 })
  }

  // Find user by email or teacher phone
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: account },
        { teacher: { phone: account } },
      ],
    },
    include: { teacher: { select: { id: true, phone: true } } },
  })

  // Always return success to avoid account enumeration
  if (!user) {
    return NextResponse.json({ ok: true, message: '如果账号存在，重置链接将发送到您的微信' })
  }

  if (user.status === 'disabled' || user.status === 'INACTIVE') {
    return NextResponse.json({ ok: true, message: '如果账号存在，重置链接将发送到您的微信' })
  }

  // Invalidate old tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHashVal = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: tokenHashVal,
      expiresAt,
    },
  })

  // Try to send via WxPusher if bound
  if (user.wxpusherUid) {
    try {
      const WXPUSHER_API = 'https://wxpusher.zjiecode.com/api'
      const appToken = process.env.WXPUSHER_APP_TOKEN
      if (appToken) {
        const resetUrl = `${process.env.NEXTAUTH_URL || ''}/reset-password?token=${rawToken}`
        await fetch(`${WXPUSHER_API}/send/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appToken,
            content: `【牧哲学堂】您正在申请重置密码，请点击链接完成重置（30分钟内有效）：${resetUrl}`,
            summary: '密码重置',
            contentType: 1,
            uids: [user.wxpusherUid],
          }),
        })
      }
    } catch {
      // non-critical
    }
  }

  return NextResponse.json({ ok: true, message: '重置链接已发送到您绑定的微信' })
})
