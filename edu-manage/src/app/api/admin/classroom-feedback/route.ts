import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { requireAdminUser } from '@/lib/teacher-portal'
import { triggerFeedbackBonus } from '@/lib/teacher-salary'
import { divisionWhere, getRequestDivision } from '@/lib/division'
import { normalizeLessonContent } from '@/lib/classroom-feedback/access'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

import { apiHandler } from '@/lib/api-handler'
import { createNotification } from '@/lib/notifications'
import { getLocalDayRange, localDateKey, todayLocal } from '@/lib/date/local-day'
import { hasAttendingStudent, hasSubmittedLessonAttendance } from '@/lib/attendance-submission'
import { annotateConsecutiveLessons } from '@/lib/classroom-feedback/feedback-session-grouping'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  try {
    const admin = await requireAdminUser()
    const { prisma } = admin
    const sp = req.nextUrl.searchParams
    const teacherId = sp.get('teacherId') || undefined
    const date = sp.get('date') || todayLocal()
    const all = sp.get('all') === '1'
    const division = getRequestDivision(admin, sp.get('division'))
    const selectedTerm = await resolveAdminTermScope(prisma, division, req)
    const termGroupIds = selectedTerm ? (await prisma.classGroup.findMany({
      where: { termId: selectedTerm.id },
      select: { id: true },
    })).map((group) => group.id) : []
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit') || 100)))

    let dayStart: Date
    let dayEnd: Date
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invalid date')
      const range = getLocalDayRange(date)
      if (localDateKey(range.start) !== date) throw new Error('invalid date')
      dayStart = range.start
      dayEnd = range.end
    } catch {
      return NextResponse.json({ error: '日期格式不正确' }, { status: 400 })
    }

    const feedbacks = await prisma.classroomFeedback.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
        isSingleSession: false,
        deletedAt: null,
        AND: [
          {
            OR: selectedTerm ? [
              { termId: selectedTerm.id },
              { classLesson: { group: { termId: selectedTerm.id } } },
              { feedbackGroupId: { in: termGroupIds } },
            ] : [
              { id: '__NO_SELECTED_TERM__' },
            ],
          },
          ...(!all ? [{
            OR: [
              { createdAt: { gte: dayStart, lt: dayEnd } },
              { classLesson: { is: { lessonDate: { gte: dayStart, lt: dayEnd }, deletedAt: null } } },
            ],
          }] : []),
        ],
      },
      include: {
        teacher: { select: { id: true, name: true, tierLevel: true, subjects: true, avatar: true } },
        classLesson: {
          include: {
            group: { include: { course: { select: { name: true, subject: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const allLessons = await prisma.classLesson.findMany({
      where: {
        lessonDate: { gte: dayStart, lt: dayEnd },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        deletedAt: null,
        ...divisionWhere(division),
        group: { termId: selectedTerm?.id || '__NO_SELECTED_TERM__' },
      },
      include: {
        teacher: { select: { id: true, name: true, tierLevel: true, subjects: true, avatar: true } },
        group: {
          include: {
            course: { select: { name: true, subject: true } },
            enrollments: {
              where: { status: 'ACTIVE', deletedAt: null },
              include: { student: { select: { id: true, name: true, grade: true } } },
            },
          },
        },
        classroomFeedbacks: {
          where: { deletedAt: null, isSingleSession: false },
          select: { id: true, status: true },
        },
        attendances: {
          where: { deletedAt: null },
          select: { studentId: true, status: true },
        },
        lessonStudents: { select: { studentId: true } },
      },
    })

    const allStudentIds = [...new Set(feedbacks.flatMap((feedback) => feedback.studentIds))]
    const feedbackGroupIds = [...new Set(feedbacks.map((feedback) => feedback.feedbackGroupId).filter((id): id is string => Boolean(id)))]
    const students = allStudentIds.length
      ? await prisma.student.findMany({
          where: { id: { in: allStudentIds } },
          select: { id: true, name: true, grade: true },
        })
      : []
    const feedbackGroups = feedbackGroupIds.length
      ? await prisma.classGroup.findMany({
          where: { id: { in: feedbackGroupIds } },
          select: { id: true, name: true, course: { select: { name: true, subject: true } } },
        })
      : []
    const studentMap = new Map(students.map((student) => [student.id, student]))
    const feedbackGroupMap = new Map(feedbackGroups.map((group) => [group.id, group]))

    const feedbackEligibleLessons = allLessons.filter((lesson) => {
      const expectedStudentIds = lesson.lessonStudents.length
        ? lesson.lessonStudents.map((student) => student.studentId)
        : lesson.group.enrollments.map((enrollment) => enrollment.student.id)
      const expectedIds = new Set(expectedStudentIds)
      const lessonAttendances = lesson.attendances.filter((attendance) => expectedIds.has(attendance.studentId))
      return hasSubmittedLessonAttendance({
        attendanceSubmittedAt: lesson.attendanceSubmittedAt,
        status: lesson.status,
        attendances: lessonAttendances,
        expectedStudentIds,
      }) && hasAttendingStudent(lessonAttendances)
    })
    const feedbackEligibleLessonIds = new Set(feedbackEligibleLessons.map((lesson) => lesson.id))

    // 识别连堂排课（严格同班同师同科，最多2节连堂）
    const consecutiveMap = annotateConsecutiveLessons(allLessons.map((l) => ({
      id: l.id,
      groupId: l.groupId,
      lessonDate: l.lessonDate,
      startTime: l.startTime,
      endTime: l.endTime,
      teacherId: l.teacherId,
      subject: l.subject || l.group?.course?.subject || null,
    })))

    // 查询过去3天内已提交考勤但尚未发布随堂反馈的课次（超时督办）
    const overdueCutoffStart = new Date(dayStart.getTime() - 3 * 24 * 60 * 60 * 1000)
    const overdueRaw = await prisma.classLesson.findMany({
      where: {
        lessonDate: { gte: overdueCutoffStart, lt: dayStart },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        attendanceSubmittedAt: { not: null },
        deletedAt: null,
        ...divisionWhere(division),
        group: { termId: selectedTerm?.id || '__NO_SELECTED_TERM__' },
        classroomFeedbacks: {
          none: {
            status: 'PUBLISHED',
            deletedAt: null,
          },
        },
      },
      include: {
        teacher: { select: { id: true, name: true, avatar: true } },
        group: {
          include: {
            course: { select: { name: true, subject: true } },
          },
        },
      },
      orderBy: { lessonDate: 'desc' },
      take: 40,
    })

    const overdueLessons = overdueRaw.map((lesson) => ({
      id: lesson.id,
      teacherId: lesson.teacherId,
      teacherName: lesson.teacher?.name || '未知教师',
      groupName: lesson.group.name,
      courseName: lesson.group.course.name,
      subject: lesson.group.course.subject,
      lessonDate: lesson.lessonDate.toISOString(),
      time: `${lesson.startTime}-${lesson.endTime}`,
    }))

    return NextResponse.json({
      date,
      term: selectedTerm,
      overdueLessons,
      feedbacks: feedbacks.map((feedback) => {
        const isConsecutiveSession = feedback.classLessonId
          ? consecutiveMap.has(feedback.classLessonId)
          : false
        const consecutiveMeta = feedback.classLessonId
          ? consecutiveMap.get(feedback.classLessonId)
          : null
        return {
          id: feedback.id,
          studentName: feedback.studentIds
            .map((studentId) => studentMap.get(studentId)?.name)
            .filter(Boolean)
            .join('、') || '未知学生',
          teacherId: feedback.teacherId,
          teacherName: feedback.teacher.name,
          classGroupName: feedback.classLesson?.group?.name || feedbackGroupMap.get(feedback.feedbackGroupId || '')?.name || null,
          courseName: feedback.classLesson?.group?.course?.name || feedbackGroupMap.get(feedback.feedbackGroupId || '')?.course?.name || null,
          lessonContent: feedback.lessonContent?.slice(0, 120) || null,
          summary: feedback.summary?.slice(0, 200) || null,
          subject: feedback.classLesson?.subject
            ?? feedback.classLesson?.group?.course?.subject
            ?? feedbackGroupMap.get(feedback.feedbackGroupId || '')?.course?.subject
            ?? '-',
          date: (feedback.classLesson?.lessonDate ?? feedback.createdAt).toISOString(),
          createdAt: feedback.createdAt.toISOString(),
          tags: feedback.tags,
          imageCount: feedback.imageUrls.length,
          hasImage: feedback.imageUrls.length > 0,
          status: feedback.status,
          isConsecutive: isConsecutiveSession,
          sessionSpan: consecutiveMeta?.sessionSpan,
        }
      }),
      lessons: allLessons.map((lesson) => {
        const cMeta = consecutiveMap.get(lesson.id)
        const siblingFeedback = cMeta?.partnerLessonIds?.some((pId) => {
          const sibling = allLessons.find((l) => l.id === pId)
          return sibling?.classroomFeedbacks.some((fb) => fb.status === 'PUBLISHED')
        })
        const isDirectPublished = lesson.classroomFeedbacks.some((feedback) => feedback.status === 'PUBLISHED')
        return {
          id: lesson.id,
          teacherId: lesson.teacherId,
          teacherName: lesson.teacher?.name || '未分配',
          groupName: lesson.group.name,
          courseName: lesson.group.course.name,
          subject: lesson.group.course.subject,
          time: `${lesson.startTime}-${lesson.endTime}`,
          hasFeedback: isDirectPublished || Boolean(siblingFeedback),
          hasDirectFeedback: isDirectPublished,
          isCombinedFeedback: !isDirectPublished && Boolean(siblingFeedback),
          isConsecutive: Boolean(cMeta?.isConsecutive),
          consecutiveIndex: cMeta?.consecutiveIndex,
          sessionSpan: cMeta?.sessionSpan,
          partnerLessonIds: cMeta?.partnerLessonIds || [],
          hasAnyFeedback: lesson.classroomFeedbacks.length > 0 || Boolean(siblingFeedback),
          draftFeedbackId: lesson.classroomFeedbacks.find((feedback) => feedback.status === 'DRAFT')?.id || null,
          feedbackEligible: feedbackEligibleLessonIds.has(lesson.id),
          students: lesson.group.enrollments.map((e) => e.student).filter(Boolean),
        }
      }),
    })
  } catch (err) {
    console.error('[admin:classroom-feedback:GET]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
})

export const POST = apiHandler(async (req: NextRequest) => {
  try {
    const session = await auth()
    const user = session?.user as { id: string; role: string; name?: string | null } | undefined
    if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
    const prisma = await getRequestPrisma()

    const body = await req.json()
    const { 
      teacherId, studentIds, lessonContent: rawLessonContent, knowledgePoints, summary, homework, imageUrls,
      source = 'admin', status = 'DRAFT',
      mood, tags, badge, overallComment, classLessonId, additionalLessonIds
    } = body
    const lessonContent = normalizeLessonContent(rawLessonContent)

    if (!teacherId) return NextResponse.json({ error: '缺少 teacherId' }, { status: 400 })
    if (!Array.isArray(studentIds) || !studentIds.length) return NextResponse.json({ error: '请选择学员' }, { status: 400 })

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true, name: true, division: true } })
    if (!teacher) return NextResponse.json({ error: '教师不存在' }, { status: 404 })

    const studentsData = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, parentId: true, parentUserId: true },
    })

    const lessonScope = classLessonId ? await prisma.classLesson.findUnique({
      where: { id: classLessonId },
      select: { group: { select: { termId: true } } },
    }) : null
    const feedbackTermId = lessonScope?.group.termId || (await prisma.academicTerm.findFirst({
      where: { division: teacher.division, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    }))?.id || null

    const feedback = await prisma.$transaction(async (tx) => {
      const created = await tx.classroomFeedback.create({
        data: {
          termId: feedbackTermId,
          teacherId,
          classLessonId: classLessonId || null,
          source,
          targetType: 'CLASS',
          studentIds,
          lessonContent: lessonContent || null,
          knowledgePoints: Array.isArray(knowledgePoints) ? knowledgePoints : [],
          summary: summary || null,
          homework: Array.isArray(homework) ? homework : [],
          imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
          mood: mood || null,
          tags: Array.isArray(tags) ? tags : [],
          badge: badge || null,
          overallComment: overallComment || null,
          status,
          notifySent: status === 'PUBLISHED',
        },
      })

      if (status === 'PUBLISHED') {
        for (const student of studentsData) {
          const parentUserId = student.parentId || student.parentUserId
          if (!parentUserId) continue
          await createNotification(tx, {
            userId: parentUserId,
            type: 'CLASSROOM_FEEDBACK',
            title: `${teacher.name.endsWith('老师') ? teacher.name : `${teacher.name}老师`}发布了课堂反馈`,
            content: `${student.name}: ${summary || knowledgePoints?.join('、') || '课堂资料已更新'}`.slice(0, 80),
            link: '/parent/class-feedback',
            relatedType: 'CLASSROOM_FEEDBACK',
            relatedId: created.id,
            href: `/parent/class-feedback/${created.id}`,
          })
        }
      }

      // 如果有连堂小节（additionalLessonIds），同步写入关联反馈以闭环连堂课
      if (Array.isArray(additionalLessonIds) && additionalLessonIds.length > 0) {
        for (const sisterLessonId of additionalLessonIds) {
          if (sisterLessonId && sisterLessonId !== classLessonId) {
            await tx.classroomFeedback.create({
              data: {
                termId: feedbackTermId,
                teacherId,
                classLessonId: sisterLessonId,
                source,
                targetType: 'CLASS',
                studentIds,
                lessonContent: lessonContent || null,
                knowledgePoints: Array.isArray(knowledgePoints) ? knowledgePoints : [],
                summary: summary || null,
                homework: Array.isArray(homework) ? homework : [],
                imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
                mood: mood || null,
                tags: Array.isArray(tags) ? tags : [],
                badge: badge || null,
                overallComment: overallComment || null,
                status,
                notifySent: true,
              },
            })
          }
        }
      }

      return created
    })

    if (status === 'PUBLISHED') {
      await triggerFeedbackBonus(feedback.id, prisma)
    }

    revalidatePath('/teacher/dashboard')
    revalidatePath('/parent/archive')
    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '创建失败' }, { status: 500 })
  }
})
