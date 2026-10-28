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
  visibleNotificationWhere,
} from '@/lib/business-visibility'
import { unreadNotificationWhere } from '@/lib/notification-read-state'
import { summarizeParentMessageWorkflow } from '@/lib/parent-message-workflow'
import { standaloneParentNotificationWhere, sumParentUnreadItems } from '@/lib/parent-unread'

export interface SystemDigest {
  role: string
  counts: Record<string, number>
  lines: string[]
  /** 可直接注入 AI 上下文的完整摘要文本 */
  text: string
}

type UserLite = { id: string; role: string }

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
  } else {
    // teacher / admin：今日课程数 + 未读通知
    const today = startOfDay(new Date())
    const todayEnd = nextDay(today)
    const teacherId = user.role === 'teacher'
      ? (await prisma.user.findUnique({ where: { id: user.id }, select: { teacherId: true } }))?.teacherId ?? null
      : null
    const [todayLessons, notifications] = await Promise.all([
      user.role === 'teacher' && !teacherId
        ? Promise.resolve(0)
        : prisma.classLesson.count({
            where: {
              lessonDate: { gte: today, lt: todayEnd },
              ...(user.role === 'teacher' ? { teacherId } : {}),
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
  }

  return {
    role: user.role,
    counts,
    lines,
    text: `【系统实时摘要】${lines.join('；')}。数据来自系统当前状态，仅供回答参考；若数据不完整请如实说明，不要编造未提供的数字。`,
  }
}
