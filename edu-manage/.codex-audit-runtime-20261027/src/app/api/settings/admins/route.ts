import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { getPasswordPolicyError } from '@/lib/password-policy'
import { requireSuperAdmin } from '@/lib/get-user'
import { normalizeLoginPhone } from '@/lib/login-accounts'

export const dynamic = 'force-dynamic'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string; division?: string } | undefined
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
      phone: true,
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
  // 创建管理员属于提权操作，仅最高权益管理员可执行。
  const currentUser = await requireSuperAdmin()
  const prisma = await getRequestPrisma()

  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const phone = rawPhone ? normalizeLoginPhone(rawPhone) : null
  const currentDivision = currentUser.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'

  if (!emailPattern.test(email)) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
  }
  if (rawPhone && !phone) {
    return NextResponse.json({ error: '请输入有效的11位中国大陆手机号' }, { status: 400 })
  }
  if (phone && await prisma.user.findUnique({ where: { phone }, select: { id: true } })) {
    return NextResponse.json({ error: '该手机号已绑定其他管理账号' }, { status: 409 })
  }
  const passwordError = getPasswordPolicyError(password, { identifiers: [email, name, phone || ''] })
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: '邮箱已被占用' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: 'admin',
        status: 'active',
        division: currentDivision,
        phone,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        status: true,
        createdAt: true,
      },
    })
    await tx.activityLog.create({
      data: {
        userId: currentUser.id,
        action: 'PASSWORD_INITIALIZED',
        detail: `创建管理员账号：${created.name}（${created.email}）`,
        entityType: 'User',
        entityId: created.id,
        metadata: { source: 'ADMIN_CREATE' },
      },
    })
    return created
  })

  return NextResponse.json(admin, { status: 201 })
})
