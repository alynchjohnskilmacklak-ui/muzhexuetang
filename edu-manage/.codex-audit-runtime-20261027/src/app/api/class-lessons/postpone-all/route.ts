import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { attendanceEligibleLessonWhere, visibleClassGroupWhere } from '@/lib/business-visibility'
import { addDays } from 'date-fns'
import { apiHandler } from '@/lib/api-handler'
import { isClassLessonInActiveTerm } from '@/lib/admin-term-scope'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
import { recordCourseChangeEvent } from '@/lib/course-change-events'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const body = await req.json()
  const { lessonId, offsetDays } = body
  if (!lessonId || !await isClassLessonInActiveTerm(prisma, lessonId)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能后移课次' }, { status: 409 })
  }

  const lesson = await prisma.classLesson.findFirst({
    where: { id: lessonId, ...attendanceEligibleLessonWhere },
    include: { group: true },
  })
  if (!lesson) return NextResponse.json({ error: '课次不存在' }, { status: 404 })

  const days = Number(offsetDays || 7)
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    return NextResponse.json({ error: '后移天数须为 1 至 90 天' }, { status: 400 })
  }

  const lessons = await prisma.classLesson.findMany({
    where: {
      groupId: lesson.groupId,
      group: visibleClassGroupWhere,
      lessonDate: { gte: lesson.lessonDate },
      status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] },
    },
    include: { lessonStudents: { select: { studentId: true } } },
  })

  const result = await prisma.$transaction(async (tx) => {
    for (const l of lessons) {
      await tx.classLesson.update({
        where: { id: l.id },
        data: { lessonDate: addDays(l.lessonDate, days) },
      })
    }

    const enrollments = await tx.enrollment.findMany({
      where: { groupId: lesson.groupId, status: 'ACTIVE', deletedAt: null },
      select: { studentId: true, subjects: true },
    })
    const studentIds = [...new Set(lessons.flatMap((item) => {
      const snapshotIds = item.lessonStudents.map((row) => row.studentId)
      if (snapshotIds.length) return snapshotIds
      return enrollments
        .filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, item.subject))
        .map((enrollment) => enrollment.studentId)
    }))]
    const event = await recordCourseChangeEvent(tx, {
      eventType: 'LESSONS_POSTPONED',
      actorUserId: user.id,
      groupId: lesson.groupId,
      lessonIds: lessons.map((item) => item.id),
      studentIds,
      title: `${lesson.group.name}后续课程已顺延`,
      summary: `${lessons.length} 节后续课程统一后移 ${days} 天，请查看家长端最新课表。`,
      notifyParents: lesson.group.status === 'ACTIVE',
    })
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: '一键后移课次',
        detail: `${lesson.group.name} 后移${days}天`,
        entityType: 'CourseChangeEvent',
        entityId: event.event.id,
        metadata: { lessonCount: lessons.length, studentCount: studentIds.length, notifiedParents: event.recipientCount },
      },
    })
    return event
  })

  revalidatePath('/schedule')
  revalidatePath('/teacher/schedule')
  revalidatePath('/parent/schedule')
  return NextResponse.json({ success: true, count: lessons.length, notifiedParents: result.recipientCount, changeEventId: result.event.id })
})
