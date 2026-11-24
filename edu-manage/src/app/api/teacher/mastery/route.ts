import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { assertTeacherOwnsStudent, requireCurrentTeacher } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

const MASTERY_LEVELS = new Set(['MASTERED', 'NEEDS_REVIEW', 'NEEDS_PRACTICE'])

export const GET = apiHandler(async (request: NextRequest) => {
  const studentId = request.nextUrl.searchParams.get('studentId')?.trim() || ''
  if (!studentId) return NextResponse.json({ error: '缺少学员编号' }, { status: 400 })

  const { teacher, prisma } = await requireCurrentTeacher()
  const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)
  if (!activeTerm) return NextResponse.json({ error: '当前没有已启用的运营批次' }, { status: 409 })

  const student = await assertTeacherOwnsStudent(teacher.id, studentId, prisma, activeTerm.id)
  if (!student) return NextResponse.json({ error: '无权访问该学生' }, { status: 403 })

  const records = await prisma.masteryRecord.findMany({
    where: { studentId, teacherId: teacher.id, termId: activeTerm.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, knowledgePoint: true, level: true, note: true, createdAt: true },
  })
  return NextResponse.json({ records })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => null) as {
    studentId?: unknown
    knowledgePoint?: unknown
    level?: unknown
    note?: unknown
  } | null
  const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : ''
  const knowledgePoint = typeof body?.knowledgePoint === 'string' ? body.knowledgePoint.trim() : ''
  const level = typeof body?.level === 'string' ? body.level : 'NEEDS_REVIEW'
  const note = typeof body?.note === 'string' ? body.note.trim() : ''

  if (!studentId || !knowledgePoint || knowledgePoint.length > 120 || note.length > 1000 || !MASTERY_LEVELS.has(level)) {
    return NextResponse.json({ error: '请检查知识点、掌握等级和备注内容' }, { status: 400 })
  }

  const { teacher, prisma } = await requireCurrentTeacher()
  const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)
  if (!activeTerm) return NextResponse.json({ error: '当前没有已启用的运营批次' }, { status: 409 })

  const student = await assertTeacherOwnsStudent(teacher.id, studentId, prisma, activeTerm.id)
  if (!student) return NextResponse.json({ error: '无权访问该学生' }, { status: 403 })

  const record = await prisma.masteryRecord.create({
    data: {
      studentId,
      teacherId: teacher.id,
      termId: activeTerm.id,
      knowledgePoint,
      level,
      note: note || null,
    },
    select: { id: true, knowledgePoint: true, level: true, note: true, createdAt: true },
  })
  return NextResponse.json({ record }, { status: 201 })
})
