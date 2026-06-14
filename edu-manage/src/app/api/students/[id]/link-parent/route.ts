import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const prisma = await getRequestPrisma()
  const { id } = await params
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const mode = body.mode as 'existing' | 'new' | undefined

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  if (mode === 'existing') {
    const existingParentUserId = typeof body.existingParentUserId === 'string' ? body.existingParentUserId : ''
    if (!existingParentUserId) return NextResponse.json({ error: '请选择家长账号' }, { status: 400 })

    const parentUser = await prisma.user.findFirst({
      where: { id: existingParentUserId, role: 'parent', status: { not: 'deleted' } },
      select: { id: true, name: true, email: true },
    })
    if (!parentUser) return NextResponse.json({ error: '家长账号不存在' }, { status: 404 })

    await prisma.student.update({
      where: { id },
      data: { parentId: parentUser.id, parentUserId: parentUser.id },
    })

    return NextResponse.json({
      success: true,
      parentId: parentUser.id,
      parentName: parentUser.name,
      message: `已将 ${student.name} 绑定到 ${parentUser.name || parentUser.email} 的家长账号`,
    })
  }

  if (mode === 'new') {
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const password = typeof body.password === 'string' ? body.password.trim() : ''
    if (!email) return NextResponse.json({ error: '请输入登录邮箱' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.role !== 'parent') {
      return NextResponse.json({ error: '该邮箱已被其他角色使用' }, { status: 409 })
    }

    let initialPassword: string | null = null
    const parentUser = existing || await (async () => {
      const plainPwd = password || email.split('@')[0]
      initialPassword = plainPwd
      const hashed = await bcrypt.hash(plainPwd, 10)
      return prisma.user.create({
        data: {
          email,
          password: hashed,
          name: name || student.parentName || `${student.name}家长`,
          role: 'parent',
        },
      })
    })()

    if (existing && existing.status !== 'active') {
      await prisma.user.update({
        where: { id: existing.id },
        data: { status: 'active' },
      })
    }

    await prisma.student.update({
      where: { id },
      data: { parentId: parentUser.id, parentUserId: parentUser.id },
    })

    return NextResponse.json({
      success: true,
      parentId: parentUser.id,
      email,
      password: initialPassword,
      message: existing
        ? `该邮箱已是家长账号，已将 ${student.name} 绑定到该账号`
        : `家长账号已创建，账号：${email}，密码：${initialPassword}`,
    })
  }

  return NextResponse.json({ error: '无效的绑定方式' }, { status: 400 })
})

export const DELETE = apiHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const prisma = await getRequestPrisma()
  const { id } = await params
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const student = await prisma.student.findUnique({ where: { id }, select: { id: true } })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  await prisma.student.update({
    where: { id },
    data: { parentId: null, parentUserId: null },
  })

  return NextResponse.json({ success: true })
})
