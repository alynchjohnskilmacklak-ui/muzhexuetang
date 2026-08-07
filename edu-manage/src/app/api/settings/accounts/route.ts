import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/auth/guards'
import { isSuperAdminEmail } from '@/lib/super-admin'
import type { Prisma, PrismaClient } from '@prisma/client'
import { getPasswordPolicyError } from '@/lib/password-policy'
import { generateTemporaryPassword } from '@/lib/temporary-password'
import {
  isSupportedUserStatus,
  isUserActive,
  isUserDisabled,
  toStoredUserStatus,
  USER_ACTIVE_STORAGE_VALUES,
} from '@/lib/user-status'

export const dynamic = 'force-dynamic'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
async function requireAdmin() {
  return requireAdminUser()
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parentEmailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `${digits || Date.now()}@st.com`
}

type PasswordLogClient = PrismaClient | Prisma.TransactionClient

async function writePasswordLog(
  client: PasswordLogClient,
  actorId: string,
  targetUserId: string,
  action: 'PASSWORD_INITIALIZED' | 'PASSWORD_RESET_ADMIN',
  detail: string,
) {
  await client.activityLog.create({
    data: {
      userId: actorId,
      action,
      detail,
      entityType: 'User',
      entityId: targetUserId,
      metadata: { source: action === 'PASSWORD_INITIALIZED' ? 'ACCOUNT_CREATION' : 'ADMIN' },
    },
  })
}

async function writeLog(client: PrismaClient, userId: string, action: string, detail: string) {
  try {
    await client.activityLog.create({ data: { userId, action, detail } })
  } catch (error) {
    console.error('[settings:accounts] skipped activity log', error)
  }
}

async function assertCanDisableAdmin(client: PrismaClient, targetId: string, currentUserId: string) {
  if (targetId === currentUserId) {
    return '不能停用或删除自己的当前登录账号'
  }

  const [currentUser, target] = await Promise.all([
    client.user.findUnique({ where: { id: currentUserId }, select: { email: true, role: true } }),
    client.user.findUnique({ where: { id: targetId }, select: { email: true, role: true, status: true } }),
  ])
  if (
    isSuperAdminEmail(target?.email)
    && !isSuperAdminEmail(currentUser?.email)
  ) {
    return '最高权益管理员账号不可由普通管理员修改、停用或删除'
  }
  if (!target || !['admin', 'SUPER_ADMIN'].includes(target.role) || !isUserActive(target.status)) return null

  const activeAdmins = await client.user.count({
    where: { role: { in: ['admin', 'SUPER_ADMIN'] }, status: { in: [...USER_ACTIVE_STORAGE_VALUES] }, id: { not: targetId } },
  })
  return activeAdmins > 0 ? null : '至少需要保留一个可用管理员账号'
}

async function assertCanModifyProtectedAdmin(client: PrismaClient, targetId: string, currentUserId: string) {
  if (targetId === currentUserId) return null
  const [currentUser, target] = await Promise.all([
    client.user.findUnique({ where: { id: currentUserId }, select: { email: true } }),
    client.user.findUnique({ where: { id: targetId }, select: { email: true, role: true } }),
  ])
  if (
    isSuperAdminEmail(target?.email)
    && !isSuperAdminEmail(currentUser?.email)
  ) {
    return '最高权益管理员账号不可由普通管理员修改信息或权限'
  }
  return null
}

export const GET = apiHandler(async () => {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const [users, teachers, students] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['admin', 'SUPER_ADMIN', 'teacher', 'parent'] } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        lastLoginIp: true,
        lastLoginDevice: true,
        createdAt: true,
        password: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.teacher.findMany({
      select: { id: true, name: true, phone: true, email: true, subjects: true, status: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.student.findMany({
      select: { id: true, name: true, grade: true, parentName: true, parentPhone: true, parentId: true, parentUserId: true, status: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const passwordLogs = users.length
    ? await prisma.activityLog.findMany({
        where: {
          entityType: 'User',
          entityId: { in: users.map((user) => user.id) },
          action: { in: ['PASSWORD_INITIALIZED', 'PASSWORD_RESET_ADMIN', 'PASSWORD_RESET_LINK', 'PASSWORD_RESET', 'PASSWORD_CHANGED_SELF'] },
        },
        select: {
          entityId: true,
          action: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    : []
  const latestPasswordLog = new Map<string, typeof passwordLogs[number]>()
  for (const log of passwordLogs) {
    if (log.entityId && !latestPasswordLog.has(log.entityId)) latestPasswordLog.set(log.entityId, log)
  }
  const passwordSourceLabels: Record<string, string> = {
    PASSWORD_INITIALIZED: '账号创建',
    PASSWORD_RESET_ADMIN: '管理员重置',
    PASSWORD_RESET_LINK: '微信重置链接',
    PASSWORD_RESET: '微信重置链接',
    PASSWORD_CHANGED_SELF: '用户自行修改',
  }
  const toAccountDto = <T extends typeof users[number]>(account: T) => {
    const { password, ...safeAccount } = account
    const latest = latestPasswordLog.get(account.id)
    return {
      ...safeAccount,
      passwordSecurity: {
        encrypted: password.startsWith('$2'),
        changedAt: latest?.createdAt ?? null,
        source: latest ? passwordSourceLabels[latest.action] || '密码更新' : '暂无审计记录',
        history: passwordLogs
          .filter((log) => log.entityId === account.id)
          .map((log) => ({
            changedAt: log.createdAt,
            source: passwordSourceLabels[log.action] || '密码更新',
            operator: log.user?.name || log.user?.email || '系统',
          })),
      },
    }
  }

  const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]))
  const teacherUsers = users.filter((user) => user.role === 'teacher')
  const usersByRole = {
    admins: users.filter((user) => user.role === 'admin' || user.role === 'SUPER_ADMIN'),
    parents: users.filter((user) => user.role === 'parent'),
  }

  const teacherAccounts = teachers.map((teacher) => {
    const generatedEmail = `${teacher.phone.replace(/\D/g, '')}@tea.com`
    const account = (teacher.email ? userByEmail.get(teacher.email.toLowerCase()) : undefined)
      || userByEmail.get(generatedEmail)
      || teacherUsers.find((user) => user.name === teacher.name)
    return { ...teacher, account: account ? toAccountDto(account) : null }
  })

  const parentAccounts = usersByRole.parents.map((parent) => ({
    ...toAccountDto(parent),
    students: students.filter((student) => student.parentId === parent.id || student.parentUserId === parent.id),
  }))

  return NextResponse.json({
    admins: usersByRole.admins.map(admin => ({
      ...toAccountDto(admin),
      isSuperAdmin: isSuperAdminEmail(admin.email),
    })),
    teachers: teacherAccounts,
    parents: parentAccounts,
    studentsWithoutParent: students.filter((student) => !student.parentId && !student.parentUserId),
  })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const body = await req.json().catch(() => ({}))
  const role = normalizeText(body.role)
  const name = normalizeText(body.name)
  const explicitPassword = typeof body.password === 'string' ? body.password : ''
  const teacherId = normalizeText(body.teacherId)
  const studentIds = Array.isArray(body.studentIds) ? body.studentIds.filter((id: unknown): id is string => typeof id === 'string') : []

  if (!['admin', 'teacher', 'parent'].includes(role)) {
    return NextResponse.json({ error: '账号类型无效' }, { status: 400 })
  }

  if (role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } })
    if (!teacher) return NextResponse.json({ error: '教师不存在' }, { status: 404 })
    const email = normalizeEmail(body.email) || teacher.email?.toLowerCase() || `${teacher.phone.replace(/\D/g, '')}@tea.com`
    if (!emailPattern.test(email)) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { teacherId: teacher.id }] },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ error: '该教师已有关联账号或邮箱已被占用' }, { status: 409 })

    const plainPassword = explicitPassword || generateTemporaryPassword()
    const policyError = getPasswordPolicyError(plainPassword, { identifiers: [email, teacher.phone, teacher.name] })
    if (policyError) return NextResponse.json({ error: policyError }, { status: 400 })

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          password: await bcrypt.hash(plainPassword, 12),
          name: teacher.name,
          role: 'teacher',
          status: 'active',
          division: teacher.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR',
          teacherId: teacher.id,
        },
        select: { id: true, email: true, name: true, role: true, status: true },
      })
      await writePasswordLog(tx, currentUser.id, created.id, 'PASSWORD_INITIALIZED', `创建教师账号：${created.name}（${created.email}）`)
      return created
    })
    await writeLog(prisma, currentUser.id, '创建教师账号', `${teacher.name}（${email}）`)
    return NextResponse.json({ user, initialPassword: plainPassword }, { status: 201 })
  }

  if (role === 'parent') {
    const phone = normalizeText(body.phone)
    const email = normalizeEmail(body.email) || parentEmailFromPhone(phone)
    if (!name) return NextResponse.json({ error: '家长姓名不能为空' }, { status: 400 })
    if (!phone) return NextResponse.json({ error: '手机号不能为空' }, { status: 400 })
    if (!emailPattern.test(email)) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: '家长账号已存在或邮箱已被占用' }, { status: 409 })

    const plainPassword = explicitPassword || generateTemporaryPassword()
    const policyError = getPasswordPolicyError(plainPassword, { identifiers: [email, phone, name] })
    if (policyError) return NextResponse.json({ error: policyError }, { status: 400 })
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          password: await bcrypt.hash(plainPassword, 12),
          name,
          role: 'parent',
          status: 'active',
        },
        select: { id: true, email: true, name: true, role: true, status: true },
      })
      if (studentIds.length) {
        await tx.student.updateMany({
          where: { id: { in: studentIds } },
          data: { parentId: created.id, parentUserId: created.id, parentName: name, parentPhone: phone },
        })
      }
      await writePasswordLog(tx, currentUser.id, created.id, 'PASSWORD_INITIALIZED', `创建家长账号：${created.name}（${created.email}）`)
      return created
    })

    await writeLog(prisma, currentUser.id, '创建家长账号', `${name}（${email}），绑定学员 ${studentIds.length} 人`)
    return NextResponse.json({ user, initialPassword: plainPassword }, { status: 201 })
  }

  const email = normalizeEmail(body.email)
  if (!name) return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
  if (!emailPattern.test(email)) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
  const adminPasswordError = getPasswordPolicyError(explicitPassword, { identifiers: [email, name] })
  if (adminPasswordError) return NextResponse.json({ error: adminPasswordError }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: '邮箱已被占用' }, { status: 409 })

  const admin = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        password: await bcrypt.hash(explicitPassword, 12),
        name,
        role: 'admin',
        status: 'active',
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
    await writePasswordLog(tx, currentUser.id, created.id, 'PASSWORD_INITIALIZED', `创建管理员账号：${created.name}（${created.email}）`)
    return created
  })
  await writeLog(prisma, currentUser.id, '创建管理员', `${admin.name}（${admin.email}）`)
  return NextResponse.json({ user: admin }, { status: 201 })
})

export const PATCH = apiHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const body = await req.json().catch(() => ({}))
  const action = normalizeText(body.action)
  const userId = normalizeText(body.userId)

  if (action === 'status') {
    const requestedStatus = normalizeText(body.status)
    if (!isSupportedUserStatus(requestedStatus)) return NextResponse.json({ error: '状态无效' }, { status: 400 })
    const status = toStoredUserStatus(requestedStatus)

    const protectedGuard = await assertCanModifyProtectedAdmin(prisma, userId, currentUser.id)
    if (protectedGuard) return NextResponse.json({ error: protectedGuard }, { status: 400 })

    if (isUserDisabled(status)) {
      const guard = await assertCanDisableAdmin(prisma, userId, currentUser.id)
      if (guard) return NextResponse.json({ error: guard }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status, ...(isUserDisabled(status) ? { currentSessionToken: null } : {}) },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
    await writeLog(prisma, currentUser.id, isUserActive(status) ? '启用账号' : '停用账号', `${user.name}（${user.email}）`)
    return NextResponse.json({ ok: true, user })
  }

  if (action === 'reset-password') {
    const protectedGuard = await assertCanModifyProtectedAdmin(prisma, userId, currentUser.id)
    if (protectedGuard) return NextResponse.json({ error: protectedGuard }, { status: 400 })

    const password = typeof body.password === 'string' ? body.password : ''
    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
    if (!targetUser) return NextResponse.json({ error: '账号不存在' }, { status: 404 })
    const policyError = getPasswordPolicyError(password, { identifiers: [targetUser.email, targetUser.name] })
    if (policyError) return NextResponse.json({ error: policyError }, { status: 400 })

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { password: await bcrypt.hash(password, 12), currentSessionToken: null },
        select: { id: true, email: true, name: true },
      })
      await writePasswordLog(tx, currentUser.id, updated.id, 'PASSWORD_RESET_ADMIN', `管理员重置账号密码：${updated.name}（${updated.email}）`)
      return updated
    })
    await writeLog(prisma, currentUser.id, '重置账号密码', `${user.name}（${user.email}）`)
    return NextResponse.json({ ok: true })
  }

  if (action === 'update') {
    const protectedGuard = await assertCanModifyProtectedAdmin(prisma, userId, currentUser.id)
    if (protectedGuard) return NextResponse.json({ error: protectedGuard }, { status: 400 })

    const email = normalizeEmail(body.email)
    const name = normalizeText(body.name)
    if (!name) return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
    if (!emailPattern.test(email)) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
    await writeLog(prisma, currentUser.id, '编辑账号', `${user.name}（${user.email}）`)
    return NextResponse.json({ ok: true, user })
  }

  if (action === 'bind-students') {
    const studentIds = Array.isArray(body.studentIds) ? body.studentIds.filter((id: unknown): id is string => typeof id === 'string') : []
    const parent = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } })
    if (!parent || parent.role !== 'parent') return NextResponse.json({ error: '家长账号不存在' }, { status: 404 })

    await prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { parentId: parent.id, parentUserId: parent.id, parentName: parent.name },
    })
    await writeLog(prisma, currentUser.id, '绑定家长学员', `${parent.name}，绑定 ${studentIds.length} 人`)
    return NextResponse.json({ ok: true })
  }

  if (action === 'unbind-student') {
    const studentId = normalizeText(body.studentId)
    await prisma.student.update({
      where: { id: studentId },
      data: { parentId: null, parentUserId: null },
    })
    await writeLog(prisma, currentUser.id, '解绑家长学员', studentId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 })
})

export const DELETE = apiHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || ''
  const guard = await assertCanDisableAdmin(prisma, userId, currentUser.id)
  if (guard) return NextResponse.json({ error: guard }, { status: 400 })

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: 'disabled', currentSessionToken: null },
    select: { id: true, email: true, name: true },
  })
  await writeLog(prisma, currentUser.id, '停用账号', `${user.name}（${user.email}）`)
  return NextResponse.json({ ok: true })
})
