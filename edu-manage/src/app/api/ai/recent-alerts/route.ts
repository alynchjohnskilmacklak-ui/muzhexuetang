import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { parentLinkedStudentWhere, visibleNotificationWhere } from '@/lib/business-visibility'
import { unreadNotificationWhere } from '@/lib/notification-read-state'
import { NOTIFICATION_TYPE_LABEL } from '@/constants/notification-types'
import { parentUnreadClassroomFeedbackWhere } from '@/lib/parent-unread'
import { requireParentUser } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

export interface RecentAlert {
  key: string
  notificationId?: string
  type: string
  label: string
  title: string
  snippet: string
  time: string
  href: string
}

function snippetOf(text: string | null | undefined, max = 46): string {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

type Role = 'parent' | 'teacher' | 'admin'

/** 家长端真实路由白名单（与 src/app/parent 目录一致；子路径如 class-feedback/<id> 详情页允许） */
const PARENT_ROUTE_SEGS = [
  'ai', 'archive', 'benefits', 'bind', 'class-feedback', 'dashboard', 'fees',
  'growth', 'intensive', 'leave', 'lesson-detail', 'materials', 'meals',
  'messages', 'notifications', 'phet', 'practice', 'profile', 'schedule',
  'services', 'students', 'study-hall', 'teachers', 'vip', 'volunteer',
]

/** 教师端真实路由白名单（与 src/app/teacher 目录一致） */
const TEACHER_ROUTE_SEGS = [
  'ai', 'attendance', 'benefits', 'classroom-feedback', 'compensation',
  'dashboard', 'feedback', 'intensive', 'leave', 'lesson', 'lesson-previews',
  'materials', 'meals', 'messages', 'papers', 'performance', 'phet', 'salary',
  'schedule', 'services', 'student', 'student-profile', 'students', 'study-hall',
  'teaching-schedule', 'today-lessons',
]

function routeSegments(raw: string): string[] | null {
  const pathname = raw.split(/[?#]/, 1)[0]
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\')) return null

  try {
    const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent)
    if (segments.some((segment) => !segment || segment === '.' || segment === '..' || /[\\/]/.test(segment))) return null
    return segments
  } catch {
    return null
  }
}

function pathSeg(raw: string, namespace?: 'parent' | 'teacher'): string | null {
  const segments = routeSegments(raw)
  if (!segments) return null
  if (namespace) {
    if (segments[0] !== namespace) return null
    return segments[1] || null
  }
  return segments[0] || null
}

function isParentRoute(raw: string): boolean {
  const seg = pathSeg(raw, 'parent')
  return !!seg && PARENT_ROUTE_SEGS.includes(seg)
}

function isTeacherRoute(raw: string): boolean {
  const seg = pathSeg(raw, 'teacher')
  return !!seg && TEACHER_ROUTE_SEGS.includes(seg)
}

/** 管理端（根级路由）页面前缀白名单：与 src/app/(main) 目录一一对应 */
const ADMIN_ROUTE_PREFIXES = [
  'dashboard', 'students', 'teachers', 'attendance', 'classroom-feedback', 'fees',
  'notifications', 'parent-messages', 'communication-center', 'communications',
  'leave-requests', 'teacher-salary', 'academic-terms', 'reports', 'performance',
  'schedule', 'courses', 'closed-loop', 'daily-class', 'feedback-performance',
  'appointment-detail', 'class-detail', 'student-archive', 'data-admin',
  'login-records', 'materials', 'meals', 'parent-access', 'settings', 'trash',
  'grades', 'study-hall', 'teacher-compliance', 'teacher-logs', 'services',
  'volunteer', 'volunteer-center', 'volunteer-sim', 'phet', 'ai',
]

function isAdminRoute(raw: string): boolean {
  const seg = pathSeg(raw)
  return !!seg && ADMIN_ROUTE_PREFIXES.includes(seg)
}

/**
 * 通知 href 安全化：数据库里存的 href 可能是旧版/失效路径（点击 404）。
 * 只信任当前真实存在的路由；无法确认的一律按类型回退到稳定页面。
 */
function safeHref(raw: string | null | undefined, role: Role, relatedType: string | null | undefined): string {
  const t = (relatedType || '').toUpperCase()

  if (raw && routeSegments(raw)) {
    if (role === 'parent' && isParentRoute(raw)) return raw
    if (role === 'teacher' && isTeacherRoute(raw)) return raw
    if (role === 'admin' && isAdminRoute(raw)) return raw
  }

  // 无可靠 href：按通知类型映射到真实路由
  if (role === 'parent') {
    if (/(FEEDBACK|课堂反馈)/.test(t)) return '/parent/class-feedback'
    if (/(MESSAGE|留言)/.test(t)) return '/parent/messages'
    if (/(FEE|PAYMENT|缴费|费用)/.test(t)) return '/parent/fees'
    if (/(PAPER|EXAM|PRACTICE|试卷|练习)/.test(t)) return '/parent/practice'
    if (/(MATERIAL|资料)/.test(t)) return '/parent/materials'
    if (/(SCHEDULE|COURSE|课程|课表)/.test(t)) return '/parent/schedule'
    if (/(STUDY_HALL|自习)/.test(t)) return '/parent/study-hall'
    if (/(BENEFIT|VIP)/.test(t)) return '/parent/benefits'
    return '/parent/notifications'
  }
  if (role === 'teacher') {
    if (/(FEEDBACK|课堂反馈)/.test(t)) return '/teacher/feedback'
    if (/(MESSAGE|留言)/.test(t)) return '/teacher/messages'
    if (/(ATTENDANCE|考勤)/.test(t)) return '/teacher/attendance'
    if (/(SCHEDULE|LESSON|课程|课表)/.test(t)) return '/teacher/schedule'
    if (/(PAPER|EXAM|试卷)/.test(t)) return '/teacher/papers'
    if (/(SALARY|COMPENSATION|课时费)/.test(t)) return '/teacher/compensation'
    return '/teacher/dashboard'
  }
  // admin
  if (/(FEEDBACK|课堂反馈)/.test(t)) return '/classroom-feedback'
  if (/(MESSAGE|留言)/.test(t)) return '/parent-messages'
  if (/(ATTENDANCE|考勤)/.test(t)) return '/attendance'
  if (/(FEE|SALARY|PAYMENT|缴费|工资)/.test(t)) return '/fees'
  if (/(STUDENT|学员)/.test(t)) return '/students'
  if (/(TEACHER|教师)/.test(t)) return '/teachers'
  if (/(LEAVE|请假)/.test(t)) return '/leave-requests'
  return '/communications'
}

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const prisma = await getRequestPrisma()
  const role = (user.role === 'parent' || user.role === 'teacher' ? user.role : 'admin') as Role
  const alerts: RecentAlert[] = []

  if (role === 'parent') {
    // Keep dashboard alerts behind the same current-term entitlement check as
    // the parent portal APIs; getCurrentUser validates the session but not this
    // eligibility window.
    await requireParentUser()
    const activeStudentIds = (
      await prisma.student.findMany({
        where: parentLinkedStudentWhere(user.id),
        select: { id: true },
      })
    ).map((s) => s.id)

    const [feedbacks, notifications, replyRows] = await Promise.all([
      // ① 未读课堂反馈
      prisma.classroomFeedback.findMany({
        where: parentUnreadClassroomFeedbackWhere(user.id, activeStudentIds),
        select: {
          id: true,
          summary: true,
          createdAt: true,
          teacher: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      // ② 未读系统通知
      prisma.notification.findMany({
        where: {
          userId: user.id,
          ...unreadNotificationWhere,
          ...visibleNotificationWhere,
          NOT: {
            OR: [
              { relatedType: { in: ['CLASSROOM_FEEDBACK', 'PARENT_MESSAGE', 'PARENT_MESSAGE_REPLY'] } },
              { relatedType: null, type: { in: ['CLASSROOM_FEEDBACK', 'PARENT_MESSAGE', 'PARENT_MESSAGE_REPLY'] } },
            ],
          },
        },
        select: {
          id: true,
          title: true,
          content: true,
          href: true,
          relatedType: true,
          relatedId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      // ③ 老师留言回复未读
      prisma.parentMessageReply.findMany({
        where: { role: { not: 'parent' }, isReadByParent: false, message: { parentId: user.id } },
        select: { id: true, content: true, createdAt: true, messageId: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ])

    for (const f of feedbacks) {
      alerts.push({
        key: `fb_${f.id}`,
        type: 'CLASSROOM_FEEDBACK',
        label: '课堂反馈',
        title: `${f.teacher?.name ?? '老师'} 发布了课堂反馈`,
        snippet: snippetOf(f.summary),
        time: f.createdAt.toISOString(),
        href: `/parent/class-feedback/${f.id}`,
      })
    }
    for (const n of notifications) {
      alerts.push({
        key: `nt_${n.id}`,
        notificationId: n.id,
        type: n.relatedType || 'NOTICE',
        label: NOTIFICATION_TYPE_LABEL[n.relatedType || ''] || '通知',
        title: n.title,
        snippet: snippetOf(n.content),
        time: n.createdAt.toISOString(),
        href: safeHref(n.href, role, n.relatedType),
      })
    }
    for (const r of replyRows) {
      alerts.push({
        key: `msg_${r.id}`,
        type: 'MESSAGE',
        label: '留言',
        title: '老师回复了你的留言',
        snippet: snippetOf(r.content),
        time: r.createdAt.toISOString(),
        href: `/parent/messages?messageId=${r.messageId}`,
      })
    }
  } else {
    // teacher / admin：未读系统通知（href 安全化，无可靠目标的不展示）
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, ...unreadNotificationWhere, ...visibleNotificationWhere },
      select: {
        id: true,
        title: true,
        content: true,
        href: true,
        relatedType: true,
        relatedId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })
    for (const n of notifications) {
      const href = safeHref(n.href, role, n.relatedType)
      if (!href) continue // 无可跳转目标的不展示
      alerts.push({
        key: `nt_${n.id}`,
        notificationId: n.id,
        type: n.relatedType || 'NOTICE',
        label: NOTIFICATION_TYPE_LABEL[n.relatedType || ''] || '通知',
        title: n.title,
        snippet: snippetOf(n.content),
        time: n.createdAt.toISOString(),
        href,
      })
    }
  }

  alerts.sort((a, b) => (a.time < b.time ? 1 : -1))
  return NextResponse.json({ alerts: alerts.slice(0, 6) }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
})
