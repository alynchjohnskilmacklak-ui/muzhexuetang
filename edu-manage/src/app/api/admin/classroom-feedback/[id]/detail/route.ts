import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser, AuthError } from '@/lib/auth/guards'
import {
  FeedbackArchiveAccessError,
  getFeedbackArchiveDetail,
} from '@/lib/classroom-feedback/archive'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const actor = await requireAdminUser()
    const { id } = await params
    const detail = await getFeedbackArchiveDetail(actor.prisma, actor, id)
    const studentIds = detail.students.map((student) => student.id)
    const [parentEvaluations, practiceReplies] = await Promise.all([
      actor.prisma.parentClassroomFeedbackEvaluation.findMany({
      where: { feedbackId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        satisfied: true,
        reason: true,
        reviewStatus: true,
        reviewNote: true,
        createdAt: true,
        reviewedAt: true,
        parent: { select: { name: true } },
        reviewedBy: { select: { name: true } },
      },
      }),
      studentIds.length ? actor.prisma.classroomFeedbackPracticeReply.findMany({
        where: { feedbackId: id, studentId: { in: studentIds } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, studentId: true, content: true, imageUrls: true, createdAt: true },
      }) : Promise.resolve([]),
    ])
    const repliesByStudent = new Map<string, typeof practiceReplies>()
    for (const reply of practiceReplies) {
      const replies = repliesByStudent.get(reply.studentId) || []
      replies.push(reply)
      repliesByStudent.set(reply.studentId, replies)
    }
    return NextResponse.json({
      ...detail,
      students: detail.students.map((student) => ({
        ...student,
        practiceReplies: (repliesByStudent.get(student.id) || []).map((reply) => ({
          ...reply,
          createdAt: reply.createdAt.toISOString(),
        })),
      })),
      parentEvaluations,
    })
  } catch (error) {
    if (error instanceof AuthError || error instanceof FeedbackArchiveAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
})
