import { NextRequest, NextResponse } from 'next/server'
import { getRequestDivision } from '@/lib/division'
import { writeSalaryExportWorkbook, type SalaryExportRow } from '@/lib/salary-export'
import { requireAdminUser } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

function salaryPeriodStart(period: string, now: Date) {
  if (period === 'week') return new Date(now.getTime() - 7 * 86400000)
  if (period === 'all') return new Date(0)
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function periodLabel(period: string) {
  if (period === 'week') return '本周（近7天）'
  if (period === 'all') return '全部历史'
  return '本月'
}

function typeLabel(type: string) {
  if (type === 'LESSON_PAY') return '课时薪资'
  if (type === 'FEEDBACK_BONUS') return '反馈奖励'
  if (type === 'manual_adjust') return '手动调整'
  return '其他调整'
}

function courseTypeLabel(type: string | null | undefined) {
  if (type === 'ONE_ON_ONE') return '一对一'
  if (type === 'SMALL_GROUP') return '小组课'
  if (type === 'GROUP') return '班课'
  return type || ''
}

function safeFilenamePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || '教师'
}

function formatDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminUser()
    const prisma = admin.prisma
    const teacherId = req.nextUrl.searchParams.get('teacherId')?.trim() || ''
    const requestedPeriod = req.nextUrl.searchParams.get('period') || 'month'
    const period = ['week', 'month', 'all'].includes(requestedPeriod) ? requestedPeriod : 'month'
    const division = getRequestDivision(admin, req.nextUrl.searchParams.get('division'))
    if (!teacherId) return NextResponse.json({ error: '请选择要导出的教师' }, { status: 400 })

    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, division },
      select: { id: true, name: true },
    })
    if (!teacher) return NextResponse.json({ error: '教师不存在或不属于当前学部' }, { status: 404 })

    const now = new Date()
    const since = salaryPeriodStart(period, now)
    const transactions = await prisma.teacherSalaryTransaction.findMany({
      where: { teacherId, createdAt: { gte: since } },
      orderBy: [{ lessonDate: 'desc' }, { createdAt: 'desc' }],
    })

    const lessonIds = [...new Set(transactions.map((item) => item.lessonId).filter((id): id is string => Boolean(id)))]
    const feedbackIds = [...new Set(transactions.map((item) => item.feedbackId).filter((id): id is string => Boolean(id)))]

    const [lessons, feedbacks] = await Promise.all([
      lessonIds.length ? prisma.classLesson.findMany({
        where: { id: { in: lessonIds } },
        select: {
          id: true, lessonDate: true, startTime: true, endTime: true, subject: true,
          group: { select: { name: true, lessonMinutes: true, course: { select: { name: true, subject: true, type: true, grade: true } } } },
        },
      }) : [],
      feedbackIds.length ? prisma.classroomFeedback.findMany({
        where: { id: { in: feedbackIds } },
        select: {
          id: true, studentIds: true, feedbackCourseType: true, feedbackGroupId: true,
          classLesson: {
            select: {
              id: true, lessonDate: true, startTime: true, endTime: true, subject: true,
              group: { select: { name: true, lessonMinutes: true, course: { select: { name: true, subject: true, type: true, grade: true } } } },
            },
          },
        },
      }) : [],
    ])

    const fallbackGroupIds = [...new Set(feedbacks.map((item) => item.feedbackGroupId).filter((id): id is string => Boolean(id)))]
    const fallbackGroups = fallbackGroupIds.length ? await prisma.classGroup.findMany({
      where: { id: { in: fallbackGroupIds } },
      select: { id: true, name: true, lessonMinutes: true, course: { select: { name: true, subject: true, type: true, grade: true } } },
    }) : []
    const studentIds = [...new Set(feedbacks.flatMap((item) => item.studentIds))]
    const students = studentIds.length ? await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true },
    }) : []

    const lessonMap = new Map(lessons.map((item) => [item.id, item]))
    const feedbackMap = new Map(feedbacks.map((item) => [item.id, item]))
    const groupMap = new Map(fallbackGroups.map((item) => [item.id, item]))
    const studentMap = new Map(students.map((item) => [item.id, item.name]))

    const rows: SalaryExportRow[] = transactions.map((transaction) => {
      const lesson = transaction.lessonId ? lessonMap.get(transaction.lessonId) : null
      const feedback = transaction.feedbackId ? feedbackMap.get(transaction.feedbackId) : null
      const feedbackLesson = feedback?.classLesson || null
      const feedbackGroup = feedback?.feedbackGroupId ? groupMap.get(feedback.feedbackGroupId) : null
      const group = lesson?.group || feedbackLesson?.group || feedbackGroup || null
      const course = group?.course || null
      const effectiveLesson = lesson || feedbackLesson
      const names = feedback?.studentIds.map((id) => studentMap.get(id) || id) || []
      return {
        id: transaction.id,
        type: transaction.type,
        typeLabel: typeLabel(transaction.type),
        amount: transaction.amount,
        description: transaction.description || '',
        lessonDate: transaction.lessonDate || effectiveLesson?.lessonDate || null,
        createdAt: transaction.createdAt,
        courseName: course?.name || '',
        className: group?.name || '',
        subject: effectiveLesson?.subject || course?.subject || '',
        courseType: courseTypeLabel(course?.type || feedback?.feedbackCourseType),
        grade: course?.grade || '',
        lessonTime: effectiveLesson?.startTime ? `${effectiveLesson.startTime}-${effectiveLesson.endTime}` : '',
        lessonMinutes: group?.lessonMinutes ?? null,
        studentNames: names.join('、'),
        studentCount: feedback ? feedback.studentIds.length : null,
        lessonId: transaction.lessonId || feedbackLesson?.id || '',
        feedbackId: transaction.feedbackId || '',
      }
    })

    const actualStart = period === 'all'
      ? transactions.reduce<Date | null>((earliest, item) => !earliest || item.createdAt < earliest ? item.createdAt : earliest, null)
      : since
    const rangeLabel = actualStart ? `${formatDate(actualStart)} 至 ${formatDate(now)}` : '暂无流水'
    const buffer = writeSalaryExportWorkbook({
      teacherName: teacher.name,
      periodLabel: periodLabel(period),
      rangeLabel,
      exportedAt: now,
      rows,
    })
    const filename = `${safeFilenamePart(teacher.name)}老师薪资流水_${periodLabel(period).replace(/[（）]/g, '')}_${formatDate(now)}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'ADMIN_UNAUTHORIZED') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }
    console.error('[admin:salary:export]', error)
    return NextResponse.json({ error: '导出失败，请稍后重试' }, { status: 500 })
  }
}
