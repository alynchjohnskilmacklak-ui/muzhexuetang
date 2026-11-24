import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'
import { isUserActive } from '@/lib/user-status'
import { chineseToPinyin } from '@/lib/pinyin'
import { getPasswordPolicyError } from '@/lib/password-policy'
import { AUTO_DISABLED_PARENT_SESSION_TOKEN } from '@/lib/parent-account-validity'

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
  const actorId = (session.user as { id?: string }).id
  if (!actorId) return NextResponse.json({ error: '登录状态无效，请重新登录' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const mode = body.mode as 'existing' | 'new' | undefined

  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  if (mode === 'existing') {
    const existingParentUserId = typeof body.existingParentUserId === 'string' ? body.existingParentUserId : ''
    if (!existingParentUserId) return NextResponse.json({ error: '请选择家长账号' }, { status: 400 })

    const parentUser = await prisma.user.findFirst({
      where: { id: existingParentUserId, role: 'parent', status: { not: 'deleted' } },
      select: { id: true, name: true, email: true, status: true, currentSessionToken: true },
    })
    if (!parentUser) return NextResponse.json({ error: '家长账号不存在' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${parentUser.id} FOR UPDATE`
      if (parentUser.status === 'disabled' && parentUser.currentSessionToken === AUTO_DISABLED_PARENT_SESSION_TOKEN) {
        await tx.user.updateMany({
          where: { id: parentUser.id, role: 'parent', status: 'disabled', currentSessionToken: AUTO_DISABLED_PARENT_SESSION_TOKEN },
          data: { status: 'active', currentSessionToken: null },
        })
      }
      await tx.student.update({
        where: { id },
        data: { parentId: parentUser.id, parentUserId: parentUser.id },
      })
      await tx.activityLog.create({
        data: {
          userId: actorId,
          action: 'PARENT_ACCOUNT_BOUND',
          detail: `为学生 ${student.name} 绑定已有家长账号 ${parentUser.email}`,
          entityType: 'Student',
          entityId: student.id,
        },
      })
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
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email) return NextResponse.json({ error: '请输入登录邮箱' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.role !== 'parent') {
      return NextResponse.json({ error: '该邮箱已被其他角色使用' }, { status: 409 })
    }

    const initialPassword = existing ? null : (password || chineseToPinyin(student.name))
    if (!existing && !initialPassword) return NextResponse.json({ error: '学员姓名无法生成拼音初始密码，请检查姓名后重试' }, { status: 400 })
    if (password && initialPassword) {
      const passwordError = getPasswordPolicyError(initialPassword, { identifiers: [email, name, student.name] })
      if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const parentUser = await prisma.$transaction(async (tx) => {
      const linkedParent = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: !isUserActive(existing.status) ? { status: 'active' } : {},
          })
        : await tx.user.create({
            data: {
              email,
              password: await bcrypt.hash(initialPassword!, 12),
              name: name || student.parentName || `${student.name}家长`,
              role: 'parent',
              division: student.division,
            },
          })

      await tx.student.update({
        where: { id },
        data: { parentId: linkedParent.id, parentUserId: linkedParent.id },
      })
      await tx.activityLog.create({
        data: {
          userId: actorId,
          action: existing ? 'PARENT_ACCOUNT_BOUND' : 'PASSWORD_INITIALIZED',
          detail: existing
            ? `为学生 ${student.name} 绑定家长账号 ${email}`
            : `创建并绑定家长账号：${email}`,
          entityType: existing ? 'Student' : 'User',
          entityId: existing ? student.id : linkedParent.id,
          metadata: existing ? undefined : { source: 'STUDENT_PARENT_BIND' },
        },
      })
      return linkedParent
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

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, division: true, parentId: true, parentUserId: true, name: true },
  })
  if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  const parentIds = [...new Set([student.parentId, student.parentUserId].filter((parentId): parentId is string => Boolean(parentId)))].sort()
  let disabledCount = 0
  await prisma.$transaction(async (tx) => {
    for (const parentId of parentIds) {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${parentId} FOR UPDATE`
    }
    await tx.student.update({ where: { id }, data: { parentId: null, parentUserId: null } })

    const activeTerm = await tx.academicTerm.findFirst({
      where: { division: student.division, status: 'ACTIVE' },
      select: { id: true },
      orderBy: { startDate: 'desc' },
    })

    for (const parentId of parentIds) {
      const account = await tx.user.findFirst({
        where: { id: parentId, role: 'parent', division: student.division },
        select: { id: true, status: true },
      })
      if (!account || account.status !== 'active') continue

      const remainingChild = await tx.student.findFirst({
        where: {
          division: student.division,
          OR: [{ parentId }, { parentUserId: parentId }],
          status: { notIn: ['INACTIVE', 'ARCHIVED'] },
          deletedAt: null,
          ...(activeTerm ? { termMemberships: { some: { termId: activeTerm.id, status: 'ACTIVE' } } } : {}),
        },
        select: { id: true },
      })
      if (remainingChild) continue

      const disabled = await tx.user.updateMany({
        where: { id: parentId, role: 'parent', division: student.division, status: 'active' },
        data: { status: 'disabled', currentSessionToken: AUTO_DISABLED_PARENT_SESSION_TOKEN },
      })
      disabledCount += disabled.count
    }

    await tx.activityLog.create({
      data: {
        userId: (session.user as { id: string }).id,
        action: 'PARENT_ACCOUNT_UNBOUND',
        detail: `解除学生 ${student.name} 的家长账号绑定${disabledCount ? '，无其他在册子女的家长账号已停用' : ''}`,
        entityType: 'Student',
        entityId: student.id,
      },
    })
  })

  return NextResponse.json({ success: true, parentAccountDisabled: disabledCount > 0 })
})
