/**
 * 统一权限守卫。
 * 教师/家长身份从 session 推导，不信任前端传参。
 * 初中部/高中部数据隔离通过 division 字段强制执行。
 */

import { auth } from '@/lib/auth'
import { getPrismaForDivision, isDualDbEnabled } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import { isUserActive } from '@/lib/user-status'
import { resolveTeacherForUser } from '@/lib/teacher-account-binding'
import { hasCurrentParentStudent, PARENT_TERM_EXPIRED_MESSAGE } from '@/lib/parent-account-validity'
import { parentLinkedStudentWhere, visibleClassLessonWhere } from '@/lib/business-visibility'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'

// ---- type helpers ----

export interface SessionUser {
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
  if (!user.sessionMark) {
    throw new AuthError('登录状态已过期，请重新登录', 401)
  }
  const prisma = getPrismaForDivision(user.division as 'JUNIOR' | 'SENIOR')
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentSessionToken: true, status: true },
  })
  if (!dbUser || !isUserActive(dbUser.status)) {
    throw new AuthError('账号已被禁用', 401)
  }
  if (dbUser.currentSessionToken !== user.sessionMark) {
    throw new AuthError('账号已在其他设备登录，请重新登录', 401)
  }
  if (user.role === 'parent' && !await hasCurrentParentStudent(
    prisma,
    user.id,
    user.division === 'SENIOR' ? 'SENIOR' : 'JUNIOR',
  )) {
    throw new AuthError(PARENT_TERM_EXPIRED_MESSAGE, 401)
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

export async function requireAuthenticatedUser(): Promise<SessionUser & { prisma: PrismaClient }> {
  const user = await getSessionUser()
  await validateSessionMark(user)
  const prisma = getPrismaForDivision(user.division as 'JUNIOR' | 'SENIOR')
  return Object.assign(user, { prisma })
}

export async function requireTeacherUser(): Promise<SessionUser & { prisma: PrismaClient; teacherId: string }> {
  const user = await getSessionUser()
  if (user.role !== 'teacher') throw new AuthError('需要教师权限')
  await validateSessionMark(user)
  const prisma = getPrismaForDivision(user.division as 'JUNIOR' | 'SENIOR')
  const teacher = await resolveTeacherForUser(prisma, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teacherId: user.teacherId ?? null,
  })
  if (!teacher) throw new AuthError('未绑定可用的教师档案')
  return { ...user, prisma, teacherId: teacher.id }
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
    where: parentLinkedStudentWhere(ctx.id),
    select: { id: true },
  })
  return students.map(s => s.id)
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
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        enrollments: { some: { status: 'ACTIVE', group: { status: { not: 'ARCHIVED' } } } },
        classLessonStudents: {
          some: {
            lesson: {
              status: { not: 'CANCELLED' },
              OR: [
                { teacherId: tid },
                { teacherId: null, group: { teacherId: tid } },
                { teacherId: null, group: { teacherAssignments: { some: { teacherId: tid } } } },
              ],
            },
          },
        },
      },
      select: { id: true },
    })
    if (!student) throw new AuthError('无权访问该学生数据')
    return
  }

  if (ctx.role === 'parent') {
    const student = await prisma.student.findFirst({
      where: { id: studentId, ...parentLinkedStudentWhere(ctx.id) },
      select: { id: true },
    })
    if (!student) throw new AuthError('无权访问该学生数据')
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
    const parentStudentIds = await getParentStudentIds(ctx, prisma)
    if (parentStudentIds.length === 0) throw new AuthError('无权访问该课次数据')

    const l = await prisma.classLesson.findFirst({
      where: {
        id: classLessonId,
        ...visibleClassLessonWhere,
      },
      include: {
        lessonStudents: { select: { studentId: true } },
        group: {
          include: {
            course: { select: { subject: true } },
            teacherAssignments: { select: { teacherId: true, subject: true } },
            enrollments: {
              where: { studentId: { in: parentStudentIds }, status: 'ACTIVE', deletedAt: null },
              select: { studentId: true, subjects: true },
            },
          },
        },
      },
    })
    const lessonSubject = l
      ? l.subject
        || l.group.teacherAssignments.find((assignment) => assignment.teacherId === l.teacherId || assignment.teacherId === l.group.teacherId)?.subject
        || l.group.course?.subject
      : null
    const eligibleStudentIds = l
      ? resolveSubjectLessonStudentIds(
          l.lessonStudents.map((item) => item.studentId),
          l.group.enrollments,
          lessonSubject,
          l.lessonDate,
        )
      : []
    if (!l || !eligibleStudentIds.some((id) => parentStudentIds.includes(id))) {
      throw new AuthError('无权访问该课次数据')
    }
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
