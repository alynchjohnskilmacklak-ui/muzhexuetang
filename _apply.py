# -*- coding: utf-8 -*-
import os
svr = r"D:\01muzhexuetang\muzhexuetang\coding\_svrbase"
out = r"D:\01muzhexuetang\muzhexuetang\coding\_deploy"
os.makedirs(out, exist_ok=True)

def read(p):
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()

def write(p, c):
    with open(p, "w", encoding="utf-8") as f:
        f.write(c)

def nl(c):
    return "\r\n" if "\r\n" in c else "\n"

# ========== 1. parent-dashboard.ts ==========
c = read(os.path.join(svr, "parent-dashboard.ts"))
N = nl(c)
anchor1 = "const parentLatestClassroomFeedback = latestClassroomFeedback\n    ? redactFeedbackForParent(latestClassroomFeedback, studentIds)\n    : null\n"
assert anchor1 in c, "parent anchor1 missing"
block1 = anchor1 + """
  // ===== 课时领先榜（家长端）：我的课时 vs 同班同学 =====
  // 同班同学 = 孩子所有活跃班级（enrollment.group）内的其他学员；
  // 课时口径 = 本月考勤记录 hoursDeducted 累计（与课时记录页一致）。
  const myEnrollments = await prisma.enrollment.findMany({
    where: { studentId: { in: studentIds }, ...parentActiveEnrollmentWhere(userId) },
    select: { studentId: true, groupId: true },
  })
  const relatedGroupIds = [...new Set(myEnrollments.map((item) => item.groupId).filter((id): id is string => Boolean(id)))]
  let classHoursByStudent: Record<string, { mineHours: number; classmates: Array<{ id: string; name: string; hours: number }>; hasData: boolean }> = {}
  if (relatedGroupIds.length > 0) {
    const classmates = await prisma.enrollment.findMany({
      where: { groupId: { in: relatedGroupIds }, status: 'ACTIVE', student: { deletedAt: null } },
      select: { groupId: true, student: { select: { id: true, name: true } } },
    })
    const classmateIds = [...new Set(classmates.map((item) => item.student.id))]
    const hoursRows = classmateIds.length > 0 ? await prisma.attendance.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: classmateIds },
        lesson: { lessonDate: { gte: monthStart, lt: monthEnd } },
        deletedAt: null,
      },
      _sum: { hoursDeducted: true },
    }) : []
    const hoursByStudent = new Map(hoursRows.map((row) => [row.studentId, Number(row._sum.hoursDeducted || 0)]))
    const nameById = new Map(classmates.map((item) => [item.student.id, item.student.name]))
    const studentGroupIds = new Map<string, Set<string>>()
    for (const item of classmates) {
      if (!studentGroupIds.has(item.student.id)) studentGroupIds.set(item.student.id, new Set())
      studentGroupIds.get(item.student.id)?.add(item.groupId)
    }
    classHoursByStudent = Object.fromEntries(studentIds.map((studentId) => {
      const myGroupIds = new Set(myEnrollments.filter((item) => item.studentId === studentId).map((item) => item.groupId))
      const peerIds = [...studentGroupIds.keys()].filter((peerId) => {
        if (peerId === studentId) return false
        const peerGroups = studentGroupIds.get(peerId)
        return !!peerGroups && [...myGroupIds].some((groupId) => peerGroups.has(groupId))
      })
      const mine = hoursByStudent.get(studentId) || 0
      const classmatesData = peerIds.map((peerId) => ({
        id: peerId,
        name: nameById.get(peerId) || '',
        hours: Number((hoursByStudent.get(peerId) || 0).toFixed(1)),
      }))
      return [studentId, {
        mineHours: Number(mine.toFixed(1)),
        classmates: classmatesData,
        hasData: mine > 0 && classmatesData.some((item) => item.hours > 0),
      }]
    }))
  }
""".replace("\n", N)
assert anchor1 in c
c = c.replace(anchor1, block1, 1)
anchor2 = "    studentStats,\n    todayAttendances,"
assert anchor2 in c, "parent anchor2 missing"
c = c.replace(anchor2, "    studentStats,\n    classHoursByStudent,\n    todayAttendances,", 1)
write(os.path.join(out, "parent-dashboard.ts"), c)
print("parent-dashboard.ts done")

# ========== 2. teacher-dashboard.ts ==========
c = read(os.path.join(svr, "teacher-dashboard.ts"))
N = nl(c)
anchor1 = "  const monthlyHours = roundHours(monthLessons.reduce((sum, lesson) => sum + minutesToHours(lesson.group.lessonMinutes), 0))"
assert anchor1 in c, "teacher anchor1 missing"
block1 = anchor1 + """

  // ===== 教师端动态图表：本月各周到课率 + 近 6 个月课时/薪酬趋势 =====
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const [monthAttendanceForTrend, salaryTxForTrend, hoursTxForTrend] = await Promise.all([
    prisma.classLesson.findMany({
      where: { ...lessonWhere, lessonDate: { gte: monthStart } },
      select: { lessonDate: true, attendances: { select: { status: true } } },
    }),
    prisma.teacherSalaryTransaction.findMany({
      where: { teacherId, createdAt: { gte: sixMonthsAgo }, deletedAt: null },
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
    return { label: '第' + (index + 1) + '周', rate: bucket && bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : null }
  }).filter((item): item is { label: string; rate: number } => item.rate !== null)

  const trendMonthKeys: string[] = []
  for (let i = 5; i >= 0; i--) {
    const trendDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    trendMonthKeys.push(trendDate.getFullYear() + '-' + trendDate.getMonth())
  }
  const trendLabels = trendMonthKeys.map((key) => (Number(key.split('-')[1]) + 1) + '月')
  const hoursByMonth = new Map<string, number>(trendMonthKeys.map((key) => [key, 0]))
  for (const item of hoursTxForTrend) {
    const key = item.lesson?.lessonDate ? item.lesson.lessonDate.getFullYear() + '-' + item.lesson.lessonDate.getMonth() : ''
    if (key && hoursByMonth.has(key)) hoursByMonth.set(key, (hoursByMonth.get(key) || 0) + (item.hoursDeducted || 0))
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
""".replace("\n", N)
c = c.replace(anchor1, block1, 1)
anchor2 = "    weeklyRates: {"
assert anchor2 in c, "teacher anchor2 missing"
c = c.replace(anchor2, "    attendanceWeekTrend,\n    salaryTrend,\n    weeklyRates: {", 1)
write(os.path.join(out, "teacher-dashboard.ts"), c)
print("teacher-dashboard.ts done")

# ========== 3. teacher-dashboard-page.tsx ==========
c = read(os.path.join(svr, "teacher-dashboard-page.tsx"))
N = nl(c)
anchor1 = "import { QuickStartGuide, type QuickStartStep } from '@/components/Common/QuickStartGuide'"
assert anchor1 in c, "page anchor1 missing"
c = c.replace(anchor1, anchor1 + "\nimport { TeacherTrendCharts } from '@/components/teacher/TeacherTrendCharts'", 1)
anchor2 = "  monthlyStats: { totalStudents: number; monthlyHours: number }"
assert anchor2 in c, "page anchor2 missing"
c = c.replace(anchor2, anchor2 + "\n  attendanceWeekTrend?: Array<{ label: string; rate: number }>\n  salaryTrend?: Array<{ label: string; hours: number; pay: number }>", 1)
anchor3 = "      </section>\n\n      <Row gutter={[16, 16]}>"
assert anchor3 in c, "page anchor3 missing"
c = c.replace(anchor3, "      </section>\n\n      <TeacherTrendCharts attendanceWeekTrend={data.attendanceWeekTrend} salaryTrend={data.salaryTrend} />\n\n      <Row gutter={[16, 16]}>", 1)
write(os.path.join(out, "teacher-dashboard-page.tsx"), c)
print("teacher-dashboard-page.tsx done")
