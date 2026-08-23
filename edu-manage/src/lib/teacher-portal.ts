import { redirect } from 'next/navigation'
import { getRequestPrisma } from '@/lib/prisma'
import type { Prisma, PrismaClient } from '@prisma/client'
import {
  AuthError,
  requireAdminUser as requireGuardedAdminUser,
  requireTeacherUser,
} from '@/lib/auth/guards'
import { visibleClassGroupWhere, visibleClassLessonWhere, visibleStudentWhere } from '@/lib/business-visibility'

export const TEACHER_LOG_ACTIONS = {
  ATTENDANCE_SUBMIT: 'ATTENDANCE_SUBMIT',
  ATTENDANCE_MISSING: 'ATTENDANCE_MISSING',
  PAPER_UPLOAD: 'PAPER_UPLOAD',
  PAPER_PUBLISH: 'PAPER_PUBLISH',
  PERFORMANCE_POST: 'PERFORMANCE_POST',
  CLASSROOM_FEEDBACK_DRAFT: 'CLASSROOM_FEEDBACK_DRAFT',
  CLASSROOM_FEEDBACK_PUBLISH: 'CLASSROOM_FEEDBACK_PUBLISH',
  LEARNING_GOAL_SAVE: 'LEARNING_GOAL_SAVE',
  WEAKNESS_SAVE: 'WEAKNESS_SAVE',
  STAGE_SUMMARY_DRAFT: 'STAGE_SUMMARY_DRAFT',
  STAGE_SUMMARY_PUBLISH: 'STAGE_SUMMARY_PUBLISH',
  COMMENT_REPLY: 'COMMENT_REPLY',
  TEACHER_LOGIN: 'TEACHER_LOGIN',
  MAKEUP_ARRANGE: 'MAKEUP_ARRANGE',
} as const

export type TeacherLogAction = keyof typeof TEACHER_LOG_ACTIONS

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
      enrollments: {
        some: {
          status: 'ACTIVE',
          group: {
            ...visibleClassGroupWhere,
            ...(termId ? { termId } : {}),
            OR: [
              { teacherId },
              { teacherAssignments: { some: { teacherId } } },
            ],
          },
        },
      },
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
        enrollments: {
          some: {
            status: 'ACTIVE',
            group: {
              ...visibleClassGroupWhere,
              ...(termId ? { termId } : {}),
              OR: [
                { teacherId },
                { teacherAssignments: { some: { teacherId } } },
              ],
            },
          },
        },
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
