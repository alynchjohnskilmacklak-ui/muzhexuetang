import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { requireSingleSessionActor } from '@/lib/classroom-feedback/single-session-actor'
import { triggerFeedbackBonus } from '@/lib/teacher-salary'
import { apiHandler } from '@/lib/api-handler'
import type { Prisma } from '@prisma/client'
import {
  filterStudentRatingsForStudents,
  hasRequiredLessonContent,
  hasMeaningfulFeedbackContent,
  feedbackStudentLimitError,
  normalizeLessonContent,
  parseFeedbackCourseType,
  resolveTeacherFeedbackCreationScope,
} from '@/lib/classroom-feedback/access'
import { createClassroomFeedbackWithSideEffects } from '@/lib/classroom-feedback/create'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { createFeedbackOnce, hashFeedbackPayload, parseFeedbackClientRequestId } from '@/lib/classroom-feedback/idempotency'
import { getMissingStudentRatingTagCategories } from '@/lib/classroom-feedback/student-feedback-tags'
import { localDateKey, todayLocal } from '@/lib/date/local-day'
import { getTeacherFeedbackSubjects } from '@/lib/classroom-feedback/teacher-subjects'
import { MANUAL_SINGLE_SESSION_STUDENT_ID, resolveStandaloneFeedbackStudents, resolveStandaloneFeedbackTeacher } from '@/lib/classroom-feedback/single-session-scope'

export const dynamic = 'force-dynamic'

function asStringArray(value: unknown, limit = 100) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, limit) : []
}

function singleSessionSchemaMismatch(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown }
  const message = typeof candidate?.message === 'string' ? candidate.message : ''
  if (/Unknown argument [`'\"]?(?:studentNameSnapshot|studentGradeSnapshot)/i.test(message)) {
    return {
      kind: 'client',
      message: '当前应用容器使用的 Prisma Client 版本较旧。请从最新代码重新构建并重启应用容器，再保存草稿；当前页面内容仍保留。',
    }
  }
  if (candidate?.code === 'P2022' && /studentNameSnapshot|studentGradeSnapshot/i.test(message)) {
    return {
      kind: 'database',
      message: '单次反馈所需的数据结构尚未同步。请先更新本地数据库结构，再重新保存；当前页面内容仍保留。',
    }
  }
  return null
}

export const GET = apiHandler(async (req: NextRequest) => {
    const { teacher, prisma } = await requireCurrentTeacher()
    const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 10)))
    const feedbacks = await prisma.classroomFeedback.findMany({
      where: { teacherId: teacher.id, isSingleSession: false, deletedAt: null },
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
    const body = await req.json() as Record<string, unknown>
    const isSingleSession = body.isSingleSession === true
    const currentActor = isSingleSession ? null : await requireCurrentTeacher()
    const standaloneActor = isSingleSession
      ? await requireSingleSessionActor(typeof body.singleSessionTeacherId === 'string' ? body.singleSessionTeacherId : null)
      : null
    const user = standaloneActor?.user || currentActor!.user
    const prisma = standaloneActor?.prisma || currentActor!.prisma
    const teacher = standaloneActor?.selectedTeacher || currentActor?.teacher
    if (!teacher) return NextResponse.json({ error: '请选择本学部内的授课老师' }, { status: 403 })
    const clientRequestId = parseFeedbackClientRequestId(body?.clientRequestId)
    if (clientRequestId === false) return NextResponse.json({ error: '提交请求编号无效，请刷新页面后重试' }, { status: 400 })
    if (!clientRequestId) return NextResponse.json({ error: '提交请求编号缺失，请刷新页面后重试' }, { status: 400 })
    const classLessonId = typeof body.classLessonId === 'string' && body.classLessonId ? body.classLessonId : null
    const additionalLessonIds = asStringArray(body.additionalLessonIds, 10)
    const isManualSingleSession = isSingleSession && body.singleSessionManual === true
    const manualStudentName = isManualSingleSession && typeof body.singleSessionStudentName === 'string'
      ? body.singleSessionStudentName.trim().slice(0, 60)
      : ''
    const manualStudentGrade = isManualSingleSession && typeof body.singleSessionGrade === 'string'
      ? body.singleSessionGrade.trim()
      : ''
    const subjectSnapshot = isSingleSession && typeof body.subject === 'string' ? body.subject.trim().slice(0, 40) : null
    const requestedFeedbackTeacherId = isSingleSession && typeof body.singleSessionTeacherId === 'string' && body.singleSessionTeacherId.trim()
      ? body.singleSessionTeacherId.trim()
      : teacher.id
    const feedbackTeacher = isSingleSession
      ? await resolveStandaloneFeedbackTeacher(prisma, teacher, requestedFeedbackTeacherId)
      : teacher
    if (isSingleSession && !feedbackTeacher) {
      return NextResponse.json({ error: '所选授课老师不存在或不属于当前学部' }, { status: 403 })
    }
    let sessionDate: Date | null = null
    if (isSingleSession) {
      const dateValue = typeof body.sessionDate === 'string' ? body.sessionDate.trim() : ''
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? new Date(`${dateValue}T12:00:00+08:00`) : null
      if (!parsedDate || Number.isNaN(parsedDate.getTime()) || localDateKey(parsedDate) !== dateValue) {
        return NextResponse.json({ error: '请选择有效的上课日期' }, { status: 400 })
      }
      if (dateValue > todayLocal()) {
        return NextResponse.json({ error: '单次反馈日期不能晚于今天' }, { status: 400 })
      }
      sessionDate = parsedDate
    }
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
    const targetType = isSingleSession || body.targetType === 'STUDENT' ? 'STUDENT' : 'CLASS'
    const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
    if (isSingleSession && status === 'PUBLISHED') {
      return NextResponse.json({ error: '单次课程反馈仅保存为分享图素材，不直接发布给家长' }, { status: 400 })
    }
    const lessonContent = normalizeLessonContent(body.lessonContent)
    const knowledgePoints = asStringArray(body.knowledgePoints, 10)
    const knowledgeCard = parseStoredKnowledgeCard(body.knowledgeCard)
    const imageUrls = asStringArray(body.imageUrls, 9)
    const studentIds = asStringArray(body.studentIds)
    const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 500) : ''
    const homework = Array.isArray(body.homework) ? body.homework : []
    const imageTypes = body.imageTypes && typeof body.imageTypes === 'object' ? body.imageTypes : {}
    const studentRatings = body.studentRatings && typeof body.studentRatings === 'object' ? body.studentRatings : {}
    
    // New fields: validate at the API boundary so Prisma receives only the
    // string values represented by the ClassroomFeedback schema.
    const mood = typeof body.mood === 'string' ? body.mood.trim().slice(0, 40) : null
    const tags = asStringArray(body.tags, 50)
    const badge = typeof body.badge === 'string' ? body.badge.trim().slice(0, 80) : null
    const overallComment = typeof body.overallComment === 'string' ? body.overallComment.trim().slice(0, 1400) : ''

    if (status === 'PUBLISHED' && !hasRequiredLessonContent(lessonContent)) {
      return NextResponse.json({ error: '请填写课堂反馈内容（至少10个字）' }, { status: 400 })
    }

    if (!hasMeaningfulFeedbackContent({ lessonContent, overallComment, summary, knowledgePoints, homework, studentRatings, badge, tags })) {
      return NextResponse.json({ error: '反馈内容不能为空' }, { status: 400 })
    }

    if (isManualSingleSession && (!manualStudentName || !['初一', '初二', '初三', '高一', '高二', '高三'].includes(manualStudentGrade))) {
      return NextResponse.json({ error: '请填写学员姓名并选择年级' }, { status: 400 })
    }
    if (isManualSingleSession && (classLessonId || feedbackGroupId || studentIds.length !== 1 || studentIds[0] !== MANUAL_SINGLE_SESSION_STUDENT_ID)) {
      return NextResponse.json({ error: '手动姓名反馈不能关联班级课次或学员档案，请重新选择单次课程反馈' }, { status: 400 })
    }
    if (isSingleSession && !isManualSingleSession && (classLessonId || feedbackGroupId)) {
      return NextResponse.json({ error: '单次课程反馈不能关联班级或课堂课次' }, { status: 400 })
    }

    const standaloneSubjectAllowed = isSingleSession
      ? Boolean(subjectSnapshot && feedbackTeacher && (await getTeacherFeedbackSubjects(prisma, feedbackTeacher)).includes(subjectSnapshot))
      : true
    if (isSingleSession && !standaloneSubjectAllowed) {
      return NextResponse.json({ error: '当前教师没有该学科的单次反馈权限，请重新选择学科' }, { status: 403 })
    }

    const standaloneStudents = isSingleSession && !isManualSingleSession
      ? await resolveStandaloneFeedbackStudents(prisma, teacher, studentIds)
      : null
    if (isSingleSession && !isManualSingleSession && !standaloneStudents) {
      return NextResponse.json({ error: '请选择本学部中已绑定家长账号的学员，或改用手动填写姓名' }, { status: 403 })
    }

    const scope = isSingleSession ? null : await resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: teacher.id,
      classLessonId,
      feedbackGroupId,
      requestedStudentIds: studentIds,
      expandClassTarget: targetType === 'CLASS',
      isSingleSession,
      requireLesson: !isSingleSession && status === 'PUBLISHED',
      requireAttendanceSubmitted: !isSingleSession && status === 'PUBLISHED',
      submittedCourseType: feedbackCourseTypeInput,
      requestedSubject: typeof body.subject === 'string' ? body.subject : null,
    })
    if (!isSingleSession && scope && !scope.allowed) {
      if (scope.reason === 'blocked') {
        return NextResponse.json({ error: '该学员本节课已请假或未到校，不能提交课堂反馈' }, { status: 409 })
      }
      if (scope.reason === 'lesson-required') {
        return NextResponse.json({ error: '发布课堂反馈前，请先选择具体课次并完成考勤' }, { status: 409 })
      }
      if (scope.reason === 'attendance-required') {
        return NextResponse.json({ error: '本节课考勤尚未提交，完成考勤后才能发布反馈' }, { status: 409 })
      }
      const message = scope.reason === 'group'
        ? '班级不存在或无权限'
        : scope.reason === 'lesson'
          ? '课次不存在或无权限'
          : '包含无权操作的学员'
      return NextResponse.json({ error: message }, { status: 403 })
    }
    const students = isManualSingleSession ? [] : (isSingleSession ? (standaloneStudents || []) : (scope?.students || []))
    if (!students.length && !isManualSingleSession) return NextResponse.json({ error: '请选择学员或关联一个有学员的课次' }, { status: 400 })
    const studentLimitError = feedbackStudentLimitError('teacher', students.length)
    if (studentLimitError) return NextResponse.json({ error: studentLimitError }, { status: 400 })
    feedbackGroupId = isSingleSession ? null : (scope?.feedbackGroupId || null)
    feedbackCourseType = isManualSingleSession ? 'ONE_ON_ONE' : (scope?.feedbackCourseType || feedbackCourseType)
    const ratingStudentIds = isManualSingleSession ? [MANUAL_SINGLE_SESSION_STUDENT_ID] : students.map((student) => student.id)
    const resolvedStudentRatings = filterStudentRatingsForStudents(studentRatings, ratingStudentIds)
    if (status === 'PUBLISHED') {
      const tagIssues = getMissingStudentRatingTagCategories(resolvedStudentRatings, ratingStudentIds)
      if (tagIssues.length) {
        const firstIssue = tagIssues[0]
        const studentName = isManualSingleSession ? manualStudentName : students.find((student) => student.id === firstIssue.studentId)?.name || '该学员'
        return NextResponse.json({ error: `${studentName}还需选择：${firstIssue.missing.join('、')}，每组至少选择 1 项${tagIssues.length > 1 ? `；另有 ${tagIssues.length - 1} 名学员未完成` : ''}` }, { status: 400 })
      }
    }

    let persistenceSchemaError = ''
    const feedbackResult = await prisma.$transaction(async (tx) => createFeedbackOnce(tx, {
      clientRequestId,
      actorUserId: user.id,
      payloadHash: hashFeedbackPayload({ ...body, clientRequestId: undefined, resolvedStudentIds: isManualSingleSession ? [MANUAL_SINGLE_SESSION_STUDENT_ID, manualStudentName] : students.map((student) => student.id) }),
    }, () => createClassroomFeedbackWithSideEffects(tx, {
        data: {
          termId: scope?.termId || null,
          teacherId: feedbackTeacher?.id || teacher.id,
          classLessonId: isSingleSession ? null : classLessonId,
          isSingleSession,
          subjectSnapshot,
          studentNameSnapshot: isManualSingleSession ? manualStudentName : null,
          studentGradeSnapshot: isManualSingleSession ? manualStudentGrade : null,
          sessionDate,
          feedbackGroupId,
          feedbackCourseType,
          targetType,
          source: 'teacher',
          studentIds: isManualSingleSession ? [] : students.map((student) => student.id),
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
        teacherName: feedbackTeacher?.name || teacher.name,
        students,
        knowledgePoints,
        imageUrls,
        status,
        source: 'teacher',
        detailFallback: '课堂反馈',
        notificationContent: summary || knowledgePoints.join('、') || '课堂资料已更新',
        metadata: { targetType },
        additionalLessonIds: isSingleSession ? undefined : additionalLessonIds,
    }))).catch((error: unknown) => {
      const mismatch = singleSessionSchemaMismatch(error)
      if (!isSingleSession || !mismatch) throw error
      persistenceSchemaError = mismatch.message
      console.error('[teacher-feedback] single-session Prisma schema mismatch', { kind: mismatch.kind })
      return null
    })
    if (!feedbackResult) {
      return NextResponse.json({ error: persistenceSchemaError || '单次反馈服务暂不可用，请重试。' }, { status: 503 })
    }
    if (!feedbackResult.ok) {
      const message = feedbackResult.conflict === 'PAYLOAD_CHANGED'
        ? '这次提交内容与已处理的请求不同，请检查反馈记录后重新提交'
        : feedbackResult.conflict === 'RESULT_MISSING'
          ? '提交仍在处理中，请稍后刷新反馈列表'
          : '提交编号已被使用，请刷新页面后重试'
      return NextResponse.json({ error: message }, { status: 409 })
    }
    const feedback = feedbackResult.feedback

    const bonus = status === 'PUBLISHED' && !isSingleSession && !feedbackResult.replayed
      ? await triggerFeedbackBonus(feedback.id)
      : null

    revalidatePath('/teacher/dashboard')
    revalidatePath('/parent/grades')
    return NextResponse.json({ feedback, bonus, replayed: feedbackResult.replayed }, { status: feedbackResult.replayed ? 200 : 201 })
})
