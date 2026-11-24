import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireRole } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { getStudentProfile } from '@/lib/student-profile'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await requireRole(['admin'])
  const prisma = await getRequestPrisma()
  const studentId = req.nextUrl.searchParams.get('studentId') || ''
  if (!studentId) return NextResponse.json({ error: '缺少 studentId' }, { status: 400 })

  const student = await prisma.student.findFirst({
    where: { id: studentId, division: user.division, deletedAt: null },
    select: {
      id: true, identityId: true, division: true, name: true, grade: true, school: true, gender: true, status: true,
      parentName: true,
      mainTeacher: { select: { id: true, name: true, subjects: true } },
      enrollments: {
        where: { status: 'ACTIVE', deletedAt: null },
        select: { group: { select: { name: true, course: { select: { name: true, subject: true } } } } },
      },
    },
  })
  if (!student) return NextResponse.json({ error: '学员不存在或无权查看' }, { status: 404 })

  // A student may have a separate term record for each batch. Aggregate only
  // records explicitly linked to this identity and keep the admin's division
  // boundary intact.
  const identityRecords = await prisma.student.findMany({
    where: { identityId: student.identityId, division: student.division, deletedAt: null },
    select: { id: true },
  })
  const recordIds = [...new Set([studentId, ...identityRecords.map((record) => record.id)])]

  const startDateParam = req.nextUrl.searchParams.get('startDate') || req.nextUrl.searchParams.get('from')
  const endDateParam = req.nextUrl.searchParams.get('endDate') || req.nextUrl.searchParams.get('to')

  let from: Date
  let to: Date
  let months: number

  if (startDateParam && endDateParam) {
    from = new Date(`${startDateParam.slice(0, 10)}T00:00:00.000`)
    to = new Date(`${endDateParam.slice(0, 10)}T23:59:59.999`)
    months = Math.max(1, Math.round((to.getTime() - from.getTime()) / (30 * 24 * 3600 * 1000)))
  } else {
    const monthsParam = Number(req.nextUrl.searchParams.get('months'))
    months = Number.isFinite(monthsParam) ? Math.min(24, Math.max(1, Math.round(monthsParam))) : 6
    to = new Date()
    from = new Date(to)
    from.setMonth(from.getMonth() - months)
  }

  const [profile, summaries] = await Promise.all([
    getStudentProfile(prisma, studentId, { from, to }, recordIds, {
      includeReport: true,
      includeImages: false,
    }),
    prisma.stageSummary.findMany({
      where: { studentId: { in: recordIds }, status: 'PUBLISHED', periodEnd: { gte: from, lte: to } },
      orderBy: { periodEnd: 'desc' },
      select: {
        id: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        summary: true,
        suggestions: true,
        publishedAt: true,
        updatedAt: true,
        teacher: { select: { name: true } },
      },
    }),
  ])

  if (!profile) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

  const reportStudent = {
    id: student.id,
    name: student.name,
    grade: student.grade,
    school: student.school,
    gender: student.gender,
    status: student.status,
    parentName: student.parentName,
    mainTeacher: student.mainTeacher,
    enrollments: student.enrollments,
  }
  return NextResponse.json({ student: reportStudent, profile, summaries, recordIds, range: { from, to, months } })
})
