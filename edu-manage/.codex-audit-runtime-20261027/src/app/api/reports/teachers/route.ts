import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, req.nextUrl.searchParams.get('division'))
  const term = await resolveAdminTermScope(prisma, division, req)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const teachers = await prisma.teacher.findMany({
    where: { status: 'ACTIVE', division },
    include: { _count: { select: { students: true } } },
    orderBy: { monthlyHours: 'desc' },
  })

  // 本月反馈数（按教师）
  const monthFeedback = await prisma.classroomFeedback.groupBy({
    by: ['teacherId'],
    where: { createdAt: { gte: monthStart }, status: 'PUBLISHED' },
    _count: { _all: true },
  })
  const feedbackMap = new Map(monthFeedback.map((item) => [item.teacherId, item._count._all]))

  const rows = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    subjects: (t.subjects || '').split(',').filter(Boolean),
    employmentType: t.employmentType,
    monthlyHours: t.monthlyHours,
    studentCount: t._count.students,
    monthFeedback: feedbackMap.get(t.id) || 0,
    rating: t.rating,
  }))

  // 学科课时聚合（按教师主科首学科粗分）
  const subjectHours: Record<string, number> = {}
  rows.forEach((r) => {
    const subject = r.subjects[0] || '未设置'
    subjectHours[subject] = (subjectHours[subject] || 0) + r.monthlyHours
  })

  const summary = {
    total: teachers.length,
    fullTime: teachers.filter((t) => t.employmentType === 'FULL_TIME').length,
    partTime: teachers.filter((t) => t.employmentType !== 'FULL_TIME').length,
    avgRating: teachers.length ? teachers.reduce((s, t) => s + t.rating, 0) / teachers.length : 0,
    totalMonthlyHours: teachers.reduce((s, t) => s + t.monthlyHours, 0),
    termName: term?.name || null,
  }

  return NextResponse.json({ summary, rows, subjectHours })
})
