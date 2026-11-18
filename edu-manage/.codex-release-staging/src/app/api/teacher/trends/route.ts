import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { teacherLessonScopeWhere } from '@/lib/teacher-portal'
import { getActiveAcademicTerm } from '@/lib/academic-term'

export const dynamic = 'force-dynamic'

/**
 * 教师端「教学与收入趋势」取数接口
 * 口径与教师首页一致：
 *  - 到课率 = 实际到勤 ÷ 应到，按本月已排课程分周统计
 *  - 课时费 = 近 6 个月 TeacherSalaryTransaction 月度汇总
 *  - 课时   = 近 6 个月考勤 hoursDeducted 月度累计
 */
export const GET = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  void req

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const activeTerm = teacher ? await getActiveAcademicTerm(prisma, teacher.division) : null
  const termId = activeTerm?.id || '__NO_ACTIVE_TERM__'
  const lessonWhere = await teacherLessonScopeWhere(prisma, teacher.id, termId)

  const [monthAttendanceForTrend, salaryTxForTrend, hoursTxForTrend] = await Promise.all([
    prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: monthStart } },
      select: { lessonDate: true, attendances: { select: { status: true } } },
    }),
    prisma.teacherSalaryTransaction.findMany({
      where: { teacherId: teacher.id, createdAt: { gte: sixMonthsAgo }, deletedAt: null },
      select: { createdAt: true, amount: true },
    }),
    prisma.attendance.findMany({
      where: { lesson: { ...lessonWhere, lessonDate: { gte: sixMonthsAgo } }, deletedAt: null },
      select: { hoursDeducted: true, lesson: { select: { lessonDate: true } } },
    }),
  ])

  const weekBuckets = new Map<number, { present: number; total: number }>()
  for (const lesson of monthAttendanceForTrend) {
    const week = Math.min(4, Math.floor((lesson.lessonDate.getDate() - 1) / 7))
    const bucket = weekBuckets.get(week) || { present: 0, total: 0 }
    bucket.total += lesson.attendances.length
    bucket.present += lesson.attendances.filter((item) => item.status === 'PRESENT').length
    weekBuckets.set(week, bucket)
  }
  const attendanceWeekTrend = Array.from({ length: 5 }, (_, index) => {
    const bucket = weekBuckets.get(index)
    return {
      label: '第' + (index + 1) + '周',
      rate: bucket && bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : null,
    }
  }).filter((item): item is { label: string; rate: number } => item.rate !== null)

  const trendMonthKeys: string[] = []
  for (let i = 5; i >= 0; i--) {
    const trendDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    trendMonthKeys.push(trendDate.getFullYear() + '-' + trendDate.getMonth())
  }
  const trendLabels = trendMonthKeys.map((key) => (Number(key.split('-')[1]) + 1) + '月')
  const hoursByMonth = new Map<string, number>(trendMonthKeys.map((key) => [key, 0]))
  for (const item of hoursTxForTrend) {
    const key = item.lesson?.lessonDate
      ? item.lesson.lessonDate.getFullYear() + '-' + item.lesson.lessonDate.getMonth()
      : ''
    if (hoursByMonth.has(key)) hoursByMonth.set(key, (hoursByMonth.get(key) || 0) + (item.hoursDeducted || 0))
  }
  const payByMonth = new Map<string, number>(trendMonthKeys.map((key) => [key, 0]))
  for (const tx of salaryTxForTrend) {
    const key = tx.createdAt.getFullYear() + '-' + tx.createdAt.getMonth()
    if (payByMonth.has(key)) payByMonth.set(key, (payByMonth.get(key) || 0) + tx.amount)
  }
  const salaryTrend = trendMonthKeys.map((key, index) => ({
    label: trendLabels[index],
    hours: Number((hoursByMonth.get(key) || 0).toFixed(1)),
    pay: Math.round(payByMonth.get(key) || 0),
  }))

  return NextResponse.json({ attendanceWeekTrend, salaryTrend })
})
