import { NextRequest, NextResponse } from 'next/server'
import { getRequestDivision } from '@/lib/division'
import { writeSalaryExportWorkbook, type SalaryExportRow } from '@/lib/salary-export'
import { requireAdminUser } from '@/lib/teacher-portal'
import { classifySalaryBucket } from '@/lib/salary-bucket'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

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
  if (type === 'LESSON_PAY_ADJUSTMENT') return '课时薪资结算调整'
  if (type === 'FEEDBACK_BONUS') return '反馈奖励'
  if (type === 'STUDY_HALL_BONUS') return '作业登记奖励'
  if (type === 'STUDY_HALL_ATTENDANCE') return '晚托考勤奖励'
  if (type === 'manual_adjust') return '手动调整'
  return '其他调整'
}

function courseTypeLabel(type: string | null | undefined) {
  if (type === 'ONE_ON_ONE') return '一对一'
  if (type === 'ONE_ON_TWO') return '一对二'
  if (type === 'ONE_ON_THREE') return '一对三'
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
    const selectedTerm = await resolveAdminTermScope(prisma, division, req)
    if (!teacherId) return NextResponse.json({ error: '请选择要导出的教师' }, { status: 400 })
    if (!selectedTerm) return NextResponse.json({ error: '请先在数据总览选择一个运营批次' }, { status: 409 })

    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, division },
      select: { id: true, name: true },
    })
    if (!teacher) return NextResponse.json({ error: '教师不存在或不属于当前学部' }, { status: 404 })

    const now = new Date()
    const since = salaryPeriodStart(period, now)
    const transactions = await prisma.teacherSalaryTransaction.findMany({
      where: { teacherId, createdAt: { gte: since }, termId: selectedTerm.id, deletedAt: null },
      orderBy: [{ lessonDate: 'desc' }, { createdAt: 'desc' }],
    })

    const lessonIds = [...new Set(transactions.map((item) => item.lessonId).filter((id): id is string => Boolean(id)))]
    const feedbackIds = [...new Set(transactions.map((item) => item.feedbackId).filter((id): id is string => Boolean(id)))]

    const [lessons, feedbacks] = await Promise.all([
      lessonIds.length ? prisma.classLesson.findMany({
        where: { id: { in: lessonIds } },
        select: {
          id: true, lessonDate: true, startTime: true, endTime: true, subject: true, actualMinutes: true,
          group: { select: { name: true, lessonMinutes: true, intensiveMode: true, course: { select: { name: true, subject: true, type: true, grade: true } } } },
        },
      }) : [],
      feedbackIds.length ? prisma.classroomFeedback.findMany({
        where: { id: { in: feedbackIds } },
        select: {
          id: true, studentIds: true, feedbackCourseType: true, feedbackGroupId: true,
          classLesson: {
            select: {
              id: true, lessonDate: true, startTime: true, endTime: true, subject: true, actualMinutes: true,
              group: { select: { name: true, lessonMinutes: true, intensiveMode: true, course: { select: { name: true, subject: true, type: true, grade: true } } } },
            },
          },
        },
      }) : [],
    ])

    const fallbackGroupIds = [...new Set(feedbacks.map((item) => item.feedbackGroupId).filter((id): id is string => Boolean(id)))]
    const fallbackGroups = fallbackGroupIds.length ? await prisma.classGroup.findMany({
      where: { id: { in: fallbackGroupIds } },
      select: { id: true, name: true, lessonMinutes: true, intensiveMode: true, course: { select: { name: true, subject: true, type: true, grade: true } } },
    }) : []
    const rewardRecords = feedbackIds.length ? await prisma.feedbackRewardRecord.findMany({
      where: { feedbackId: { in: feedbackIds }, isActive: true },
      select: { feedbackId: true, studentId: true, subjectLabel: true, amount: true },
      orderBy: { createdAt: 'asc' },
    }) : []
    const studentIds = [...new Set([...feedbacks.flatMap((item) => item.studentIds), ...rewardRecords.map((item) => item.studentId)])]
    const students = studentIds.length ? await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true },
    }) : []

    const lessonMap = new Map(lessons.map((item) => [item.id, item]))
    const feedbackMap = new Map(feedbacks.map((item) => [item.id, item]))
    const groupMap = new Map(fallbackGroups.map((item) => [item.id, item]))
    const studentMap = new Map(students.map((item) => [item.id, item.name]))
    const rewardsByFeedback = new Map<string, typeof rewardRecords>()
    for (const reward of rewardRecords) {
      if (!reward.feedbackId) continue
      const current = rewardsByFeedback.get(reward.feedbackId) || []
      current.push(reward)
      rewardsByFeedback.set(reward.feedbackId, current)
    }

    const rows: SalaryExportRow[] = transactions.map((transaction) => {
      const lesson = transaction.lessonId ? lessonMap.get(transaction.lessonId) : null
      const feedback = transaction.feedbackId ? feedbackMap.get(transaction.feedbackId) : null
      const feedbackLesson = feedback?.classLesson || null
      const feedbackGroup = feedback?.feedbackGroupId ? groupMap.get(feedback.feedbackGroupId) : null
      const group = lesson?.group || feedbackLesson?.group || feedbackGroup || null
      const course = group?.course || null
      const effectiveLesson = lesson || feedbackLesson
      const validRewards = transaction.feedbackId ? rewardsByFeedback.get(transaction.feedbackId) || [] : []
      const validStudentIds = validRewards.length ? validRewards.map((item) => item.studentId) : feedback?.studentIds || []
      const names = validStudentIds.map((id) => studentMap.get(id) || id)
      const salaryBucket = classifySalaryBucket({
        lessonIsIntensive: group?.intensiveMode === 'INTENSIVE',
        feedbackIsIntensive: ['ONE_ON_ONE', 'ONE_ON_TWO', 'ONE_ON_THREE'].includes(feedback?.feedbackCourseType || ''),
        description: transaction.description,
      })
      const isFeedback = transaction.type === 'FEEDBACK_BONUS'
      const validFeedbackCount = isFeedback ? validStudentIds.length : null
      const lessonMinutes = group?.intensiveMode === 'INTENSIVE'
        ? Number(effectiveLesson?.actualMinutes || group?.lessonMinutes || 0) || null
        : group?.lessonMinutes ?? null
      const subject = validRewards.find((item) => item.subjectLabel)?.subjectLabel || effectiveLesson?.subject || course?.subject || ''
      const unitAmount = isFeedback && validFeedbackCount
        ? Number((transaction.amount / validFeedbackCount).toFixed(2))
        : null
      const detailDescription = isFeedback
        ? `${subject || '未标注科目'}反馈：${validFeedbackCount || 0}次有效反馈${names.length ? `（${names.join('、')}）` : ''}，单价￥${Number(unitAmount || 0).toFixed(2)}，合计￥${Number(transaction.amount).toFixed(2)}`
        : transaction.type === 'LESSON_PAY' || transaction.type === 'LESSON_PAY_ADJUSTMENT'
          ? `${formatDate(transaction.lessonDate || effectiveLesson?.lessonDate || transaction.createdAt)} ${effectiveLesson?.startTime ? `${effectiveLesson.startTime}-${effectiveLesson.endTime}` : ''}，${course?.name || group?.name || '课程'}，计薪${lessonMinutes || 0}分钟，合计￥${Number(transaction.amount).toFixed(2)}${transaction.description ? `；${transaction.description}` : ''}`
          : transaction.description || '管理员工资调整'
      return {
        id: transaction.id,
        type: transaction.type,
        typeLabel: typeLabel(transaction.type),
        salaryBucket,
        amount: transaction.amount,
        description: detailDescription,
        lessonDate: transaction.lessonDate || effectiveLesson?.lessonDate || null,
        createdAt: transaction.createdAt,
        courseName: course?.name || '',
        className: group?.name || '',
        subject,
        courseType: courseTypeLabel(course?.type || feedback?.feedbackCourseType),
        grade: course?.grade || '',
        lessonTime: effectiveLesson?.startTime ? `${effectiveLesson.startTime}-${effectiveLesson.endTime}` : '',
        lessonMinutes,
        studentNames: names.join('、'),
        studentCount: feedback ? validStudentIds.length : null,
        validFeedbackCount,
        unitAmount,
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
