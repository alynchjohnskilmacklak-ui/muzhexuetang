import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { getCurrentUser } from '@/lib/get-user'
import { resolveTeacherForUser } from '@/lib/performance'
import { visibleClassGroupWhere, visibleClassLessonWhere, visibleStudentWhere } from '@/lib/business-visibility'

export const TEACHER_LOG_ACTIONS = {
  ATTENDANCE_SUBMIT: 'ATTENDANCE_SUBMIT',
  ATTENDANCE_MISSING: 'ATTENDANCE_MISSING',
  PAPER_UPLOAD: 'PAPER_UPLOAD',
  PAPER_PUBLISH: 'PAPER_PUBLISH',
  PERFORMANCE_POST: 'PERFORMANCE_POST',
  CLASSROOM_FEEDBACK_DRAFT: 'CLASSROOM_FEEDBACK_DRAFT',
  CLASSROOM_FEEDBACK_PUBLISH: 'CLASSROOM_FEEDBACK_PUBLISH',
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
  const user = await getCurrentUser()
  if (!user || !isTeacherRole(user.role)) return null
  const teacher = await resolveTeacherForUser({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
  if (!teacher || teacher.status === 'RESIGNED') return null
  return { user, teacher }
}

export async function requireCurrentTeacher() {
  const result = await getCurrentTeacher()
  if (!result) {
    throw new Error('TEACHER_UNAUTHORIZED')
  }
  return result
}

export async function requireTeacherPage() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || !isTeacherRole(role)) redirect('/login')

  const teacher = await resolveTeacherForUser({
    id: (session.user as { id?: string }).id || '',
    email: session.user.email,
    name: session.user.name,
    role,
  })
  if (!teacher || teacher.status === 'RESIGNED') redirect('/login')
  return teacher
}

export async function requireAdminUser() {
  const user = await getCurrentUser()
  if (!user || !isAdminRole(user.role)) {
    throw new Error('ADMIN_UNAUTHORIZED')
  }
  return user
}

export async function assertTeacherOwnsStudent(teacherId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      ...visibleStudentWhere,
      enrollments: {
        some: {
          status: 'ACTIVE',
          group: {
            ...visibleClassGroupWhere,
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

export function teacherLessonWhere(teacherId: string): Prisma.ClassLessonWhereInput {
  return {
    ...visibleClassLessonWhere,
    group: {
      ...visibleClassGroupWhere,
    },
    OR: [
      { teacherId },
      { teacherId: null, group: { teacherId } },
      { teacherId: null, group: { teacherAssignments: { some: { teacherId } } } },
    ],
  }
}

export function teacherStudentWhere(teacherId: string): Prisma.StudentWhereInput {
  return {
    ...visibleStudentWhere,
    enrollments: {
      some: {
        status: 'ACTIVE',
        group: {
          ...visibleClassGroupWhere,
          OR: [
            { teacherId },
            { teacherAssignments: { some: { teacherId } } },
          ],
        },
      },
    },
  }
}
