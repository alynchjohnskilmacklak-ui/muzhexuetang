import { Prisma, PrismaClient } from '@prisma/client'
import { chinaClock } from '@/lib/enrollment-subject-change'
import { localDateKey } from '@/lib/date/local-day'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'

export class CancelLessonError extends Error {
  constructor(message: string, readonly status = 409) { super(message) }
}

/** 仅取消未来未发生的课次；历史考勤、反馈、扣费和工资一律不回滚。 */
export async function cancelScheduledLesson(
  prisma: PrismaClient,
  input: { lessonId: string; division: string; operatorId: string; reason: string },
) {
  const reason = input.reason.trim()
  if (reason.length < 2 || reason.length > 200) throw new CancelLessonError('请填写 2–200 字的停课原因', 400)

  return prisma.$transaction(async (tx) => {
    const lesson = await tx.classLesson.findFirst({
      where: { id: input.lessonId, division: input.division, deletedAt: null, group: { term: { status: 'ACTIVE' }, deletedAt: null } },
      include: {
        lessonStudents: { select: { studentId: true } },
        group: { select: {
          id: true, name: true, status: true,
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null },
            select: { studentId: true, subjects: true, student: { select: { parentId: true, parentUserId: true } } },
          },
        } },
      },
    })
    if (!lesson) throw new CancelLessonError('课次不存在或不属于当前运营批次', 404)
    if (lesson.status !== 'SCHEDULED') throw new CancelLessonError('只允许取消尚未开始的待上课课次')
    const clock = chinaClock(new Date())
    const lessonDay = localDateKey(lesson.lessonDate)
    if (lessonDay < clock.day || (lessonDay === clock.day && lesson.startTime <= clock.time)) {
      throw new CancelLessonError('课程已开始或已过去，不能直接取消；请走课时与考勤纠错流程')
    }
    if (lesson.attendanceSubmittedAt || lesson.hoursDeductedAt) {
      throw new CancelLessonError('本课次已有考勤或课时结算，不能直接取消')
    }

    const counts = await Promise.all([
      tx.attendance.count({ where: { lessonId: lesson.id, deletedAt: null } }),
      tx.classroomFeedback.count({ where: { classLessonId: lesson.id, deletedAt: null } }),
      tx.performancePost.count({ where: { classLessonId: lesson.id, deletedAt: null } }),
      tx.examPaper.count({ where: { classLessonId: lesson.id, deletedAt: null } }),
      tx.hourTransaction.count({ where: { lessonId: lesson.id, deletedAt: null } }),
      tx.teacherSalaryTransaction.count({ where: { lessonId: lesson.id, deletedAt: null } }),
      tx.leaveRequest.count({ where: { lessonId: lesson.id, deletedAt: null } }),
      tx.intensiveLessonReview.count({ where: { lessonId: lesson.id } }),
    ])
    if (counts.some((count) => count > 0)) {
      throw new CancelLessonError('本课次已有考勤、反馈、请假或结算关联，不能直接取消；请先核对业务记录')
    }

    const changed = await tx.classLesson.updateMany({
      where: { id: lesson.id, status: 'SCHEDULED', attendanceSubmittedAt: null, hoursDeductedAt: null },
      data: { status: 'CANCELLED', cancelReason: reason },
    })
    if (changed.count !== 1) throw new CancelLessonError('课次状态已变化，请刷新后重试')
    const totalLessons = await tx.classLesson.count({
      where: { groupId: lesson.groupId, deletedAt: null, status: { notIn: ['CANCELLED', 'POSTPONED'] } },
    })
    await tx.classGroup.update({ where: { id: lesson.groupId }, data: { totalLessons } })

    const snapshotIds = new Set(lesson.lessonStudents.map((row) => row.studentId))
    const affected = snapshotIds.size
      ? lesson.group.enrollments.filter((enrollment) => snapshotIds.has(enrollment.studentId))
      : lesson.group.enrollments.filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, lesson.subject))
    const parentIds = [...new Set(affected
      .map((enrollment) => enrollment.student.parentId || enrollment.student.parentUserId)
      .filter((parentId): parentId is string => Boolean(parentId)))]
    if (lesson.group.status === 'ACTIVE' && parentIds.length) {
      await tx.notification.createMany({ data: parentIds.map((parentId) => ({
        userId: parentId, type: 'SCHEDULE_CHANGE', title: `${lesson.group.name}本次停课`,
        content: `${lessonDay} ${lesson.startTime}-${lesson.endTime} 已取消。原因：${reason}`,
        href: '/parent/schedule', relatedType: 'ClassLesson', relatedId: lesson.id,
      })) })
    }
    await tx.activityLog.create({ data: {
      userId: input.operatorId, action: '取消课次', entityType: 'ClassLesson', entityId: lesson.id,
      detail: `${lesson.group.name} ${lessonDay} ${lesson.startTime}-${lesson.endTime}；原因：${reason}`,
      metadata: { groupId: lesson.groupId, reason, notifiedParents: parentIds.length },
    } })
    return { id: lesson.id, groupId: lesson.groupId, status: 'CANCELLED' as const, notifiedParents: parentIds.length }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
