/**
 * 系统实时摘要（AI 智能体感知数据源）
 *
 * 供两处使用：
 * 1. /api/ai/chat —— 把摘要注入 system prompt，让 AI 回答时能引用系统真实数据
 * 2. /api/ai/system-digest —— 悬浮球气泡提示
 *
 * parent 汇总与 /api/parent/unread-counts 共用通知去重条件和总数函数，
 * 避免试卷、表现、反馈通知与其对应业务记录重复计数。
 */
import type { PrismaClient } from '@prisma/client'
import {
  parentLinkedStudentWhere,
  parentVisibleExamPaperWhere,
  parentVisiblePerformancePostWhere,
  visibleClassGroupWhere,
  visibleClassLessonWhere,
  visibleNotificationWhere,
  visibleTeacherWhere,
  parentActiveEnrollmentWhere,
} from '@/lib/business-visibility'
import { unreadNotificationWhere } from '@/lib/notification-read-state'
import { summarizeParentMessageWorkflow } from '@/lib/parent-message-workflow'
import { standaloneParentNotificationWhere, sumParentUnreadItems } from '@/lib/parent-unread'
import { teacherLessonWhere } from '@/lib/teacher-portal'

export interface SystemDigest {
  role: string
  counts: Record<string, number>
  lines: string[]
  /** 可直接注入 AI 上下文的完整摘要文本 */
  text: string
}

type UserLite = { id: string; role: string; teacherId?: string | null }

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function nextDay(d: Date): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + 1)
  return x
}

export async function buildSystemDigest(user: UserLite, prisma: PrismaClient): Promise<SystemDigest> {
  const counts: Record<string, number> = {}
  const lines: string[] = []

  if (user.role === 'parent') {
    const activeStudentIds = (
      await prisma.student.findMany({
        where: parentLinkedStudentWhere(user.id),
        select: { id: true },
      })
    ).map((s) => s.id)

    const [papers, posts, notifications, feedbacks, studyHallHomework, messageRows] = await Promise.all([
      prisma.examPaper.count({
        where: { ...parentVisibleExamPaperWhere(user.id), isReadByParent: false },
      }),
      prisma.performancePost.count({
        where: {
          ...parentVisiblePerformancePostWhere(user.id),
          isReadByParent: false,
          visibility: 'PARENT_ONLY',
        },
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          ...unreadNotificationWhere,
          ...visibleNotificationWhere,
          ...standaloneParentNotificationWhere,
        },
      }),
      prisma.classroomFeedback.count({
        where: { status: 'PUBLISHED', parentReadAt: null, studentIds: { hasSome: activeStudentIds } },
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          ...unreadNotificationWhere,
          relatedType: 'STUDY_HALL_HOMEWORK',
          ...visibleNotificationWhere,
        },
      }),
      prisma.parentMessage.findMany({
        where: { parentId: user.id },
        select: {
          status: true,
          replies: {
            select: { role: true, createdAt: true, isReadByParent: true, isReadByTeacher: true },
          },
        },
      }),
    ])
    const messages = summarizeParentMessageWorkflow(messageRows).unreadForParent

    Object.assign(counts, { papers, posts, notifications, feedbacks, studyHallHomework, messages })
    if (feedbacks > 0) lines.push(`课堂反馈有 ${feedbacks} 条未读，建议及时查看`)
    if (papers > 0) lines.push(`有 ${papers} 份新试卷未读`)
    if (posts > 0) lines.push(`学习动态有 ${posts} 条未读`)
    if (notifications > 0) lines.push(`另有 ${notifications} 条其他通知未读`)
    if (messages > 0) lines.push(`家校留言有 ${messages} 条未读`)
    const total = sumParentUnreadItems({ papers, posts, notifications, feedbacks, messages })
    counts.total = total
    if (total === 0) lines.push('当前没有未读动态，一切正常')

    // 最近课堂反馈明细：让 AI 能直接引用真实内容回答「帮我看看课堂反馈」
    const feedbackRows = await prisma.classroomFeedback.findMany({
      where: { status: 'PUBLISHED', studentIds: { hasSome: activeStudentIds } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        teacherId: true,
        lessonContent: true,
        summary: true,
        overallComment: true,
        mood: true,
        badge: true,
        tags: true,
        createdAt: true,
      },
    })
    if (feedbackRows.length > 0) {
      const teacherIds = [...new Set(feedbackRows.map((f) => f.teacherId))]
      const teachers = await prisma.teacher.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, name: true },
      })
      const teacherName = new Map(teachers.map((t) => [t.id, t.name]))
      lines.push('【最近课堂反馈明细】')
      for (const fb of feedbackRows) {
        const who = teacherName.get(fb.teacherId) || '老师'
        const day = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(fb.createdAt)
        const body = (fb.summary || fb.overallComment || fb.lessonContent || '').replace(/\s+/g, ' ').trim()
        const detail = `${who}·${day}：${body.slice(0, 60)}${body.length > 60 ? '…' : ''}${fb.badge ? `（${fb.badge}）` : ''}`
        lines.push(detail)
      }
    }

    // 今日课程明细：让 AI 能直接引用真实课程回答「今天孩子有什么安排」
    const todayStart = startOfDay(new Date())
    const todayEnd = nextDay(todayStart)
    const todayLessonRows = await prisma.classLesson.findMany({
      where: {
        ...visibleClassLessonWhere,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        lessonDate: { gte: todayStart, lt: todayEnd },
        group: {
          ...visibleClassGroupWhere,
          teacher: visibleTeacherWhere,
          enrollments: {
            some: { studentId: { in: activeStudentIds }, ...parentActiveEnrollmentWhere(user.id) },
          },
        },
      },
      include: {
        teacher: { select: { name: true } },
        group: {
          include: {
            course: { select: { name: true, subject: true } },
            teacher: { select: { name: true } },
            room: { select: { name: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 12,
    })
    if (todayLessonRows.length > 0) {
      lines.push('【今日课程安排】')
      for (const l of todayLessonRows) {
        const course = l.group.course?.name || l.group.name
        const subject = l.group.course?.subject || l.subject || ''
        const teacher = l.teacher?.name || l.group.teacher?.name || ''
        const room = l.group.room?.name || ''
        lines.push(`${l.startTime}-${l.endTime} ${course}${subject ? `（${subject}）` : ''}${teacher ? `·${teacher}老师` : ''}${room ? `·${room}` : ''}`)
      }
    } else {
      lines.push('今日孩子没有排课（系统无当日课程安排），家长可按孩子实际作息安排学习')
    }
  } else {
    // teacher / admin：今日课程数 + 未读通知
    const today = startOfDay(new Date())
    const todayEnd = nextDay(today)
    // getCurrentUser resolves legacy/unbound teacher accounts before calling
    // this function. Reuse that scoped id instead of reading only User.teacherId.
    const teacherId = user.role === 'teacher' ? user.teacherId ?? null : null
    const lessonScope = user.role === 'teacher'
      ? teacherId ? teacherLessonWhere(teacherId) : null
      : visibleClassLessonWhere
    const [todayLessons, notifications] = await Promise.all([
      !lessonScope
        ? Promise.resolve(0)
        : prisma.classLesson.count({
            where: {
              ...lessonScope,
              lessonDate: { gte: today, lt: todayEnd },
            },
          }),
      prisma.notification.count({
        where: { userId: user.id, ...unreadNotificationWhere, ...visibleNotificationWhere },
      }),
    ])
    Object.assign(counts, { todayLessons, notifications })
    if (todayLessons > 0) lines.push(`今日共有 ${todayLessons} 节课`)
    if (notifications > 0) lines.push(`有 ${notifications} 条未读通知`)
    if (todayLessons === 0 && notifications === 0) lines.push('今日暂无课程和未读通知')

    // 今日课程明细：让 AI 能直接引用真实课程回答「今天有哪些课」
    if (lessonScope && todayLessons > 0) {
      const lessonRows = await prisma.classLesson.findMany({
        where: { ...lessonScope, lessonDate: { gte: today, lt: todayEnd } },
        orderBy: { startTime: 'asc' },
        take: 8,
        select: { id: true, subject: true, startTime: true, endTime: true, groupId: true, status: true },
      })
      if (lessonRows.length > 0) {
        const groupIds = [...new Set(lessonRows.map((l) => l.groupId))]
        const groups = await prisma.classGroup.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, name: true },
        })
        const groupName = new Map(groups.map((g) => [g.id, g.name]))
        lines.push('【今日课程明细】')
        for (const l of lessonRows) {
          const statusText = l.status === 'COMPLETED' ? '已完成' : l.status === 'CANCELLED' ? '已取消' : '待上课'
          lines.push(`${l.startTime}-${l.endTime} ${l.subject || '未定科目'} ${groupName.get(l.groupId) || ''}（${statusText}）`)
        }
      }
    }

    // 管理端核心统计
    if (user.role !== 'teacher') {
      const [studentCount, teacherCount, pendingFeedbackCount] = await Promise.all([
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.classroomFeedback.count({ where: { status: 'DRAFT' } }),
      ])
      Object.assign(counts, { studentCount, teacherCount, pendingFeedbackCount })
      lines.push(`系统现有学员 ${studentCount} 人、教师 ${teacherCount} 人，草稿态课堂反馈 ${pendingFeedbackCount} 条待处理`)
    }
  }

  return {
    role: user.role,
    counts,
    lines,
    text: `【系统实时摘要】${lines.join('；')}。数据来自系统当前状态，仅供回答参考；若数据不完整请如实说明，不要编造未提供的数字。`,
  }
}
