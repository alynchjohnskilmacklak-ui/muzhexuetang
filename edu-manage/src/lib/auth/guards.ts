/**
 * 统一权限守卫。
 * 教师/家长身份从 session 推导，不信任前端传参。
 * 初中部/高中部数据隔离通过 division 字段强制执行。
 */

import { auth } from '@/lib/auth'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

// ---- type helpers ----

interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  teacherId?: string | null
  sessionMark?: string
  division: string
}

async function getSessionUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user) throw new AuthError('未登录', 401)
  const u = session.user as Record<string, unknown>
  return {
    id: u.id as string,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
    role: u.role as string,
    teacherId: (u.teacherId as string | null) ?? null,
    sessionMark: u.sessionMark as string | undefined,
    division: (u.division as string) === 'SENIOR' ? 'SENIOR' : 'JUNIOR',
  }
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

// ---- sessionMark 校验 ----

/**
 * 校验当前 JWT sessionMark 是否与数据库中的 currentSessionToken 一致。
 * 不一致说明账号已在其他设备登录，旧 token 失效。
 */
export async function validateSessionMark(user: SessionUser): Promise<void> {
  if (!user.sessionMark) return // 兼容无 sessionMark 的旧 session
  const prisma = getPrismaForDivision(user.division as 'JUNIOR' | 'SENIOR')
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentSessionToken: true, status: true },
  })
  if (!dbUser || dbUser.status !== 'ACTIVE') {
    throw new AuthError('账号已被禁用', 401)
  }
  if (dbUser.currentSessionToken && dbUser.currentSessionToken !== user.sessionMark) {
    throw new AuthError('账号已在其他设备登录，请重新登录', 401)
  }
}

// ---- role guards ----

export async function requireAdminUser(): Promise<SessionUser & { prisma: PrismaClient }> {
  const user = await getSessionUser()
  if (user.role !== 'admin') throw new AuthError('需要管理员权限')
  await validateSessionMark(user)
  const prisma = getPrismaForDivision(user.division as 'JUNIOR' | 'SENIOR')
  return Object.assign(user, { prisma })
}

export async function requireTeacherUser(): Promise<SessionUser & { prisma: PrismaClient; teacherId: string }> {
  const user = await getSessionUser()
  if (user.role !== 'teacher') throw new AuthError('需要教师权限')
  await validateSessionMark(user)
  const prisma = getPrismaForDivision(user.division as 'JUNIOR' | 'SENIOR')
  const tid = user.teacherId
  if (!tid) throw new AuthError('未绑定教师档案')
  // 验证教师未离职
  const teacher = await prisma.teacher.findUnique({ where: { id: tid }, select: { status: true } })
  if (!teacher || teacher.status === 'RESIGNED') throw new AuthError('教师档案已停用')
  return { ...user, prisma, teacherId: tid }
}

export async function requireParentUser(): Promise<SessionUser & { prisma: PrismaClient }> {
  const user = await getSessionUser()
  if (user.role !== 'parent') throw new AuthError('需要家长权限')
  await validateSessionMark(user)
  const prisma = getPrismaForDivision(user.division as 'JUNIOR' | 'SENIOR')
  return Object.assign(user, { prisma })
}

/** 返回当前登录家长绑定的学生 ID 列表 */
export async function getParentStudentIds(ctx: SessionUser, prisma: PrismaClient): Promise<string[]> {
  const students = await prisma.student.findMany({
    where: { parentUserId: ctx.id, status: { not: 'ARCHIVED' } },
    select: { id: true },
  })
  return students.map(s => s.id)
}

// ---- tenant / division context ----

export async function requireTenantContext(): Promise<{ division: 'JUNIOR' | 'SENIOR'; prisma: PrismaClient }> {
  const user = await getSessionUser()
  await validateSessionMark(user)
  const division = user.division as 'JUNIOR' | 'SENIOR'
  const prisma = getPrismaForDivision(division)
  return { division, prisma }
}

// ---- access assertions ----

export async function assertCanAccessStudent(
  ctx: SessionUser & { prisma?: PrismaClient },
  studentId: string,
): Promise<void> {
  const prisma = ctx.prisma ?? getPrismaForDivision(ctx.division as 'JUNIOR' | 'SENIOR')

  if (ctx.role === 'admin') {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { division: true } })
    if (!student) throw new AuthError('学生不存在', 404)
    if (isDualDbEnabled() && student.division !== ctx.division) throw new AuthError('跨部数据不可访问')
    return
  }

  if (ctx.role === 'teacher') {
    const tid = ctx.teacherId
    if (!tid) throw new AuthError('未绑定教师档案')
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
        group: {
          status: { not: 'ARCHIVED' },
          OR: [
            { teacherId: tid },
            { teacherAssignments: { some: { teacherId: tid } } },
          ],
        },
      },
      select: { id: true },
    })
    if (!enrollment) throw new AuthError('无权访问该学生数据')
    return
  }

  if (ctx.role === 'parent') {
    const student = await prisma.student.findFirst({
      where: { id: studentId, parentUserId: ctx.id, status: { not: 'ARCHIVED' } },
      select: { id: true },
    })
    if (!student) throw new AuthError('无权访问该学生数据')
    return
  }

  throw new AuthError('无权限')
}

export async function assertCanAccessClassGroup(
  ctx: SessionUser & { prisma?: PrismaClient },
  classGroupId: string,
): Promise<void> {
  const prisma = ctx.prisma ?? getPrismaForDivision(ctx.division as 'JUNIOR' | 'SENIOR')

  if (ctx.role === 'admin') {
    const g = await prisma.classGroup.findUnique({ where: { id: classGroupId }, select: { division: true } })
    if (!g) throw new AuthError('班级不存在', 404)
    if (isDualDbEnabled() && g.division !== ctx.division) throw new AuthError('跨部数据不可访问')
    return
  }

  if (ctx.role === 'teacher') {
    const tid = ctx.teacherId
    if (!tid) throw new AuthError('未绑定教师档案')
    const g = await prisma.classGroup.findFirst({
      where: {
        id: classGroupId,
        status: { not: 'ARCHIVED' },
        OR: [
          { teacherId: tid },
          { teacherAssignments: { some: { teacherId: tid } } },
        ],
      },
      select: { id: true },
    })
    if (!g) throw new AuthError('无权访问该班级数据')
    return
  }

  if (ctx.role === 'parent') {
    const g = await prisma.classGroup.findFirst({
      where: {
        id: classGroupId,
        status: { not: 'ARCHIVED' },
        enrollments: {
          some: {
            student: { parentUserId: ctx.id },
            status: 'ACTIVE',
          },
        },
      },
      select: { id: true },
    })
    if (!g) throw new AuthError('无权访问该班级数据')
    return
  }

  throw new AuthError('无权限')
}

export async function assertCanAccessClassLesson(
  ctx: SessionUser & { prisma?: PrismaClient },
  classLessonId: string,
): Promise<void> {
  const prisma = ctx.prisma ?? getPrismaForDivision(ctx.division as 'JUNIOR' | 'SENIOR')

  if (ctx.role === 'admin') {
    const l = await prisma.classLesson.findUnique({ where: { id: classLessonId }, select: { division: true } })
    if (!l) throw new AuthError('课次不存在', 404)
    if (isDualDbEnabled() && l.division !== ctx.division) throw new AuthError('跨部数据不可访问')
    return
  }

  if (ctx.role === 'teacher') {
    const tid = ctx.teacherId
    if (!tid) throw new AuthError('未绑定教师档案')
    const l = await prisma.classLesson.findFirst({
      where: {
        id: classLessonId,
        status: { not: 'CANCELLED' },
        OR: [
          { teacherId: tid },
          { teacherId: null, group: { teacherId: tid } },
          { teacherId: null, group: { teacherAssignments: { some: { teacherId: tid } } } },
        ],
      },
      select: { id: true },
    })
    if (!l) throw new AuthError('无权访问该课次数据')
    return
  }

  if (ctx.role === 'parent') {
    const l = await prisma.classLesson.findFirst({
      where: {
        id: classLessonId,
        status: { not: 'CANCELLED' },
        group: {
          enrollments: {
            some: {
              student: { parentUserId: ctx.id },
              status: 'ACTIVE',
            },
          },
        },
      },
      select: { id: true },
    })
    if (!l) throw new AuthError('无权访问该课次数据')
    return
  }

  throw new AuthError('无权限')
}

export async function assertCanAccessAttendance(
  ctx: SessionUser & { prisma?: PrismaClient },
  attendanceId: string,
): Promise<void> {
  const prisma = ctx.prisma ?? getPrismaForDivision(ctx.division as 'JUNIOR' | 'SENIOR')

  if (ctx.role === 'admin') {
    const a = await prisma.attendance.findUnique({ where: { id: attendanceId }, select: { id: true } })
    if (!a) throw new AuthError('考勤记录不存在', 404)
    return
  }

  if (ctx.role === 'teacher') {
    const tid = ctx.teacherId
    if (!tid) throw new AuthError('未绑定教师档案')
    const a = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        OR: [
          { lesson: { teacherId: tid } },
          { lesson: { teacherId: null, group: { teacherId: tid } } },
          { lesson: { teacherId: null, group: { teacherAssignments: { some: { teacherId: tid } } } } },
        ],
      },
      select: { id: true },
    })
    if (!a) throw new AuthError('无权访问该考勤数据')
    return
  }

  if (ctx.role === 'parent') {
    const a = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        student: { parentUserId: ctx.id },
      },
      select: { id: true },
    })
    if (!a) throw new AuthError('无权访问该考勤数据')
    return
  }

  throw new AuthError('无权限')
}

export async function assertCanAccessFeedback(
  ctx: SessionUser & { prisma?: PrismaClient },
  feedbackId: string,
): Promise<void> {
  const prisma = ctx.prisma ?? getPrismaForDivision(ctx.division as 'JUNIOR' | 'SENIOR')

  if (ctx.role === 'admin') {
    const f = await prisma.classroomFeedback.findUnique({ where: { id: feedbackId }, select: { id: true } })
    if (!f) throw new AuthError('反馈不存在', 404)
    return
  }

  if (ctx.role === 'teacher') {
    const tid = ctx.teacherId
    if (!tid) throw new AuthError('未绑定教师档案')
    const f = await prisma.classroomFeedback.findFirst({
      where: { id: feedbackId, teacherId: tid },
      select: { id: true },
    })
    if (!f) throw new AuthError('无权访问该反馈数据')
    return
  }

  if (ctx.role === 'parent') {
    const f = await prisma.classroomFeedback.findFirst({
      where: {
        id: feedbackId,
        studentIds: { hasSome: await getParentStudentIds(ctx, prisma) },
      },
      select: { id: true },
    })
    if (!f) throw new AuthError('无权访问该反馈数据')
    return
  }

  throw new AuthError('无权限')
}

/** 获取当前登录教师的 teacherId（从 session 推导，不信任前端传参） */
export async function getCurrentTeacherId(): Promise<string> {
  const user = await getSessionUser()
  if (user.role !== 'teacher' || !user.teacherId) {
    throw new AuthError('需要教师身份')
  }
  await validateSessionMark(user)
  return user.teacherId
}

/** 管理员筛选教师时：允许传 targetTeacherId，但必须验证管理员身份 */
export async function requireAdminOrOwnTeacher(targetTeacherId?: string | null): Promise<{ prisma: PrismaClient; division: string; filterTeacherId?: string }> {
  const user = await getSessionUser()
  await validateSessionMark(user)
  const division = user.division as 'JUNIOR' | 'SENIOR'
  const prisma = getPrismaForDivision(division)

  if (user.role === 'admin') {
    return { prisma, division, filterTeacherId: targetTeacherId ?? undefined }
  }

  if (user.role === 'teacher') {
    const tid = user.teacherId
    if (!tid) throw new AuthError('未绑定教师档案')
    // 如果前端传了 targetTeacherId 且不一致，拒绝
    if (targetTeacherId && targetTeacherId !== tid) throw new AuthError('无权查看其他教师的课程')
    return { prisma, division, filterTeacherId: tid }
  }

  throw new AuthError('无权限')
}
