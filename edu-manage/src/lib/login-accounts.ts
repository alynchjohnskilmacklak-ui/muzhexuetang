import { prisma, getPrismaForDivision, isDualDbEnabled } from '@/lib/prisma'
import { chineseToPinyin } from '@/lib/pinyin'
import bcrypt from 'bcryptjs'
import type { PrismaClient } from '@prisma/client'
/**
 * Resolve the prisma client for a login attempt. In dual-DB mode the client
 * for the requested division is used; otherwise the legacy single client.
 * Returns null if dual-DB is on but division is missing/invalid (a hard error
 * the caller should surface to the user).
 */
function isLoginDivision(value: string | undefined): value is 'JUNIOR' | 'SENIOR' {
  return value === 'JUNIOR' || value === 'SENIOR'
}

function hasInvalidDualDbDivision(division: string | undefined) {
  return isDualDbEnabled() && !isLoginDivision(division)
}

function resolveLoginPrisma(division: string | undefined): PrismaClient | null {
  if (!isDualDbEnabled()) return prisma
  if (!isLoginDivision(division)) return null
  return getPrismaForDivision(division)
}
export type LoginRole = 'admin' | 'teacher' | 'parent'
export type LoginFailReason = 'wrong_password' | 'not_found' | 'locked' | 'disabled' | 'uninitialized'

export const LOCK_WINDOW_MINUTES = 30
export const MAX_FAIL_ATTEMPTS = 5

type LoginUser = {
  id: string
  email: string
  name: string
  role: LoginRole
  division: string
}

type ValidationResult =
  | { ok: true; user: LoginUser }
  | { ok: false; error: string; code: 'BAD_USERNAME' | 'BAD_PASSWORD' | 'BAD_ROLE' | 'BAD_DIVISION' | 'DISABLED' | 'LOCKED' }

type TeacherLoginAccount = {
  id: string
  name: string
  phone: string
}


type RequestMeta = { ip?: string; userAgent?: string; device?: string; os?: string; browser?: string }
export function normalizeLoginEmail(emailInput: string) {
  return emailInput.trim().toLowerCase()
}

export async function getLoginStatus(emailInput: string, division?: string) {
  const email = normalizeLoginEmail(emailInput)
  if (!email) return { locked: false, failCount: 0, remaining: MAX_FAIL_ATTEMPTS }

  const lockWindowStart = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000)
  const db = resolveLoginPrisma(division)
  if (!db) return { locked: false, failCount: 0, remaining: MAX_FAIL_ATTEMPTS }
  const failCount = await db.loginRecord.count({
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

async function recordLoginFailure(email: string, failReason: LoginFailReason, userId?: string, meta?: RequestMeta, division?: string) {
  const db = resolveLoginPrisma(division)
  if (!db) return
  await db.loginRecord.create({
    data: {
      userId,
      email,
      success: false,
      failReason,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      device: meta?.device,
      os: meta?.os,
      browser: meta?.browser,
    },
  })
}

async function recordLoginSuccess(user: LoginUser, meta?: RequestMeta, division?: string) {
  const db = resolveLoginPrisma(division)
  if (!db) return
  await db.loginRecord.create({
    data: {
      userId: user.id,
      email: user.email,
      success: true,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      device: meta?.device,
      os: meta?.os,
      browser: meta?.browser,
    },
  })
}

async function findTeacherByLoginEmail(email: string, division?: string): Promise<TeacherLoginAccount | null> {
  const db = resolveLoginPrisma(division)
  if (!db) return null
  const teachers = await db.teacher.findMany({
    where: { status: { not: 'RESIGNED' } },
    select: { id: true, name: true, phone: true },
  })
  return teachers.find((teacher) => `${chineseToPinyin(teacher.name)}@tea.com` === email) || null
}

export async function detectLoginRole(emailInput: string, division?: string): Promise<LoginRole | null> {
  const email = normalizeLoginEmail(emailInput)
  if (!email) return null

  const db = resolveLoginPrisma(division)
  if (!db) return null
  const user = await db.user.findUnique({
    where: { email },
    select: { role: true },
  })
  if (user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'parent') return user.role

  if (await findTeacherByLoginEmail(email, division)) return 'teacher'
  return null
}

async function verifyPassword(plainPassword: string, storedPassword: string): Promise<boolean> {
  if (!storedPassword.startsWith('$2')) return false
  return bcrypt.compare(plainPassword, storedPassword)
}

function toLoginUser(user: { id: string; email: string; name: string; role: string; division?: string | null }): LoginUser | null {
  if (user.role !== 'admin' && user.role !== 'teacher' && user.role !== 'parent') return null
  const division = user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  return { id: user.id, email: user.email, name: user.name, role: user.role, division }
}

async function validateDatabaseUser(
  email: string,
  password: string,
  expectedRole: LoginRole,
  options: { recordAttempt?: boolean; recordSuccess?: boolean },
  teacher?: TeacherLoginAccount | null,
  meta?: RequestMeta,
  division?: string,
): Promise<ValidationResult> {
  const db = resolveLoginPrisma(division)
  if (db === null) {
    return { ok: false, error: 'Missing division', code: 'BAD_DIVISION' }
  }
  const user = await db.user.findUnique({ where: { email } })

  if (!user) {
    if (options.recordAttempt) await recordLoginFailure(email, teacher ? 'uninitialized' : 'not_found', undefined, meta, division)
    return {
      ok: false,
      error: teacher ? '账号未初始化，请联系管理员' : '用户名输入错误',
      code: 'BAD_USERNAME',
    }
  }

  if (user.role !== expectedRole) {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found', user.id, meta, division)
    return { ok: false, error: '身份不对，请切换到正确入口登录', code: 'BAD_ROLE' }
  }

  if (user.status === 'disabled' || user.status === 'INACTIVE' || user.status === 'inactive') {
    if (options.recordAttempt) await recordLoginFailure(email, 'disabled', user.id, meta, division)
    return { ok: false, error: '账号已停用，请联系管理员', code: 'DISABLED' }
  }

  const pwdOk = await verifyPassword(password, user.password)
  if (!pwdOk) {
    if (options.recordAttempt) await recordLoginFailure(email, 'wrong_password', user.id, meta, division)
    return { ok: false, error: '密码错误', code: 'BAD_PASSWORD' }
  }

  const loginUser = toLoginUser(user)
  if (!loginUser) {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found', user.id, meta, division)
    return { ok: false, error: '身份不对，请切换到正确入口登录', code: 'BAD_ROLE' }
  }

  const effectiveDivision =
    isDualDbEnabled() && division === 'SENIOR' ? 'SENIOR'
    : isDualDbEnabled() && division === 'JUNIOR' ? 'JUNIOR'
    : loginUser.division === 'SENIOR' ? 'SENIOR'
    : 'JUNIOR'

  const scopedLoginUser = {
    ...loginUser,
    division: effectiveDivision,
  }

  if (options.recordSuccess) await recordLoginSuccess(scopedLoginUser, meta, effectiveDivision)
  return { ok: true, user: scopedLoginUser }
}

export async function validateLoginAccount(
  emailInput: string,
  passwordInput: string,
  loginRole: LoginRole,
  options: { persistUser?: boolean; recordAttempt?: boolean; recordSuccess?: boolean } = {},
  meta?: RequestMeta,
  division?: string,
): Promise<ValidationResult> {
  const email = normalizeLoginEmail(emailInput)
  const password = passwordInput.trim()

  if (hasInvalidDualDbDivision(division)) {
    return { ok: false, error: 'Missing division', code: 'BAD_DIVISION' }
  }

  if (options.recordAttempt) {
    const status = await getLoginStatus(email, division)
    if (status.locked) {
      await recordLoginFailure(email, 'locked', undefined, meta, division)
      return { ok: false, error: '密码连续错误次数过多，账号已临时锁定，请30分钟后重试', code: 'LOCKED' }
    }
  }

  const actualRole = await detectLoginRole(email, division)

  if (!actualRole) {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found', undefined, meta, division)
    return { ok: false, error: '用户名输入错误', code: 'BAD_USERNAME' }
  }
  if (actualRole !== loginRole) {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found', undefined, meta, division)
    return { ok: false, error: '身份不对，请切换到正确入口登录', code: 'BAD_ROLE' }
  }

  if (loginRole === 'teacher') {
    const teacher = await findTeacherByLoginEmail(email, division)
    if (!teacher) {
      if (options.recordAttempt) await recordLoginFailure(email, 'not_found', undefined, meta, division)
      return { ok: false, error: '用户名输入错误', code: 'BAD_USERNAME' }
    }
    return validateDatabaseUser(email, password, 'teacher', options, teacher, meta, division)
  }

  return validateDatabaseUser(email, password, loginRole, options, undefined, meta, division)
}
