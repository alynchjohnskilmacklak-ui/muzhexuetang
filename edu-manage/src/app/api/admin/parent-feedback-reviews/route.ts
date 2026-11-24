import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { requireAdminUser } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

const REVIEW_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED'] as const

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminUser()
  try {
    const params = request.nextUrl.searchParams
    const division = getRequestDivision(admin, params.get('division'))
    const evaluationId = params.get('evaluationId') || ''
    const requestedStatus = params.get('status') || 'PENDING'
    const requestedRating = params.get('rating') || 'ALL'
    const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
    const pageSize = 30

    const baseWhere: Prisma.ParentClassroomFeedbackEvaluationWhereInput = {
      feedback: {
        is: {
          status: 'PUBLISHED',
          deletedAt: null,
          teacher: { is: { division } },
        },
      },
    }
    const where: Prisma.ParentClassroomFeedbackEvaluationWhereInput = {
      ...baseWhere,
      ...(evaluationId ? { id: evaluationId } : {}),
      ...(!evaluationId && REVIEW_STATUSES.includes(requestedStatus as typeof REVIEW_STATUSES[number])
        ? { reviewStatus: requestedStatus }
        : {}),
      ...(!evaluationId && requestedRating === 'SATISFIED' ? { satisfied: true }
        : !evaluationId && requestedRating === 'UNSATISFIED' ? { satisfied: false }
          : {}),
    }

    const [total, groupedStatuses, evaluations] = await Promise.all([
      admin.prisma.parentClassroomFeedbackEvaluation.count({ where }),
      admin.prisma.parentClassroomFeedbackEvaluation.groupBy({
        by: ['reviewStatus'],
        where: baseWhere,
        _count: { _all: true },
      }),
      admin.prisma.parentClassroomFeedbackEvaluation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: evaluationId ? 0 : (page - 1) * pageSize,
        take: evaluationId ? 1 : pageSize,
        include: {
          parent: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
          feedback: {
            select: {
              id: true,
              studentIds: true,
              isSingleSession: true,
              sessionDate: true,
              subjectSnapshot: true,
              createdAt: true,
              teacher: { select: { id: true, name: true } },
              classLesson: {
                select: {
                  lessonDate: true,
                  startTime: true,
                  group: { select: { name: true, course: { select: { name: true, subject: true } } } },
                },
              },
            },
          },
        },
      }),
    ])

    const studentIds = [...new Set(evaluations.flatMap((evaluation) => evaluation.feedback.studentIds))]
    const students = studentIds.length
      ? await admin.prisma.student.findMany({
          where: { id: { in: studentIds }, division },
          select: { id: true, name: true },
        })
      : []
    const studentNames = new Map(students.map((student) => [student.id, student.name]))
    const statusCounts = Object.fromEntries(REVIEW_STATUSES.map((status) => [status, 0])) as Record<typeof REVIEW_STATUSES[number], number>
    for (const entry of groupedStatuses) {
      if (entry.reviewStatus in statusCounts) statusCounts[entry.reviewStatus as typeof REVIEW_STATUSES[number]] = entry._count._all
    }

    return NextResponse.json({
      items: evaluations.map((evaluation) => {
        const feedback = evaluation.feedback
        const classLesson = feedback.classLesson
        return {
          id: evaluation.id,
          feedbackId: feedback.id,
          satisfied: evaluation.satisfied,
          reason: evaluation.reason,
          createdAt: evaluation.createdAt.toISOString(),
          reviewStatus: evaluation.reviewStatus,
          reviewNote: evaluation.reviewNote,
          reviewedAt: evaluation.reviewedAt?.toISOString() || null,
          reviewedBy: evaluation.reviewedBy,
          parent: evaluation.parent,
          teacher: feedback.teacher,
          studentNames: feedback.studentIds.map((id) => studentNames.get(id)).filter((name): name is string => Boolean(name)),
          courseName: classLesson?.group?.course?.name || (feedback.isSingleSession ? '单次课程' : null),
          className: classLesson?.group?.name || null,
          subject: classLesson?.group?.course?.subject || feedback.subjectSnapshot || '课堂',
          lessonDate: (classLesson?.lessonDate || feedback.sessionDate || feedback.createdAt).toISOString(),
          lessonStartTime: classLesson?.startTime || null,
        }
      }),
      total,
      page,
      pageSize,
      statusCounts,
    })
  } catch (error) {
    console.error('[admin:parent-feedback-reviews:GET]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '家长评价暂时无法加载，请稍后重试' }, { status: 500 })
  }
})
