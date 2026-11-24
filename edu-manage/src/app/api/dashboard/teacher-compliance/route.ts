import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'

export const dynamic = 'force-dynamic'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000)
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
  const teacherId = searchParams.get('teacherId')
  if (!teacherId) {
    return NextResponse.json({ error: '缺少 teacherId' }, { status: 400 })
  }


  const selectedTerm = await resolveAdminTermScope(prisma, division, req)
  const scopedTermId = selectedTerm?.id || '__NO_SELECTED_TERM__'
  const termGroupWhere = { ...visibleClassGroupWhere, termId: scopedTermId }
  const scopedStudentWhere = { ...visibleStudentWhere, division }

  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = addDays(today, 1)

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, division },
    select: { id: true, name: true, avatar: true, gender: true, tierLevel: true, subjects: true },
  })
  if (!teacher) {
    return NextResponse.json({ error: '教师不存在' }, { status: 404 })
  }

  const lessons = await prisma.classLesson.findMany({
    where: {
      division,
      deletedAt: null,
      lessonDate: { gte: today, lt: todayEnd },
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      group: termGroupWhere,
      OR: [{ teacherId }, { teacherId: null, group: { teacherId } }],
    },
    orderBy: { startTime: 'asc' },
    include: {
      teacher: { select: { name: true, avatar: true } },
      group: {
        include: {
          course: { select: { name: true, subject: true } },
          room: { select: { name: true } },
          teacher: { select: { name: true, avatar: true } },
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null, student: scopedStudentWhere },
            select: { studentId: true, subjects: true },
          },
        },
      },
      lessonStudents: {
        where: { student: scopedStudentWhere },
        orderBy: { createdAt: 'asc' },
        select: { student: { select: { id: true, name: true, membershipLevel: true } } },
      },
      attendances: { where: { deletedAt: null }, select: { id: true, studentId: true, status: true, hoursDeducted: true } },
      classroomFeedbacks: {
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, studentIds: true, summary: true, createdAt: true },
      },
    },
  })

  const result = lessons.map((lesson) => {
    const attendanceMap = new Map(lesson.attendances.map((a) => [a.studentId, a]))
    const feedback = lesson.classroomFeedbacks[0]
    const feedbackStudentIds = new Set(lesson.classroomFeedbacks.flatMap(row => row.studentIds))
    const eligibleStudentIds = new Set(resolveSubjectLessonStudentIds(
      lesson.lessonStudents.map(({ student }) => student.id),
      lesson.group.enrollments,
      lesson.subject ?? lesson.group.course?.subject,
      lesson.lessonDate,
    ))
    const students = lesson.lessonStudents
      .filter(({ student }) => eligibleStudentIds.has(student.id))
      .map(({ student }) => {
      const attendance = attendanceMap.get(student.id)
      return {
        id: student.id,
        name: student.name,
        membershipLevel: student.membershipLevel,
        attendanceId: attendance?.id ?? null,
        attendanceStatus: attendance ? (ATT_LABELS[attendance.status] ?? attendance.status) : null,
        attendanceStatusRaw: attendance?.status ?? null,
        hoursDeducted: attendance?.hoursDeducted ?? 0,
      }
      })
    return {
      id: lesson.id,
      time: `${lesson.startTime}-${lesson.endTime}`,
      subject: lesson.subject ?? lesson.group.course?.name ?? '未设置学科',
      groupName: lesson.group.name,
      room: lesson.group.room?.name ?? null,
      attendanceSubmitted: Boolean(lesson.attendanceSubmittedAt),
      feedbackId: feedback?.id ?? null,
      feedbackSummary: feedback?.summary ?? null,
      feedbackCreatedAt: feedback?.createdAt.toISOString() ?? null,
      students,
      missingFeedbackStudents: students
        .filter((s) => !feedbackStudentIds.has(s.id))
        .map((s) => s.name),
    }
  })

  const summary = {
    totalLessons: result.length,
    attendanceDone: result.filter((l) => l.attendanceSubmitted).length,
    attendancePending: result.filter((l) => !l.attendanceSubmitted).length,
    feedbackDone: result.filter((l) => l.feedbackSummary).length,
    feedbackPending: result.filter((l) => !l.feedbackSummary).length,
    missingFeedbackStudents: result.flatMap((l) => l.missingFeedbackStudents),
  }

  return NextResponse.json({
    teacher,
    dateLabel: `${today.getMonth() + 1}月${today.getDate()}日`,
    summary,
    lessons: result,
  })
})
