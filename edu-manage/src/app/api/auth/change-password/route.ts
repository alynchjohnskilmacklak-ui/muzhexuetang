import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = await req.json()
  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword.trim() : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : ''

  if (!oldPassword) return NextResponse.json({ error: '请输入当前密码' }, { status: 400 })
  if (!newPassword) return NextResponse.json({ error: '请输入新密码' }, { status: 400 })
  if (newPassword.length < 6) return NextResponse.json({ error: '新密码至少6位' }, { status: 400 })
  if (newPassword.length > 50) return NextResponse.json({ error: '新密码不能超过50位' }, { status: 400 })

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
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  })

  return NextResponse.json({ ok: true })
})
