import { redirect } from 'next/navigation'
import { getRequestPrisma } from '@/lib/prisma'
import type { Prisma, PrismaClient } from '@prisma/client'
import {
  AuthError,
  requireAdminUser as requireGuardedAdminUser,
  requireTeacherUser,
} from '@/lib/auth/guards'
import { visibleClassGroupWhere, visibleClassLessonWhere, visibleStudentWhere } from '@/lib/business-visibility'
export { TEACHER_LOG_ACTIONS, type TeacherLogAction } from '@/lib/teacher-log-actions'

export const TEACHER_LOG_LABELS: Record<string, string> = {
  ATTENDANCE_SUBMIT: '考勤提交',
  ATTENDANCE_MISSING: '考勤漏提',
  PAPER_UPLOAD: '试卷上传草稿',
  PAPER_PUBLISH: '试卷推送家长',
  PERFORMANCE_POST: '表现动态发布',
  LEARNING_GOAL_SAVE: '学习目标维护',
  WEAKNESS_SAVE: '薄弱点维护',
  STAGE_SUMMARY_DRAFT: '阶段小结草稿',
  STAGE_SUMMARY_PUBLISH: '阶段小结发布',
  COMMENT_REPLY: '回复家长留言',
  TEACHER_LOGIN: '教师登录',
  MAKEUP_ARRANGE: '安排补课',
}

export const ALERT_TYPES = {
  NO_ATTENDANCE: 'NO_ATTENDANCE',
  NO_PAPER: 'NO_PAPER',
  NO_FEEDBACK: 'NO_FEEDBACK',
  NO_LOGIN: 'NO_LOGIN',
} as const

export function isTeacherRole(role?: string | null) {
  return String(role || '').toLowerCase() === 'teacher'
}

export function isAdminRole(role?: string | null) {
  return String(role || '').toLowerCase() === 'admin'
}

export async function getCurrentTeacher() {
  try {
    const user = await requireTeacherUser()
    const teacher = await user.prisma.teacher.findUnique({ where: { id: user.teacherId } })
    return teacher ? { user, teacher, prisma: user.prisma } : null
  } catch (error) {
    if (error instanceof AuthError) return null
    throw error
  }
}

export async function requireCurrentTeacher() {
  const user = await requireTeacherUser()
  const teacher = await user.prisma.teacher.findUnique({ where: { id: user.teacherId } })
  if (!teacher) throw new AuthError('教师档案不存在', 404)
  return { user, teacher, prisma: user.prisma }
}

export async function requireTeacherPage() {
  try {
    const user = await requireTeacherUser()
    const teacher = await user.prisma.teacher.findUnique({ where: { id: user.teacherId } })
    if (!teacher) redirect('/login')
    return teacher
  } catch (error) {
    if (error instanceof AuthError) redirect('/login')
    throw error
  }
}

export async function requireAdminUser() {
  const user = await requireGuardedAdminUser()
  return Object.assign(user, { user })
}

export async function assertTeacherOwnsStudent(
  teacherId: string,
  studentId: string,
  prismaClient?: PrismaClient,
  termId?: string,
) {
  const prisma = prismaClient ?? await getRequestPrisma()
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      ...visibleStudentWhere,
      AND: [
        {
          enrollments: {
            some: {
              status: 'ACTIVE',
              group: {
                ...visibleClassGroupWhere,
                ...(termId ? { termId } : {}),
              },
            },
          },
        },
        { classLessonStudents: { some: { lesson: teacherLessonWhere(teacherId, termId) } } },
      ],
    },
    select: { id: true, name: true, parentId: true, parentUserId: true },
  })
  return student
}

export function todayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 86400000)
  return { start, end }
}

export function weekRange(now = new Date()) {
  const start = new Date(now)
  const day = start.getDay()
  const offset = day === 0 ? 6 : day - 1
  start.setDate(start.getDate() - offset)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start.getTime() + 7 * 86400000)
  return { start, end }
}

export function teacherLessonWhere(teacherId: string, termId?: string): Prisma.ClassLessonWhereInput {
  return {
    ...visibleClassLessonWhere,
    group: {
      ...visibleClassGroupWhere,
      ...(termId ? { termId } : {}),
    },
    OR: [
      { teacherId },
      { teacherId: null, group: { teacherId } },
      { teacherId: null, group: { teacherAssignments: { some: { teacherId } } } },
    ],
  }
}

export function teacherStudentWhere(teacherId: string, termId?: string): Prisma.StudentWhereInput {
  return {
    ...visibleStudentWhere,
    OR: [
      {
        AND: [
          {
            enrollments: {
              some: {
                status: 'ACTIVE',
                group: {
                  ...visibleClassGroupWhere,
                  ...(termId ? { termId } : {}),
                },
              },
            },
          },
          { classLessonStudents: { some: { lesson: teacherLessonWhere(teacherId, termId) } } },
        ],
      },
      {
        studyHallClasses: {
          some: {
            status: 'ACTIVE',
            studyClass: {
              status: 'ACTIVE',
              ...(termId ? { termId } : {}),
              teachers: { some: { teacherId, active: true } },
            },
          },
        },
      },
    ],
  }
}

type TeacherLessonScopeClient = Pick<PrismaClient, 'classGroupTeacher' | 'classGroup'>

/**
 * Resolve lesson visibility at teacher + group + subject granularity.
 *
 * Older lessons may still carry the group's primary teacherId after subject
 * teachers were edited. Building explicit group/subject clauses keeps those
 * lessons visible to the actual subject teacher without exposing other
 * subjects taught by colleagues in the same group.
 */
export async function teacherLessonScopeWhere(
  prisma: TeacherLessonScopeClient,
  teacherId: string,
  termId?: string,
): Promise<Prisma.ClassLessonWhereInput> {
  const [assignments, legacyPrimaryGroups] = await Promise.all([
    prisma.classGroupTeacher.findMany({
      where: {
        teacherId,
        group: {
          ...visibleClassGroupWhere,
          ...(termId ? { termId } : {}),
        },
      },
      select: { groupId: true, subject: true },
    }),
    prisma.classGroup.findMany({
      where: {
        teacherId,
        ...visibleClassGroupWhere,
        ...(termId ? { termId } : {}),
        teacherAssignments: { none: { teacherId } },
      },
      select: { id: true },
    }),
  ])

  const assignmentScopes: Prisma.ClassLessonWhereInput[] = assignments.map((assignment) => ({
    groupId: assignment.groupId,
    ...(assignment.subject ? { subject: assignment.subject } : {}),
  }))
  const legacyGroupIds = legacyPrimaryGroups.map((group) => group.id)

  return {
    ...visibleClassLessonWhere,
    group: {
      ...visibleClassGroupWhere,
      ...(termId ? { termId } : {}),
    },
    OR: [
      { teacherId },
      ...assignmentScopes,
      ...(legacyGroupIds.length ? [{ groupId: { in: legacyGroupIds } }] : []),
    ],
  }
}
