import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { assertTeacherOwnsStudent, requireCurrentTeacher, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

async function assertOwned(teacherId: string, studentId: string, prisma: Awaited<ReturnType<typeof requireCurrentTeacher>>['prisma']) {
  return assertTeacherOwnsStudent(teacherId, studentId, prisma)
}

export const GET = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const studentId = req.nextUrl.searchParams.get('studentId') || ''
  if (!studentId) return NextResponse.json({ error: '缺少 studentId' }, { status: 400 })
  const student = await assertOwned(teacher.id, studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  const weaknesses = await prisma.weaknessRecord.findMany({
    where: { studentId },
    include: { paper: { select: { id: true, title: true, subject: true } } },
    orderBy: [{ mistakeCount: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({ weaknesses })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await req.json()
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  if (!studentId) return NextResponse.json({ error: '缺少 studentId' }, { status: 400 })
  const student = await assertOwned(teacher.id, studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  const fromPaperId = typeof body.fromPaperId === 'string' ? body.fromPaperId : ''
  if (fromPaperId) {
    const paper = await prisma.examPaper.findFirst({
      where: { id: fromPaperId, studentId },
      include: { questions: { where: { mastery: 'NEEDS_PRACTICE' }, select: { topic: true } } },
    })
    if (!paper) return NextResponse.json({ error: '试卷不存在或不属于该学员' }, { status: 404 })

    const topics = paper.questions
      .map((question) => question.topic?.trim())
      .filter((topic): topic is string => Boolean(topic))
    const topicCounts = topics.reduce<Record<string, number>>((acc, topic) => {
      acc[topic] = (acc[topic] ?? 0) + 1
      return acc
    }, {})

    const records = await prisma.$transaction(async (tx) => {
      const saved = []
      for (const [topic, count] of Object.entries(topicCounts)) {
        const existing = await tx.weaknessRecord.findFirst({ where: { studentId, topic } })
        if (existing) {
          saved.push(await tx.weaknessRecord.update({
            where: { id: existing.id },
            data: {
              mistakeCount: { increment: count },
              paperId: fromPaperId,
              suggestion: existing.suggestion || '建议针对该知识点进行专项练习。',
            },
          }))
        } else {
          saved.push(await tx.weaknessRecord.create({
            data: {
              studentId,
              paperId: fromPaperId,
              topic,
              mistakeCount: count,
              suggestion: '建议针对该知识点进行专项练习。',
            },
          }))
        }
      }
      await tx.activityLog.create({
        data: {
          userId: user.id,
          teacherId: teacher.id,
          action: TEACHER_LOG_ACTIONS.WEAKNESS_SAVE,
          detail: `${student.name} · 从试卷沉淀薄弱点 ${saved.length} 项`,
          entityType: 'ExamPaper',
          entityId: fromPaperId,
          metadata: { studentId, topics: Object.keys(topicCounts) },
        },
      })
      return saved
    })
    return NextResponse.json({ count: records.length, weaknesses: records })
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
  if (!topic) return NextResponse.json({ error: '请填写薄弱点' }, { status: 400 })
  const weakness = await prisma.weaknessRecord.create({
    data: {
      studentId,
      topic,
      mistakeCount: Number.isFinite(Number(body.mistakeCount)) ? Math.max(1, Number(body.mistakeCount)) : 1,
      suggestion: typeof body.suggestion === 'string' ? body.suggestion.trim() || null : null,
    },
  })
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      teacherId: teacher.id,
      action: TEACHER_LOG_ACTIONS.WEAKNESS_SAVE,
      detail: `${student.name} · 新增薄弱点：${topic}`,
      entityType: 'WeaknessRecord',
      entityId: weakness.id,
      metadata: { studentId },
    },
  })
  return NextResponse.json({ weakness }, { status: 201 })
})

export const DELETE = apiHandler(async (req: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const id = req.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: '缺少薄弱点 id' }, { status: 400 })

  const existing = await prisma.weaknessRecord.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '薄弱点不存在' }, { status: 404 })
  const student = await assertOwned(teacher.id, existing.studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  await prisma.weaknessRecord.delete({ where: { id } })
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      teacherId: teacher.id,
      action: TEACHER_LOG_ACTIONS.WEAKNESS_SAVE,
      detail: `${student.name} · 删除薄弱点：${existing.topic}`,
      entityType: 'WeaknessRecord',
      entityId: id,
      metadata: { studentId: existing.studentId, action: 'delete' },
    },
  })
  return NextResponse.json({ success: true })
})
