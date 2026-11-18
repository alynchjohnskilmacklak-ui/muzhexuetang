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

  const students = await prisma.student.findMany({
    where: {
      division,
      status: { in: ['ACTIVE', 'ENROLLED', 'TRIAL'] },
      ...(term ? { termMemberships: { some: { termId: term.id } } } : {}),
    },
    include: {
      _count: { select: { attendances: { where: { deletedAt: null } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  // 本月已发布反馈数（整体）
  const monthFeedbackTotal = await prisma.classroomFeedback.count({
    where: { status: 'PUBLISHED', createdAt: { gte: monthStart } },
  })

  const gradeDist: Record<string, number> = {}
  students.forEach((s) => {
    const key = s.grade?.trim() || '未设置年级'
    gradeDist[key] = (gradeDist[key] || 0) + 1
  })

  const rows = students.map((s) => ({
    id: s.id,
    name: s.name,
    grade: s.grade || '未设置',
    school: s.school || '',
    parentName: s.parentName || '',
    status: s.status,
    attendanceCount: s._count.attendances,
  }))

  const summary = {
    total: students.length,
    junior: students.filter((s) => s.grade && /初|七|八|九/.test(s.grade)).length,
    senior: students.filter((s) => s.grade && /高|十/.test(s.grade)).length,
    monthNew: students.filter((s) => s.createdAt >= monthStart).length,
    monthFeedbackTotal,
    termName: term?.name || null,
  }

  return NextResponse.json({ summary, rows, gradeDist })
})
