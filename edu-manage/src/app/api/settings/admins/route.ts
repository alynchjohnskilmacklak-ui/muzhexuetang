import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  return user?.id && user.role === 'admin' ? user : null
}

export const GET = apiHandler(async () => {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })


  const prisma = await getRequestPrisma()
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ admins })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!emailPattern.test(email)) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '密码至少 8 位' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: '邮箱已被占用' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      name,
      role: 'admin',
      status: 'active',
    },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      createdAt: true,
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: currentUser.id,
      action: '创建管理员',
      detail: `${admin.name}（${admin.email}）`,
    },
  })

  return NextResponse.json(admin, { status: 201 })
})
