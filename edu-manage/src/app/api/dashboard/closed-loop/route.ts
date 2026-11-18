import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000)
}

function formatTimeAgo(date: Date) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  return `${Math.floor(diffHours / 24)}天前`
}

const ATT_LABELS: Record<string, string> = {
  PRESENT: '出勤',
  LEAVE: '请假',
  ABSENT: '缺勤',
  MAKEUP: '补课',
}

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const division = getRequestDivision(user, searchParams.get('division'))
  const section = searchParams.get('section') || 'attendance'
  const selectedTerm = await resolveAdminTermScope(prisma, division, req)
  const scopedTermId = selectedTerm?.id || '__NO_SELECTED_TERM__'
  const termGroupWhere = { ...visibleClassGroupWhere, termId: scopedTermId }
  const scopedStudentWhere = { ...visibleStudentWhere, division }

  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = addDays(today, 1)
  const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`

  // ── 考勤 / 反馈：按当天课程明细 ──
  const lessons = await prisma.classLesson.findMany({
    where: {
      division,
      lessonDate: { gte: today, lt: todayEnd },
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      group: termGroupWhere,
    },
    orderBy: { startTime: 'asc' },
    include: {
      teacher: { select: { name: true, avatar: true } },
      group: {
        include: {
          course: { select: { name: true } },
          room: { select: { name: true } },
          teacher: { select: { name: true, avatar: true } },
        },
      },
      lessonStudents: {
        orderBy: { createdAt: 'asc' },
        select: { student: { select: { id: true, name: true, membershipLevel: true } } },
      },
      attendances: { select: { studentId: true, status: true, hoursDeducted: true } },
      classroomFeedbacks: {
        orderBy: { createdAt: 'desc' },
        select: { studentIds: true, summary: true, createdAt: true },
      },
    },
  })

  const lessonRows = lessons.map((lesson) => {
    const attendanceMap = new Map(lesson.attendances.map((a) => [a.studentId, a]))
    const feedback = lesson.classroomFeedbacks[0]
    const feedbackStudentIds = new Set(feedback?.studentIds ?? [])
    const students = lesson.lessonStudents.map(({ student }) => {
      const attendance = attendanceMap.get(student.id)
      return {
        id: student.id,
        name: student.name,
        membershipLevel: student.membershipLevel,
        attendanceStatus: attendance ? (ATT_LABELS[attendance.status] ?? attendance.status) : null,
        hoursDeducted: attendance?.hoursDeducted ?? 0,
      }
    })
    return {
      id: lesson.id,
      time: `${lesson.startTime}-${lesson.endTime}`,
      subject: lesson.subject ?? lesson.group.course?.name ?? '未设置学科',
      groupName: lesson.group.name,
      room: lesson.group.room?.name ?? null,
      teacherName: lesson.teacher?.name ?? lesson.group.teacher.name ?? '未知教师',
      attendanceSubmitted: Boolean(lesson.attendanceSubmittedAt),
      feedbackSummary: feedback?.summary ?? null,
      feedbackCreatedAt: feedback?.createdAt.toISOString() ?? null,
      students,
      missingFeedbackStudents: students
        .filter((s) => !feedbackStudentIds.has(s.id))
        .map((s) => s.name),
    }
  })

  // ── 留言：待教师回复的家长留言 ──
  const messages = await prisma.parentMessage.findMany({
    where: {
      student: scopedStudentWhere,
      status: 'OPEN',
      replies: { none: { role: 'teacher' } },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: {
      id: true,
      title: true,
      subject: true,
      createdAt: true,
      student: { select: { name: true, membershipLevel: true } },
      parent: { select: { name: true } },
      replies: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, authorName: true, createdAt: true } },
    },
  })

  const summary = {
    totalLessons: lessonRows.length,
    attendanceDone: lessonRows.filter((l) => l.attendanceSubmitted).length,
    attendancePending: lessonRows.filter((l) => !l.attendanceSubmitted).length,
    feedbackDone: lessonRows.filter((l) => l.feedbackSummary).length,
    feedbackPending: lessonRows.filter((l) => !l.feedbackSummary).length,
    openMessages: messages.length,
  }


  return NextResponse.json({
    dateLabel,
    section,
    summary,
    lessons: lessonRows,
    messages: messages.map((m) => ({
      id: m.id,
      title: m.title,
      subject: m.subject,
      studentName: m.student?.name ?? '未知学生',
      membershipLevel: m.student?.membershipLevel ?? 'NORMAL',
      parentName: m.parent?.name ?? '家长',
      createdAt: m.createdAt.toISOString(),
      createdTimeAgo: formatTimeAgo(m.createdAt),
      lastReply: m.replies[0] ? { content: m.replies[0].content, authorName: m.replies[0].authorName } : null,
    })),
  })
})
