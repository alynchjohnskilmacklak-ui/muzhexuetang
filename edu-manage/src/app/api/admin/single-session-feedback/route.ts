import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/teacher-portal'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const admin = await requireAdminUser()
  const { prisma } = admin
  const params = req.nextUrl.searchParams
  const query = (params.get('q') || '').trim().slice(0, 60)
  const date = (params.get('date') || '').trim()
  const page = Math.max(1, Number(params.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 50)))
  const where: Record<string, unknown> = {
    isSingleSession: true,
    deletedAt: null,
    teacher: { division: getRequestDivision(admin, params.get('division')) },
  }

  if (date) {
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invalid date')
      const { start, end } = getLocalDayRange(date)
      if (localDateKey(start) !== date) throw new Error('invalid date')
      where.sessionDate = { gte: start, lt: end }
    } catch {
      return NextResponse.json({ error: '日期格式不正确' }, { status: 400 })
    }
  }
  if (query) {
    where.OR = [
      { studentNameSnapshot: { contains: query } },
      { subjectSnapshot: { contains: query } },
      { teacher: { name: { contains: query } } },
    ]
  }

  const [total, rows] = await Promise.all([
    prisma.classroomFeedback.count({ where: where as never }),
    prisma.classroomFeedback.findMany({
      where: where as never,
      include: {
        teacher: { select: { id: true, name: true, avatar: true, tierLevel: true } },
        classLesson: { select: { id: true, lessonDate: true, startTime: true, endTime: true } },
      },
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const studentIds = [...new Set(rows.flatMap((row) => row.studentIds))]
  const students = studentIds.length
    ? await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, grade: true } })
    : []
  const studentById = new Map(students.map((student) => [student.id, student]))
  const feedbacks = rows.map((row) => {
    const firstStudent = row.studentIds.map((id) => studentById.get(id)).find(Boolean)
    return {
      ...row,
      studentName: row.studentNameSnapshot || firstStudent?.name || '未记录姓名',
      studentGrade: row.studentGradeSnapshot || firstStudent?.grade || null,
      subject: row.subjectSnapshot || '未填写学科',
    }
  })

  return NextResponse.json({ feedbacks, total, page, limit })
})
