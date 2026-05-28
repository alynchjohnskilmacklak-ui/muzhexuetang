import { prisma } from '@/lib/prisma'
import { chineseToPinyin } from '@/lib/pinyin'
import bcrypt from 'bcryptjs'

export type LoginRole = 'admin' | 'teacher' | 'parent'
export type LoginFailReason = 'wrong_password' | 'not_found' | 'locked' | 'disabled'

const ADMIN_ACCOUNTS: Record<string, { password: string; name: string }> = {
  'renwentao@nuc.com': { password: 'ren031213', name: '任文涛' },
  'mashaokun@nuc.com': { password: 'mashaokun', name: '马少坤' },
}

export const LOCK_WINDOW_MINUTES = 30
export const MAX_FAIL_ATTEMPTS = 5

type LoginUser = {
  id: string
  email: string
  name: string
  role: LoginRole
}

type ValidationResult =
  | { ok: true; user: LoginUser }
  | { ok: false; error: string; code: 'BAD_USERNAME' | 'BAD_PASSWORD' | 'BAD_ROLE' | 'DISABLED' | 'LOCKED' }

export function normalizeLoginEmail(emailInput: string) {
  return emailInput.trim().toLowerCase()
}

export async function getLoginStatus(emailInput: string) {
  const email = normalizeLoginEmail(emailInput)
  if (!email) return { locked: false, failCount: 0, remaining: MAX_FAIL_ATTEMPTS }

  const lockWindowStart = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000)
  const failCount = await prisma.loginRecord.count({
    where: {
      email,
      success: false,
      failReason: { not: 'locked' },
      createdAt: { gte: lockWindowStart },
    },
  })

  return {
    locked: failCount >= MAX_FAIL_ATTEMPTS,
    failCount,
    remaining: Math.max(0, MAX_FAIL_ATTEMPTS - failCount),
  }
}

async function recordLoginFailure(email: string, failReason: LoginFailReason, userId?: string) {
  await prisma.loginRecord.create({
    data: {
      userId,
      email,
      success: false,
      failReason,
    },
  })
}

async function recordLoginSuccess(user: LoginUser) {
  await prisma.loginRecord.create({
    data: {
      userId: user.id,
      email: user.email,
      success: true,
    },
  })
}

async function findTeacherByLoginEmail(email: string) {
  const teachers = await prisma.teacher.findMany({
    where: { status: { not: 'RESIGNED' } },
    select: { id: true, name: true },
  })
  return teachers.find((teacher) => `${chineseToPinyin(teacher.name)}@tea.com` === email) || null
}

export async function detectLoginRole(emailInput: string): Promise<LoginRole | null> {
  const email = normalizeLoginEmail(emailInput)
  if (!email) return null
  if (ADMIN_ACCOUNTS[email]) return 'admin'
  if (await findTeacherByLoginEmail(email)) return 'teacher'
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  })
  return user?.role === 'parent' ? 'parent' : null
}

async function verifyPassword(plainPassword: string, storedPassword: string): Promise<boolean> {
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
    return bcrypt.compare(plainPassword, storedPassword)
  }
  return storedPassword === plainPassword
}

async function upgradePasswordIfNeeded(email: string, plainPassword: string, storedPassword: string) {
  if (!(storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$'))) {
    const hash = await bcrypt.hash(plainPassword, 10)
    await prisma.user.update({ where: { email }, data: { password: hash } })
  }
}

async function getOrCreateUser(
  email: string,
  plainPassword: string,
  name: string,
  role: LoginRole,
  persistUser: boolean
): Promise<LoginUser> {
  if (!persistUser) {
    return { id: `${role}-preview`, email, name, role }
  }

  const hash = await bcrypt.hash(plainPassword, 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, password: hash, name, role, status: 'active' },
  })
  return { id: user.id, email: user.email, name: user.name, role }
}

export async function validateLoginAccount(
  emailInput: string,
  passwordInput: string,
  loginRole: LoginRole,
  options: { persistUser?: boolean; recordAttempt?: boolean; recordSuccess?: boolean } = {}
): Promise<ValidationResult> {
  const email = normalizeLoginEmail(emailInput)
  const password = passwordInput.trim()

  if (options.recordAttempt) {
    const status = await getLoginStatus(email)
    if (status.locked) {
      await recordLoginFailure(email, 'locked')
      return { ok: false, error: '密码连续错误次数过多，账号已临时锁定，请30分钟后重试', code: 'LOCKED' }
    }
  }

  const actualRole = await detectLoginRole(email)

  if (!actualRole) {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found')
    return { ok: false, error: '用户名输入错误', code: 'BAD_USERNAME' }
  }
  if (actualRole !== loginRole) {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found')
    return { ok: false, error: '身份不对，请切换到正确入口登录', code: 'BAD_ROLE' }
  }

  if (loginRole === 'admin') {
    const account = ADMIN_ACCOUNTS[email]
    if (!account) {
      if (options.recordAttempt) await recordLoginFailure(email, 'not_found')
      return { ok: false, error: '用户名输入错误', code: 'BAD_USERNAME' }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      if (existingUser.status === 'disabled') {
        if (options.recordAttempt) await recordLoginFailure(email, 'disabled', existingUser.id)
        return { ok: false, error: '账号已停用', code: 'DISABLED' }
      }
      const pwdOk = await verifyPassword(password, existingUser.password)
      if (!pwdOk) {
        if (options.recordAttempt) await recordLoginFailure(email, 'wrong_password', existingUser.id)
        return { ok: false, error: '密码错误', code: 'BAD_PASSWORD' }
      }
      await upgradePasswordIfNeeded(email, password, existingUser.password)
      const user = { id: existingUser.id, email: existingUser.email, name: existingUser.name, role: 'admin' as const }
      if (options.recordSuccess) await recordLoginSuccess(user)
      return { ok: true, user }
    }

    if (account.password !== password) {
      if (options.recordAttempt) await recordLoginFailure(email, 'wrong_password')
      return { ok: false, error: '密码错误', code: 'BAD_PASSWORD' }
    }
    const user = await getOrCreateUser(email, password, account.name, 'admin', !!options.persistUser)
    if (options.recordSuccess) await recordLoginSuccess(user)
    return { ok: true, user }
  }

  if (loginRole === 'teacher') {
    const teacher = await findTeacherByLoginEmail(email)
    if (!teacher) {
      if (options.recordAttempt) await recordLoginFailure(email, 'not_found')
      return { ok: false, error: '用户名输入错误', code: 'BAD_USERNAME' }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser?.status === 'disabled') {
      if (options.recordAttempt) await recordLoginFailure(email, 'disabled', existingUser.id)
      return { ok: false, error: '账号已停用', code: 'DISABLED' }
    }

    const teacherPassword = chineseToPinyin(teacher.name)
    if (password !== teacherPassword) {
      if (options.recordAttempt) await recordLoginFailure(email, 'wrong_password', existingUser?.id)
      return { ok: false, error: '密码错误', code: 'BAD_PASSWORD' }
    }
    const user = await getOrCreateUser(email, password, teacher.name, 'teacher', !!options.persistUser)
    if (options.recordSuccess) await recordLoginSuccess(user)
    return { ok: true, user }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.role !== 'parent') {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found', user?.id)
    return { ok: false, error: '用户名输入错误', code: 'BAD_USERNAME' }
  }
  if (user.status === 'disabled') {
    if (options.recordAttempt) await recordLoginFailure(email, 'disabled', user.id)
    return { ok: false, error: '账号已停用', code: 'DISABLED' }
  }

  const pwdOk = await verifyPassword(password, user.password)
  if (!pwdOk) {
    if (options.recordAttempt) await recordLoginFailure(email, 'wrong_password', user.id)
    return { ok: false, error: '密码错误', code: 'BAD_PASSWORD' }
  }

  await upgradePasswordIfNeeded(email, password, user.password)
  const loginUser = { id: user.id, email: user.email, name: user.name, role: 'parent' as const }
  if (options.recordSuccess) await recordLoginSuccess(loginUser)
  return { ok: true, user: loginUser }
}
