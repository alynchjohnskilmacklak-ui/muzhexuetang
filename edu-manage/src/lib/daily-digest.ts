import type { PrismaClient } from '@prisma/client'

/** 考勤状态中文映射 */
const ATT_LABEL: Record<string, string> = {
  PRESENT: '出勤',
  LEAVE: '请假',
  ABSENT: '缺勤',
  MAKEUP: '补课',
}

/**
 * 生成「当日学习汇总」卡片内容（短期方案：企微家长群发同日合并）。
 * 聚合孩子当天整体信息：考勤、教师反馈、系统通知，供管理员一键发送。
 */
export async function buildDailyDigest(
  prisma: PrismaClient,
  studentId: string,
  studentName: string,
): Promise<{ title: string; desc: string; url: string }> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const lines: string[] = []

  // 1) 今日考勤（按课时日期）
  const attendances = await prisma.attendance.findMany({
    where: {
      studentId,
      lesson: { lessonDate: { gte: todayStart, lt: todayEnd } },
    },
    include: { lesson: { select: { subject: true, startTime: true, endTime: true } } },
    orderBy: { createdAt: 'asc' },
  })
  if (attendances.length > 0) {
    const parts = attendances.map((a) => {
      const subject = a.lesson?.subject || '课程'
      const time = a.lesson ? `${a.lesson.startTime}-${a.lesson.endTime}` : ''
      return `${subject}${time ? `(${time})` : ''}·${ATT_LABEL[a.status] || a.status}`
    })
    lines.push(`【今日考勤】${parts.join('；')}`)
  }

  // 2) 今日教师反馈（已发布；按反馈创建时间或所属课时日期）
  const feedbacks = await prisma.classroomFeedback.findMany({
    where: {
      studentIds: { has: studentId },
      status: { not: 'DRAFT' },
      createdAt: { gte: todayStart, lt: todayEnd },
    },
    include: {
      teacher: { select: { name: true } },
      classLesson: { select: { subject: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  if (feedbacks.length > 0) {
    const brief = feedbacks.map((f) => {
      const who = f.teacher?.name || (f.classLesson?.subject ? `${f.classLesson.subject}老师` : '老师')
      const text = (f.summary || f.lessonContent || '').replace(/\s+/g, ' ').trim()
      const excerpt = text.length > 26 ? `${text.slice(0, 26)}…` : text
      return `${who}：${excerpt || '已提交反馈'}`
    })
    lines.push(`【教师反馈】${feedbacks.length} 条。${brief.join('；')}`)
  }

  // 3) 今日系统通知（管理员/教师发送）
  const sentToday = await prisma.notification.count({
    where: {
      studentId,
      senderId: { not: null },
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  })
  if (sentToday > 0) {
    lines.push(`【今日通知】${sentToday} 条，请查看详情。`)
  }

  if (lines.length === 0) {
    lines.push(`今天没有新的课堂记录，点击查看 ${studentName} 的学习档案。`)
  }

  const desc = `${studentName} 今日学习汇总：\n${lines.join('\n')}`
  const url = `https://muzhexuetang.xyz/parent/dashboard?childId=${studentId}`
  return { title: `牧哲学堂 · ${studentName} 今日学习动态`, desc, url }
}
