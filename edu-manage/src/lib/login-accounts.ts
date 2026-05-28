import { prisma } from '@/lib/prisma'
import { chineseToPinyin } from '@/lib/pinyin'
import bcrypt from 'bcryptjs'

export type LoginRole = 'admin' | 'teacher' | 'parent'
export type LoginFailReason = 'wrong_password' | 'not_found' | 'locked' | 'disabled' | 'uninitialized'

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

type TeacherLoginAccount = {
  id: string
  name: string
  phone: string
}

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

async function findTeacherByLoginEmail(email: string): Promise<TeacherLoginAccount | null> {
  const teachers = await prisma.teacher.findMany({
    where: { status: { not: 'RESIGNED' } },
    select: { id: true, name: true, phone: true },
  })
  return teachers.find((teacher) => `${chineseToPinyin(teacher.name)}@tea.com` === email) || null
}

export async function detectLoginRole(emailInput: string): Promise<LoginRole | null> {
  const email = normalizeLoginEmail(emailInput)
  if (!email) return null

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  })
  if (user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'parent') return user.role

  if (await findTeacherByLoginEmail(email)) return 'teacher'
  return null
}

async function verifyPassword(plainPassword: string, storedPassword: string): Promise<boolean> {
  if (!storedPassword.startsWith('$2')) return false
  return bcrypt.compare(plainPassword, storedPassword)
}

function toLoginUser(user: { id: string; email: string; name: string; role: string }): LoginUser | null {
  if (user.role !== 'admin' && user.role !== 'teacher' && user.role !== 'parent') return null
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

async function validateDatabaseUser(
  email: string,
  password: string,
  expectedRole: LoginRole,
  options: { recordAttempt?: boolean; recordSuccess?: boolean },
  teacher?: TeacherLoginAccount | null,
): Promise<ValidationResult> {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    if (options.recordAttempt) await recordLoginFailure(email, teacher ? 'uninitialized' : 'not_found')
    return {
      ok: false,
      error: teacher ? '账号未初始化，请联系管理员' : '用户名输入错误',
      code: 'BAD_USERNAME',
    }
  }

  if (user.role !== expectedRole) {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found', user.id)
    return { ok: false, error: '身份不对，请切换到正确入口登录', code: 'BAD_ROLE' }
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

  const loginUser = toLoginUser(user)
  if (!loginUser) {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found', user.id)
    return { ok: false, error: '身份不对，请切换到正确入口登录', code: 'BAD_ROLE' }
  }

  if (options.recordSuccess) await recordLoginSuccess(loginUser)
  return { ok: true, user: loginUser }
}

export async function validateLoginAccount(
  emailInput: string,
  passwordInput: string,
  loginRole: LoginRole,
  options: { persistUser?: boolean; recordAttempt?: boolean; recordSuccess?: boolean } = {},
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

  if (loginRole === 'teacher') {
    const teacher = await findTeacherByLoginEmail(email)
    if (!teacher) {
      if (options.recordAttempt) await recordLoginFailure(email, 'not_found')
      return { ok: false, error: '用户名输入错误', code: 'BAD_USERNAME' }
    }
    return validateDatabaseUser(email, password, 'teacher', options, teacher)
  }

  return validateDatabaseUser(email, password, loginRole, options)
}
