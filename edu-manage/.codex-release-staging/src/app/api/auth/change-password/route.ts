import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAuthenticatedUser } from '@/lib/auth/guards'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getPasswordPolicyError } from '@/lib/password-policy'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await requireAuthenticatedUser()
  const prisma = user.prisma
  const body = await req.json()
  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword.trim() : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!oldPassword) return NextResponse.json({ error: '请输入当前密码' }, { status: 400 })
  if (!newPassword) return NextResponse.json({ error: '请输入新密码' }, { status: 400 })
  const policyError = getPasswordPolicyError(newPassword)
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  })
  if (!dbUser) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

  if (!dbUser.password.startsWith('$2')) {
    return NextResponse.json({ error: '当前账号不支持修改密码' }, { status: 400 })
  }

  const valid = await bcrypt.compare(oldPassword, dbUser.password)
  if (!valid) return NextResponse.json({ error: '当前密码不正确' }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, currentSessionToken: crypto.randomUUID() },
    }),
    prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED_SELF',
        detail: '用户自行修改密码并撤销旧登录状态',
        entityType: 'User',
        entityId: user.id,
        metadata: { source: 'SELF_SERVICE' },
      },
    }),
  ])

  return NextResponse.json({ ok: true, sessionRevoked: true })
})
