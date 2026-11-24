import { prisma, getPrismaForDivision, isDualDbEnabled } from '@/lib/prisma'
import { chineseToPinyin } from '@/lib/pinyin'
import bcrypt from 'bcryptjs'
import type { PrismaClient } from '@prisma/client'
import { isUserDisabled } from '@/lib/user-status'
import { resolveTeacherForUser } from '@/lib/teacher-account-binding'
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
export type LoginIdentifierType = 'email' | 'phone'
export type LoginFailReason = 'wrong_password' | 'not_found' | 'locked' | 'disabled' | 'uninitialized'

export const LOCK_WINDOW_MINUTES = 30
export const MAX_FAIL_ATTEMPTS = 5

type LoginUser = {
  id: string
  email: string
  name: string
  role: LoginRole
  division: string
  teacherId: string | null
}

type ValidationResult =
  | { ok: true; user: LoginUser }
  | { ok: false; error: string; code: 'BAD_USERNAME' | 'BAD_PASSWORD' | 'BAD_ROLE' | 'BAD_DIVISION' | 'DISABLED' | 'LOCKED' | 'INVALID_PHONE' | 'AMBIGUOUS_PHONE' }

type TeacherLoginAccount = {
  id: string
  name: string
  phone: string
  status?: string
  division?: string | null
}

type PhoneTeacherProfile = Pick<TeacherLoginAccount, 'id' | 'name' | 'phone' | 'status' | 'division'> & {
  email: string | null
}

async function findTeacherProfileByPhone(db: PrismaClient, phone: string) {
  const candidates = await db.teacher.findMany({
    where: { phone: { contains: phone.slice(-4) }, status: { not: 'RESIGNED' } },
    select: { id: true, name: true, phone: true, email: true, status: true, division: true },
  })
  const matches = candidates.filter((teacher) => normalizeLoginPhone(teacher.phone) === phone)
  return {
    teacher: matches.length === 1 ? matches[0] as PhoneTeacherProfile : null,
    ambiguous: matches.length > 1,
  }
}

async function findAdminForTeacherProfile(db: PrismaClient, teacher: PhoneTeacherProfile) {
  const directlyBound = await db.user.findFirst({
    where: { role: 'admin', teacherId: teacher.id },
    select: { email: true },
  })
  if (directlyBound) return { email: normalizeLoginEmail(directlyBound.email), ambiguous: false }

  const candidates = await db.user.findMany({
    where: { role: 'admin', name: teacher.name },
    select: { email: true, name: true, teacherId: true },
    take: 3,
  })
  const matches = candidates.filter((user) =>
    user.name.trim() === teacher.name.trim() && (!user.teacherId || user.teacherId === teacher.id),
  )
  return {
    email: matches.length === 1 ? normalizeLoginEmail(matches[0].email) : null,
    ambiguous: matches.length > 1,
  }
}


type RequestMeta = { ip?: string; userAgent?: string; device?: string; os?: string; browser?: string }
export function normalizeLoginEmail(emailInput: string) {
  return emailInput.trim().toLowerCase()
}

export function normalizeLoginPhone(phoneInput: string) {
  let digits = phoneInput.trim().replace(/\D/g, '')
  if (digits.startsWith('0086') && digits.length === 15) digits = digits.slice(4)
  else if (digits.startsWith('86') && digits.length === 13) digits = digits.slice(2)
  return /^1[3-9]\d{9}$/.test(digits) ? digits : ''
}

/** Resolve a mobile number to the account selected by the user. */
export async function resolveLoginIdentifier(
  identifierInput: string,
  loginRole: LoginRole,
  division?: string,
  identifierType: LoginIdentifierType = 'email',
): Promise<{ ok: true; email: string; teacherId?: string } | Extract<ValidationResult, { ok: false }>> {
  if (identifierType === 'email') {
    const raw = normalizeLoginEmail(identifierInput)
    if (!raw) return { ok: false, error: '请输入账号或邮箱', code: 'BAD_USERNAME' }
    if (raw.includes('@')) {
      return { ok: true, email: raw }
    }
    const db = resolveLoginPrisma(division)
    if (db) {
      // 1. Direct match on user.email
      const direct = await db.user.findUnique({
        where: { email: raw },
        select: { email: true, teacherId: true },
      })
      if (direct) return { ok: true, email: normalizeLoginEmail(direct.email), teacherId: direct.teacherId ?? undefined }

      // 2. Parent email pattern: [pinyin]@st.com
      const stUser = await db.user.findUnique({
        where: { email: `${raw}@st.com` },
        select: { email: true },
      })
      if (stUser) return { ok: true, email: normalizeLoginEmail(stUser.email) }

      // 3. Teacher email pattern: [pinyin]@tea.com
      const teaUser = await db.user.findUnique({
        where: { email: `${raw}@tea.com` },
        select: { email: true, teacherId: true },
      })
      if (teaUser) return { ok: true, email: normalizeLoginEmail(teaUser.email), teacherId: teaUser.teacherId ?? undefined }

      // 4. Staff/admin or custom domain pattern
      const staffUser = await db.user.findFirst({
        where: {
          OR: [
            { email: `${raw}@nuc.com` },
            { email: `${raw}@muzhe.com` },
            { email: { startsWith: `${raw}@` } },
          ],
        },
        select: { email: true, teacherId: true },
      })
      if (staffUser) return { ok: true, email: normalizeLoginEmail(staffUser.email), teacherId: staffUser.teacherId ?? undefined }

      // 5. Legacy teacher pinyin lookup
      const legacyTeacher = await findTeacherByLoginEmail(`${raw}@tea.com`, division)
      if (legacyTeacher) {
        return { ok: true, email: `${raw}@tea.com`, teacherId: legacyTeacher.id }
      }
    }
    return { ok: true, email: raw }
  }

  const phone = normalizeLoginPhone(identifierInput)
  if (!phone) {
    return { ok: false, error: '请输入有效的11位中国大陆手机号', code: 'INVALID_PHONE' }
  }
  if (hasInvalidDualDbDivision(division)) {
    return { ok: false, error: 'Missing division', code: 'BAD_DIVISION' }
  }

  const db = resolveLoginPrisma(division)
  if (!db) return { ok: false, error: 'Missing division', code: 'BAD_DIVISION' }

  async function resolveAdmin(p: string) {
    if (!db) return null
    const admin = await db.user.findUnique({
      where: { phone: p },
      select: { email: true, role: true },
    })
    if (admin?.role === 'admin') {
      return { ok: true as const, email: normalizeLoginEmail(admin.email) }
    }
    const { teacher, ambiguous } = await findTeacherProfileByPhone(db, p)
    if (ambiguous) {
      return { ok: false as const, error: '该手机号关联多个教师档案，请联系管理员核对', code: 'AMBIGUOUS_PHONE' as const }
    }
    if (teacher) {
      const adminByName = await findAdminForTeacherProfile(db, teacher)
      if (adminByName.ambiguous) {
        return { ok: false as const, error: '该手机号关联多个管理账号，请联系管理员核对', code: 'AMBIGUOUS_PHONE' as const }
      }
      if (adminByName.email) return { ok: true as const, email: adminByName.email }
    }
    return null
  }

  async function resolveTeacher(p: string) {
    if (!db) return null
    const { teacher, ambiguous } = await findTeacherProfileByPhone(db, p)
    if (ambiguous) {
      return { ok: false as const, error: '该手机号关联多个教师档案，请使用邮箱/账号登录并联系管理员核对', code: 'AMBIGUOUS_PHONE' as const }
    }
    if (!teacher) return null

    const directlyBound = await db.user.findFirst({
      where: { teacherId: teacher.id, role: 'teacher' },
      select: { email: true },
    })
    if (directlyBound) return { ok: true as const, email: normalizeLoginEmail(directlyBound.email), teacherId: teacher.id }

    const legacyEmails = [...new Set([
      teacher.email?.trim().toLowerCase(),
      chineseToPinyin(teacher.name) + '@tea.com',
      teacher.phone.replace(/\D/g, '') + '@tea.com',
    ].filter((value): value is string => Boolean(value)))]
    const legacyUsers = await db.user.findMany({
      where: { role: 'teacher', teacherId: null, email: { in: legacyEmails } },
      select: { email: true },
      take: 3,
    })
    const emails = [...new Set(legacyUsers.map((user) => normalizeLoginEmail(user.email)).filter(Boolean))]
    if (emails.length > 1) {
      return { ok: false as const, error: '该手机号关联多个教师账号，请使用邮箱/账号登录并联系管理员核对', code: 'AMBIGUOUS_PHONE' as const }
    }
    if (emails.length) {
      return { ok: true as const, email: emails[0], teacherId: teacher.id }
    }

    const adminByName = await findAdminForTeacherProfile(db, teacher)
    if (adminByName.ambiguous) {
      return { ok: false as const, error: '该手机号关联多个管理账号，请使用邮箱/账号登录并联系管理员核对', code: 'AMBIGUOUS_PHONE' as const }
    }
    if (adminByName.email) {
      return { ok: true as const, email: adminByName.email, teacherId: teacher.id }
    }
    return null
  }

  async function resolveParent(p: string) {
    if (!db) return null
    const students = await db.student.findMany({
      where: { parentPhone: { contains: p.slice(-4) }, deletedAt: null },
      select: { parentPhone: true, parentUserId: true, parentId: true },
    })
    const parentIds = [...new Set(students
      .filter((student) => normalizeLoginPhone(student.parentPhone || '') === p)
      .flatMap((student) => [student.parentUserId, student.parentId])
      .filter((id): id is string => Boolean(id)))]

    if (!parentIds.length) return null

    const parents = await db.user.findMany({
      where: { id: { in: parentIds }, role: 'parent' },
      select: { email: true },
    })
    const emails = [...new Set(parents.map((parent) => normalizeLoginEmail(parent.email)).filter(Boolean))]
    if (emails.length > 1) {
      return { ok: false as const, error: '该手机号关联多个家长账号，请使用邮箱登录并联系管理员核对绑定信息', code: 'AMBIGUOUS_PHONE' as const }
    }
    if (!emails.length) return null
    return { ok: true as const, email: emails[0] }
  }

  // 1. Try resolving for the explicitly requested role first
  let primaryResult: { ok: true; email: string; teacherId?: string } | { ok: false; error: string; code: 'AMBIGUOUS_PHONE' } | null = null
  if (loginRole === 'admin') {
    primaryResult = await resolveAdmin(phone)
  } else if (loginRole === 'teacher') {
    primaryResult = await resolveTeacher(phone)
  } else if (loginRole === 'parent') {
    primaryResult = await resolveParent(phone)
  }

  if (primaryResult) {
    if (!primaryResult.ok) return primaryResult
    return primaryResult
  }

  // 2. In unified login, if the requested role didn't match, attempt other roles before failing
  const candidateRoles: LoginRole[] = (['parent', 'teacher', 'admin'] as LoginRole[]).filter((r) => r !== loginRole)
  for (const candidateRole of candidateRoles) {
    let fallbackResult: { ok: true; email: string; teacherId?: string } | { ok: false; error: string; code: 'AMBIGUOUS_PHONE' } | null = null
    if (candidateRole === 'parent') fallbackResult = await resolveParent(phone)
    else if (candidateRole === 'teacher') fallbackResult = await resolveTeacher(phone)
    else if (candidateRole === 'admin') fallbackResult = await resolveAdmin(phone)

    if (fallbackResult) {
      if (!fallbackResult.ok) return fallbackResult
      return fallbackResult
    }
  }

  return { ok: false, error: '该手机号未关联账号，请使用邮箱/账号登录或联系管理员核对绑定信息', code: 'BAD_USERNAME' }
}

export async function getLoginStatus(emailInput: string, division: string | undefined, ip: string) {
  const email = normalizeLoginEmail(emailInput)
  if (!email) return { locked: false, failCount: 0, remaining: MAX_FAIL_ATTEMPTS }
  // A missing trusted proxy address must not turn the shared "unknown" bucket
  // into a way to lock an account for every visitor.
  if (!ip || ip === 'unknown') return { locked: false, failCount: 0, remaining: MAX_FAIL_ATTEMPTS }

  const lockWindowStart = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60 * 1000)
  const db = resolveLoginPrisma(division)
  if (!db) return { locked: false, failCount: 0, remaining: MAX_FAIL_ATTEMPTS }
  const failCount = await db.loginRecord.count({
    where: {
      email,
      ip,
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
  const direct = await db.teacher.findFirst({
    where: { email, status: { not: 'RESIGNED' } },
    select: { id: true, name: true, phone: true },
  })
  if (direct) return direct

  // Only legacy pinyin teacher accounts use the generated @tea.com form.
  // Avoid scanning every teacher for ordinary parent/admin email addresses.
  if (!email.endsWith('@tea.com')) return null

  // Compatibility only: old unbound teacher accounts used generated pinyin
  // addresses that are not stored on Teacher. New/bound accounts never take
  // this full-scan path.
  const teachers = await db.teacher.findMany({
    where: { status: { not: 'RESIGNED' } },
    select: { id: true, name: true, phone: true },
  })
  return teachers.find((teacher) => `${chineseToPinyin(teacher.name)}@tea.com` === email) || null
}

async function resolveTeacherLoginAccount(
  user: { id: string; email: string; name: string; role: string; teacherId?: string | null },
  _email: string,
  division?: string,
): Promise<TeacherLoginAccount | null> {
  const db = resolveLoginPrisma(division)
  if (!db) return null
  return resolveTeacherForUser(db, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teacherId: user.teacherId ?? null,
  })
}

async function isAdminLinkedToTeacherProfile(email: string, teacherId: string, division?: string) {
  const db = resolveLoginPrisma(division)
  if (!db) return false
  const [user, teacher] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { role: true, name: true, teacherId: true } }),
    db.teacher.findUnique({ where: { id: teacherId }, select: { name: true, status: true } }),
  ])
  return user?.role === 'admin'
    && Boolean(teacher)
    && teacher?.status !== 'RESIGNED'
    && (user.teacherId ? user.teacherId === teacherId : user.name.trim() === teacher?.name.trim())
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

  if (!email.includes('@')) {
    const candidate = await db.user.findFirst({
      where: {
        OR: [
          { email: `${email}@st.com` },
          { email: `${email}@tea.com` },
          { email: `${email}@nuc.com` },
          { email: `${email}@muzhe.com` },
          { email: { startsWith: `${email}@` } },
        ],
      },
      select: { role: true },
    })
    if (candidate?.role === 'admin' || candidate?.role === 'teacher' || candidate?.role === 'parent') {
      return candidate.role as LoginRole
    }
  }

  if (await findTeacherByLoginEmail(email.includes('@') ? email : `${email}@tea.com`, division)) return 'teacher'
  return null
}

export async function detectLoginRoleForIdentifier(
  identifierInput: string,
  identifierType: LoginIdentifierType,
  division?: string,
): Promise<{ role: LoginRole | null; division: 'JUNIOR' | 'SENIOR' | null }> {
  const candidateDivisions: Array<'JUNIOR' | 'SENIOR' | undefined> = isDualDbEnabled()
    ? division === 'SENIOR'
      ? ['SENIOR', 'JUNIOR']
      : ['JUNIOR', 'SENIOR']
    : [isLoginDivision(division) ? division : undefined]
  const matches: Array<{ role: LoginRole; division: 'JUNIOR' | 'SENIOR' | null }> = []

  // If one phone belongs to both an administrator and a teacher, keep role detection neutral
  if (identifierType === 'phone') {
    if (!normalizeLoginPhone(identifierInput)) return { role: null, division: null }
    let hasAdminMatch = false
    let hasTeacherMatch = false
    for (const candidateDivision of candidateDivisions) {
      const teacherMatch = await resolveLoginIdentifier(identifierInput, 'teacher', candidateDivision, 'phone')
      const adminMatch = await resolveLoginIdentifier(identifierInput, 'admin', candidateDivision, 'phone')
      hasAdminMatch ||= adminMatch.ok
      hasTeacherMatch ||= teacherMatch.ok

      if (teacherMatch.ok && !adminMatch.ok) {
        matches.push({
          role: 'teacher',
          division: isDualDbEnabled()
            ? candidateDivision === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
            : null,
        })
      }

      const parentMatch = await resolveLoginIdentifier(identifierInput, 'parent', candidateDivision, 'phone')
      if (parentMatch.ok) {
        matches.push({
          role: 'parent',
          division: isDualDbEnabled()
            ? candidateDivision === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
            : null,
        })
      }
    }
    if (hasAdminMatch && hasTeacherMatch) return { role: null, division: null }
    if (hasAdminMatch && !hasTeacherMatch && matches.length === 0) {
      return { role: 'admin', division: null }
    }
  } else {
    for (const candidateDivision of candidateDivisions) {
      const role = await detectLoginRole(identifierInput, candidateDivision)
      if (role === 'admin' || role === 'teacher' || role === 'parent') {
        matches.push({
          role,
          division: isDualDbEnabled()
            ? candidateDivision === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
            : null,
        })
      }
    }
  }

  const roles = [...new Set(matches.map((match) => match.role))]
  if (roles.length !== 1) return { role: null, division: null }
  const matchingRole = roles[0]
  const selectedMatch = matches.find((match) => match.division === division) || matches[0]
  return { role: matchingRole, division: selectedMatch.division }
}

async function verifyPassword(plainPassword: string, storedPassword: string): Promise<boolean> {
  if (!storedPassword.startsWith('$2')) return false
  return bcrypt.compare(plainPassword, storedPassword)
}

function toLoginUser(user: { id: string; email: string; name: string; role: string; division?: string | null; teacherId?: string | null }): LoginUser | null {
  if (user.role !== 'admin' && user.role !== 'teacher' && user.role !== 'parent') return null
  const division = user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  return { id: user.id, email: user.email, name: user.name, role: user.role, division, teacherId: user.teacherId ?? null }
}

async function validateDatabaseUser(
  email: string,
  password: string,
  expectedRole: LoginRole,
  options: { recordAttempt?: boolean; recordSuccess?: boolean },
  meta?: RequestMeta,
  division?: string,
  resolvedTeacherId?: string,
): Promise<ValidationResult> {
  const db = resolveLoginPrisma(division)
  if (db === null) {
    return { ok: false, error: 'Missing division', code: 'BAD_DIVISION' }
  }
  const user = await db.user.findUnique({ where: { email } })

  if (!user) {
    const legacyTeacher = expectedRole === 'teacher'
      ? await findTeacherByLoginEmail(email, division)
      : null
    if (options.recordAttempt) await recordLoginFailure(email, legacyTeacher ? 'uninitialized' : 'not_found', undefined, meta, division)
    return {
      ok: false,
      error: legacyTeacher ? '账号未初始化，请联系管理员' : '用户名输入错误',
      code: 'BAD_USERNAME',
    }
  }

  let teacherRoleOverride: TeacherLoginAccount | null = null
  if (expectedRole === 'teacher' && user.role === 'admin' && resolvedTeacherId) {
    const teacher = await db.teacher.findUnique({
      where: { id: resolvedTeacherId },
      select: { id: true, name: true, phone: true, status: true, division: true },
    })
    if (teacher && teacher.status !== 'RESIGNED'
      && (user.teacherId ? user.teacherId === teacher.id : teacher.name.trim() === user.name.trim())) {
      teacherRoleOverride = teacher
    }
  }

  if (isUserDisabled(user.status)) {
    if (options.recordAttempt) await recordLoginFailure(email, 'disabled', user.id, meta, division)
    return { ok: false, error: '账号已停用，请联系管理员', code: 'DISABLED' }
  }

  const pwdOk = await verifyPassword(password, user.password)
  if (!pwdOk) {
    if (options.recordAttempt) await recordLoginFailure(email, 'wrong_password', user.id, meta, division)
    return { ok: false, error: '密码错误', code: 'BAD_PASSWORD' }
  }

  // Once password is confirmed valid, resolve user to their authentic role
  const actualRole = (teacherRoleOverride ? 'teacher' : user.role) as LoginRole

  // Credentials are only valid from the matching portal. Keep the linked-admin
  // teacher override above so staff who have an explicitly linked teacher
  // profile can still use the teacher entry.
  if (actualRole !== expectedRole) {
    return { ok: false, error: '身份不对，请切换到正确入口登录', code: 'BAD_ROLE' }
  }

  let resolvedTeacher: TeacherLoginAccount | null = null
  if (actualRole === 'teacher') {
    resolvedTeacher = teacherRoleOverride || await resolveTeacherLoginAccount(user, email, division)
    if (!resolvedTeacher) {
      if (options.recordAttempt) await recordLoginFailure(email, 'uninitialized', user.id, meta, division)
      return { ok: false, error: '教师档案未绑定，请联系管理员', code: 'BAD_USERNAME' }
    }
  }

  const loginUser = toLoginUser(teacherRoleOverride ? { ...user, role: 'teacher', teacherId: teacherRoleOverride.id } : user)
  if (!loginUser) {
    if (options.recordAttempt) await recordLoginFailure(email, 'not_found', user.id, meta, division)
    return { ok: false, error: '身份不对，请切换到正确入口登录', code: 'BAD_ROLE' }
  }

  const effectiveDivision =
    isDualDbEnabled() && division === 'SENIOR' ? 'SENIOR'
    : isDualDbEnabled() && division === 'JUNIOR' ? 'JUNIOR'
    : teacherRoleOverride?.division === 'SENIOR' ? 'SENIOR'
    : teacherRoleOverride?.division === 'JUNIOR' ? 'JUNIOR'
    : loginUser.division === 'SENIOR' ? 'SENIOR'
    : 'JUNIOR'

  const scopedLoginUser = {
    ...loginUser,
    teacherId: resolvedTeacher?.id ?? loginUser.teacherId,
    division: effectiveDivision,
  }

  if (options.recordSuccess) await recordLoginSuccess(scopedLoginUser, meta, effectiveDivision)
  return { ok: true, user: scopedLoginUser }
}

export type ResolvedLoginIdentifier =
  | { ok: true; email: string; teacherId?: string }
  | Extract<ValidationResult, { ok: false }>

export async function validateLoginAccount(
  emailInput: string,
  passwordInput: string,
  loginRole: LoginRole,
  options: { persistUser?: boolean; recordAttempt?: boolean; recordSuccess?: boolean } = {},
  meta?: RequestMeta,
  division?: string,
  identifierType: LoginIdentifierType = 'email',
  preResolvedIdentifier?: ResolvedLoginIdentifier,
): Promise<ValidationResult> {
  const resolvedIdentifier = preResolvedIdentifier ?? await resolveLoginIdentifier(emailInput, loginRole, division, identifierType)
  if (!resolvedIdentifier.ok) return resolvedIdentifier
  const email = resolvedIdentifier.email
  const password = passwordInput.trim()

  if (hasInvalidDualDbDivision(division)) {
    return { ok: false, error: 'Missing division', code: 'BAD_DIVISION' }
  }

  if (options.recordAttempt) {
    const status = await getLoginStatus(email, division, meta?.ip || 'unknown')
    if (status.locked) {
      await recordLoginFailure(email, 'locked', undefined, meta, division)
      return { ok: false, error: '密码连续错误次数过多，账号已临时锁定，请30分钟后重试', code: 'LOCKED' }
    }
  }

  return validateDatabaseUser(email, password, loginRole, options, meta, division, resolvedIdentifier.teacherId)
}

/**
 * Password-free preflight used by /api/auth/login-check.
 * The authoritative password verification remains exclusively in NextAuth authorize().
 */
export async function precheckLoginAccount(
  emailInput: string,
  loginRole: LoginRole,
  division?: string,
  identifierType: LoginIdentifierType = 'email',
  ip = 'unknown',
): Promise<{ ok: true } | Extract<ValidationResult, { ok: false }>> {
  const resolvedIdentifier = await resolveLoginIdentifier(emailInput, loginRole, division, identifierType)
  if (!resolvedIdentifier.ok) return resolvedIdentifier
  const email = resolvedIdentifier.email

  if (hasInvalidDualDbDivision(division)) {
    return { ok: false, error: 'Missing division', code: 'BAD_DIVISION' }
  }

  const status = await getLoginStatus(email, division, ip)
  if (status.locked) {
    return { ok: false, error: '密码连续错误次数过多，账号已临时锁定，请30分钟后重试', code: 'LOCKED' }
  }

  const actualRole = await detectLoginRole(email, division)
  if (!actualRole) {
    return { ok: false, error: '用户名输入错误', code: 'BAD_USERNAME' }
  }
  const adminTeacherLogin = loginRole === 'teacher'
    && Boolean(resolvedIdentifier.teacherId)
    && actualRole === 'admin'
    ? await isAdminLinkedToTeacherProfile(email, resolvedIdentifier.teacherId!, division)
    : false
  if (actualRole !== loginRole && !adminTeacherLogin) {
    return { ok: false, error: '身份不对，请切换到正确入口登录', code: 'BAD_ROLE' }
  }

  return { ok: true }
}
