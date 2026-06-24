import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const POST = apiHandler(async (req: NextRequest) => {
  const prisma = await getRequestPrisma()
  const body = await req.json()
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : ''

  if (!token) return NextResponse.json({ error: '缺少重置令牌' }, { status: 400 })
  if (!newPassword) return NextResponse.json({ error: '请输入新密码' }, { status: 400 })
  if (newPassword.length < 6) return NextResponse.json({ error: '新密码至少6位' }, { status: 400 })
  if (newPassword.length > 50) return NextResponse.json({ error: '新密码不能超过50位' }, { status: 400 })

  const tokenHashVal = hashToken(token)
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: tokenHashVal, used: false, expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, status: true } } },
  })

  if (!resetToken) {
    return NextResponse.json({ error: '重置链接已过期或无效，请重新申请' }, { status: 400 })
  }

  if (resetToken.user.status === 'disabled' || resetToken.user.status === 'INACTIVE') {
    return NextResponse.json({ error: '账号已停用' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
    prisma.activityLog.create({
      data: {
        userId: resetToken.userId,
        action: 'PASSWORD_RESET',
        detail: '通过重置链接修改密码',
        entityType: 'User',
        entityId: resetToken.userId,
      },
    }),
  ])

  return NextResponse.json({ ok: true, message: '密码已重置，请使用新密码登录' })
})
