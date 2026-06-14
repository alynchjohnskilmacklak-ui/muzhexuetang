import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUPER_ADMIN_NAME = '任文涛'

type AdminSessionUser = { id: string; role: 'admin' }

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  return user?.id && user.role === 'admin' ? { id: user.id, role: 'admin' } satisfies AdminSessionUser : null
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function passwordFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 6 ? digits.slice(-6) : digits || '123456'
}

function parentEmailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `${digits || Date.now()}@st.com`
}

async function writeLog(client: any, userId: string, action: string, detail: string) {
  try {
    await client.activityLog.create({ data: { userId, action, detail } })
  } catch (error) {
    console.error('[settings:accounts] skipped activity log', error)
  }
}

async function assertCanDisableAdmin(client: any, targetId: string, currentUserId: string) {
  if (targetId === currentUserId) {
    return '不能停用或删除自己的当前登录账号'
  }

  const [currentUser, target] = await Promise.all([
    client.user.findUnique({ where: { id: currentUserId }, select: { name: true, role: true } }),
    client.user.findUnique({ where: { id: targetId }, select: { name: true, role: true, status: true } }),
  ])
  if (
    target?.role === 'admin'
    && target.name === SUPER_ADMIN_NAME
    && currentUser?.name !== SUPER_ADMIN_NAME
  ) {
    return `${SUPER_ADMIN_NAME}为最高权益管理员，其他管理员不可修改、停用或删除该账号`
  }
  if (target?.role !== 'admin' || target.status !== 'active') return null

  const activeAdmins = await prisma.user.count({
    where: { role: 'admin', status: 'active', id: { not: targetId } },
  })
  return activeAdmins > 0 ? null : '至少需要保留一个可用管理员账号'
}

async function assertCanModifyProtectedAdmin(targetId: string, currentUserId: string) {
  if (targetId === currentUserId) return null
  const [currentUser, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { name: true, role: true } }),
  ])
  if (
    target?.role === 'admin'
    && target.name === SUPER_ADMIN_NAME
    && currentUser?.name !== SUPER_ADMIN_NAME
  ) {
    return `${SUPER_ADMIN_NAME}为最高权益管理员，其他管理员不可修改该账号信息或权限`
  }
  return null
}

export const GET = apiHandler(async () => {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const [users, teachers, students] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['admin', 'teacher', 'parent'] } },
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

  const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]))
  const teacherUsers = users.filter((user) => user.role === 'teacher')
  const usersByRole = {
    admins: users.filter((user) => user.role === 'admin'),
    parents: users.filter((user) => user.role === 'parent'),
  }

  const teacherAccounts = teachers.map((teacher) => {
    const generatedEmail = `${teacher.phone.replace(/\D/g, '')}@tea.com`
    const account = (teacher.email ? userByEmail.get(teacher.email.toLowerCase()) : undefined)
      || userByEmail.get(generatedEmail)
      || teacherUsers.find((user) => user.name === teacher.name)
    return { ...teacher, account: account || null }
  })

  const parentAccounts = usersByRole.parents.map((parent) => ({
    ...parent,
    students: students.filter((student) => student.parentId === parent.id || student.parentUserId === parent.id),
  }))

  return NextResponse.json({
    admins: usersByRole.admins,
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

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: '该教师已有关联账号或邮箱已被占用' }, { status: 409 })

    const plainPassword = explicitPassword || passwordFromPhone(teacher.phone)
    if (plainPassword.length < 6) return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 })

    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(plainPassword, 12),
        name: teacher.name,
        role: 'teacher',
        status: 'active',
      },
      select: { id: true, email: true, name: true, role: true, status: true },
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

    const plainPassword = explicitPassword || passwordFromPhone(phone)
    const user = await prisma.user.create({
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
      await prisma.student.updateMany({
        where: { id: { in: studentIds } },
        data: { parentId: user.id, parentUserId: user.id, parentName: name, parentPhone: phone },
      })
    }

    await writeLog(prisma, currentUser.id, '创建家长账号', `${name}（${email}），绑定学员 ${studentIds.length} 人`)
    return NextResponse.json({ user, initialPassword: plainPassword }, { status: 201 })
  }

  const email = normalizeEmail(body.email)
  if (!name) return NextResponse.json({ error: '姓名不能为空' }, { status: 400 })
  if (!emailPattern.test(email)) return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
  if (explicitPassword.length < 8) return NextResponse.json({ error: '管理员密码至少 8 位' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: '邮箱已被占用' }, { status: 409 })

  const admin = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(explicitPassword, 12),
      name,
      role: 'admin',
      status: 'active',
    },
    select: { id: true, email: true, name: true, role: true, status: true },
  })
  await writeLog(currentUser.id, '创建管理员', `${admin.name}（${admin.email}）`)
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
    const status = normalizeText(body.status)
    if (!['active', 'disabled'].includes(status)) return NextResponse.json({ error: '状态无效' }, { status: 400 })

    const protectedGuard = await assertCanModifyProtectedAdmin(userId, currentUser.id)
    if (protectedGuard) return NextResponse.json({ error: protectedGuard }, { status: 400 })

    if (status === 'disabled') {
      const guard = await assertCanDisableAdmin(prisma, userId, currentUser.id)
      if (guard) return NextResponse.json({ error: guard }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status, ...(status === 'disabled' ? { currentSessionToken: null } : {}) },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
    await writeLog(prisma, currentUser.id, status === 'active' ? '启用账号' : '停用账号', `${user.name}（${user.email}）`)
    return NextResponse.json({ ok: true, user })
  }

  if (action === 'reset-password') {
    const protectedGuard = await assertCanModifyProtectedAdmin(userId, currentUser.id)
    if (protectedGuard) return NextResponse.json({ error: protectedGuard }, { status: 400 })

    const password = typeof body.password === 'string' ? body.password : ''
    if (password.length < 6) return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 })

    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(password, 12), currentSessionToken: null },
      select: { id: true, email: true, name: true },
    })
    await writeLog(prisma, currentUser.id, '重置账号密码', `${user.name}（${user.email}）`)
    return NextResponse.json({ ok: true })
  }

  if (action === 'update') {
    const protectedGuard = await assertCanModifyProtectedAdmin(userId, currentUser.id)
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
  const guard = await assertCanDisableAdmin(userId, currentUser.id)
  if (guard) return NextResponse.json({ error: guard }, { status: 400 })

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: 'disabled', currentSessionToken: null },
    select: { id: true, email: true, name: true },
  })
  await writeLog(currentUser.id, '停用账号', `${user.name}（${user.email}）`)
  return NextResponse.json({ ok: true })
})
