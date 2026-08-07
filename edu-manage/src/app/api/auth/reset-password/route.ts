import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { apiHandler } from '@/lib/api-handler'
import { getPublicAuthDatabases } from '@/lib/auth/public-account-db'
import { isUserDisabled } from '@/lib/user-status'
import { getPasswordPolicyError } from '@/lib/password-policy'

export const dynamic = 'force-dynamic'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!token) return NextResponse.json({ error: '缺少重置令牌' }, { status: 400 })
  if (!newPassword) return NextResponse.json({ error: '请输入新密码' }, { status: 400 })
  const policyError = getPasswordPolicyError(newPassword)
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 })

  const tokenHash = hashToken(token)
  const candidates = await Promise.all(getPublicAuthDatabases().map(async database => ({
    ...database,
    resetToken: await database.prisma.passwordResetToken.findFirst({
      where: { tokenHash, used: false, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, status: true } } },
    }),
  })))
  const match = candidates.find(candidate => candidate.resetToken)

  if (!match?.resetToken) {
    return NextResponse.json({ error: '重置链接已过期或无效，请重新申请' }, { status: 400 })
  }
  if (isUserDisabled(match.resetToken.user.status)) {
    return NextResponse.json({ error: '账号已停用' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  const nextSessionToken = crypto.randomUUID()
  const { prisma, resetToken } = match

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashed, currentSessionToken: nextSessionToken },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, used: false },
      data: { used: true },
    }),
    prisma.activityLog.create({
      data: {
        userId: resetToken.userId,
        action: 'PASSWORD_RESET_LINK',
        detail: '通过重置链接修改密码并撤销旧登录状态',
        entityType: 'User',
        entityId: resetToken.userId,
        metadata: { source: 'RESET_LINK' },
      },
    }),
  ])

  return NextResponse.json({ ok: true, message: '密码已重置，请使用新密码登录' })
})
