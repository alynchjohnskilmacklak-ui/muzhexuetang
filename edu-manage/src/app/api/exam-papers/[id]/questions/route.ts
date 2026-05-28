import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { revalidatePath } from 'next/cache'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const PUT = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const questions = Array.isArray(body.questions) ? body.questions : []

  await prisma.$transaction(async (tx) => {
    await tx.paperQuestion.deleteMany({ where: { paperId: id } })
    if (questions.length) {
      await tx.paperQuestion.createMany({
        data: questions.map((q: Record<string, unknown>, index: number) => ({
          paperId: id,
          order: Number(q.order ?? index + 1),
          topic: String(q.topic || ''),
          mastery: String(q.mastery || 'NEEDS_REVIEW'),
          teacherNote: typeof q.teacherNote === 'string' ? q.teacherNote || null : null,
          pageNum: q.pageNum ? Number(q.pageNum) : null,
        })),
      })
    }
  })

  // Update weakness records from NEEDS_PRACTICE questions
  const practiceQuestions = questions.filter((q: Record<string, unknown>) => q.mastery === 'NEEDS_PRACTICE')
  if (practiceQuestions.length) {
    await prisma.weaknessRecord.deleteMany({ where: { paperId: id } })
    const paper = await prisma.examPaper.findUnique({ where: { id }, select: { studentId: true } })
    if (paper) {
      const topics = new Map<string, number>()
      for (const q of practiceQuestions) {
        const topic = String(q.topic || '')
        topics.set(topic, (topics.get(topic) || 0) + 1)
      }
      await prisma.weaknessRecord.createMany({
        data: Array.from(topics.entries()).map(([topic, count]) => ({
          studentId: paper.studentId,
          paperId: id,
          topic,
          mistakeCount: count,
        })),
      })
    }
  }

  revalidatePath('/grades')
  revalidatePath('/parent/grades')

  return NextResponse.json({ success: true, count: questions.length })
})
