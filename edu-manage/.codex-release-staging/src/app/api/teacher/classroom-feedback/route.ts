import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { triggerFeedbackBonus } from '@/lib/teacher-salary'
import { apiHandler } from '@/lib/api-handler'
import type { Prisma } from '@prisma/client'
import {
  filterStudentRatingsForStudents,
  hasRequiredLessonContent,
  hasMeaningfulFeedbackContent,
  normalizeLessonContent,
  parseFeedbackCourseType,
  resolveTeacherFeedbackCreationScope,
} from '@/lib/classroom-feedback/access'
import { createClassroomFeedbackWithSideEffects } from '@/lib/classroom-feedback/create'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'

export const dynamic = 'force-dynamic'

function asStringArray(value: unknown, limit = 100) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit) : []
}

export const GET = apiHandler(async (req: NextRequest) => {
    const { teacher, prisma } = await requireCurrentTeacher()
    const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 10)))
    const feedbacks = await prisma.classroomFeedback.findMany({
      where: { teacherId: teacher.id },
      include: {
        classLesson: { include: { group: { include: { course: true } } } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ feedbacks })
})

export const POST = apiHandler(async (req: NextRequest) => {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const body = await req.json()
    const classLessonId = typeof body.classLessonId === 'string' && body.classLessonId ? body.classLessonId : null
    let feedbackGroupId = typeof body.feedbackGroupId === 'string' && body.feedbackGroupId
      ? body.feedbackGroupId
      : typeof body.groupId === 'string' && body.groupId
        ? body.groupId
        : null
    const feedbackCourseTypeInput = parseFeedbackCourseType(body.feedbackCourseType)
    if (!feedbackCourseTypeInput) {
      return NextResponse.json({ error: '反馈课程类型不合法' }, { status: 400 })
    }
    let feedbackCourseType = feedbackCourseTypeInput
    const targetType = body.targetType === 'STUDENT' ? 'STUDENT' : 'CLASS'
    const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
    const lessonContent = normalizeLessonContent(body.lessonContent)
    const knowledgePoints = asStringArray(body.knowledgePoints, 10)
    const knowledgeCard = parseStoredKnowledgeCard(body.knowledgeCard)
    const imageUrls = asStringArray(body.imageUrls, 9)
    const studentIds = asStringArray(body.studentIds)
    const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 500) : ''
    const homework = Array.isArray(body.homework) ? body.homework : []
    const imageTypes = body.imageTypes && typeof body.imageTypes === 'object' ? body.imageTypes : {}
    const studentRatings = body.studentRatings && typeof body.studentRatings === 'object' ? body.studentRatings : {}
    
    // New fields
    const { mood, tags, badge, overallComment } = body

    if (status === 'PUBLISHED' && !hasRequiredLessonContent(lessonContent)) {
      return NextResponse.json({ error: '请填写课堂反馈内容（至少10个字）' }, { status: 400 })
    }

    if (!hasMeaningfulFeedbackContent({ lessonContent, overallComment, summary, knowledgePoints, homework, studentRatings, badge, tags })) {
      return NextResponse.json({ error: '反馈内容不能为空' }, { status: 400 })
    }

    const scope = await resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: teacher.id,
      classLessonId,
      feedbackGroupId,
      requestedStudentIds: studentIds,
      expandClassTarget: targetType === 'CLASS',
      submittedCourseType: feedbackCourseTypeInput,
      requestedSubject: typeof body.subject === 'string' ? body.subject : null,
    })
    if (!scope.allowed) {
      const message = scope.reason === 'group'
        ? '班级不存在或无权限'
        : scope.reason === 'lesson'
          ? '课次不存在或无权限'
          : '包含无权操作的学员'
      return NextResponse.json({ error: message }, { status: 403 })
    }
    const students = scope.students
    if (!students.length) return NextResponse.json({ error: '请选择学员或关联一个有学员的课次' }, { status: 400 })
    if (students.length > 3) return NextResponse.json({ error: '一次最多反馈3名学生' }, { status: 400 })
    feedbackGroupId = scope.feedbackGroupId
    feedbackCourseType = scope.feedbackCourseType
    const resolvedStudentRatings = filterStudentRatingsForStudents(studentRatings, students.map((student) => student.id))

    const feedback = await prisma.$transaction(async (tx) => {
      return createClassroomFeedbackWithSideEffects(tx, {
        data: {
          termId: scope.termId,
          teacherId: teacher.id,
          classLessonId,
          feedbackGroupId,
          feedbackCourseType,
          targetType,
          source: 'teacher',
          studentIds: students.map((student) => student.id),
          lessonContent: lessonContent || null,
          knowledgePoints,
          knowledgeCard: knowledgeCard as Prisma.InputJsonValue || undefined,
          summary: summary || null,
          mood: mood || null,
          tags: Array.isArray(tags) ? tags : [],
          badge: badge || null,
          overallComment: typeof overallComment === 'string' ? overallComment.trim().slice(0, 1400) || null : null,
          homework,
          imageUrls,
          imageTypes,
          studentRatings: resolvedStudentRatings as Prisma.InputJsonValue,
          status,
          notifySent: status === 'PUBLISHED',
        },
        actorUserId: user.id,
        teacherName: teacher.name,
        students,
        knowledgePoints,
        imageUrls,
        status,
        source: 'teacher',
        detailFallback: '课堂反馈',
        notificationContent: summary || knowledgePoints.join('、') || '课堂资料已更新',
        metadata: { targetType },
      })
    })

    const bonus = status === 'PUBLISHED'
      ? await triggerFeedbackBonus(feedback.id)
      : null

    revalidatePath('/teacher/dashboard')
    revalidatePath('/parent/grades')
    return NextResponse.json({ feedback, bonus }, { status: 201 })
})
