import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '仅管理员可操作' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const results: Record<string, number> = {}

  // 1. 硬删除 ARCHIVED 班级 (已有 DeletedRecord 备份)
  const archivedGroups = await prisma.classGroup.findMany({
    where: { status: 'ARCHIVED' },
    include: { classLessons: { include: { attendances: true } }, enrollments: true, assessments: { include: { gradeRecords: true } } },
  })
  for (const g of archivedGroups) {
    await prisma.$transaction(async (tx) => {
      for (const lesson of g.classLessons) {
        await tx.makeupRequest.deleteMany({ where: { attendance: { lessonId: lesson.id } } })
        await tx.attendance.deleteMany({ where: { lessonId: lesson.id } })
      }
      for (const a of g.assessments) {
        await tx.dimensionScore.deleteMany({ where: { grade: { assessmentId: a.id } } })
        await tx.classHighlight.deleteMany({ where: { grade: { assessmentId: a.id } } })
        await tx.gradeRecord.deleteMany({ where: { assessmentId: a.id } })
      }
      await tx.classHighlight.deleteMany({ where: { groupId: g.id } })
      await tx.classLesson.deleteMany({ where: { groupId: g.id } })
      await tx.enrollment.deleteMany({ where: { groupId: g.id } })
      await tx.classGroupTeacher.deleteMany({ where: { groupId: g.id } })
      await tx.classGroup.delete({ where: { id: g.id } })
    })
  }
  results.archivedGroups = archivedGroups.length

  // 2. 硬删除 CANCELLED 排课
  const cancelledSchedules = await prisma.schedule.findMany({ where: { status: 'cancelled' }, select: { id: true } })
  if (cancelledSchedules.length > 0) {
    await prisma.scheduleStudent.deleteMany({ where: { schedule: { status: 'cancelled' } } })
    await prisma.schedule.deleteMany({ where: { status: 'cancelled' } })
  }
  results.cancelledSchedules = cancelledSchedules.length

  // 3. 硬删除 CANCELLED 课次
  const cancelledLessons = await prisma.classLesson.findMany({ where: { status: 'CANCELLED' }, select: { id: true } })
  for (const l of cancelledLessons) {
    await prisma.makeupRequest.deleteMany({ where: { attendance: { lessonId: l.id } } })
    await prisma.attendance.deleteMany({ where: { lessonId: l.id } })
    await prisma.classLesson.delete({ where: { id: l.id } })
  }
  results.cancelledLessons = cancelledLessons.length

  // 4. 硬删除 DELETED 试卷
  const deletedPapers = await prisma.examPaper.count({ where: { status: 'DELETED' } })
  if (deletedPapers > 0) {
    await prisma.paperComment.deleteMany({ where: { paper: { status: 'DELETED' } } })
    await prisma.paperReaction.deleteMany({ where: { paper: { status: 'DELETED' } } })
    await prisma.paperQuestion.deleteMany({ where: { paper: { status: 'DELETED' } } })
    await prisma.weaknessRecord.deleteMany({ where: { paper: { status: 'DELETED' } } })
    await prisma.examPaper.deleteMany({ where: { status: 'DELETED' } })
  }
  results.deletedPapers = deletedPapers

  // 5. 硬删除 RESIGNED 已离职教师（清理关联，在事务中执行）
  const resignedTeachers = await prisma.teacher.findMany({ where: { status: 'RESIGNED' }, select: { id: true, name: true } })
  for (const t of resignedTeachers) {
    await prisma.$transaction(async (tx) => {
      await tx.postComment.deleteMany({ where: { post: { teacherId: t.id } } })
      await tx.postReaction.deleteMany({ where: { post: { teacherId: t.id } } })
      await tx.postBadge.deleteMany({ where: { post: { teacherId: t.id } } })
      await tx.performancePost.deleteMany({ where: { teacherId: t.id } })
      await tx.paperComment.deleteMany({ where: { paper: { teacherId: t.id } } })
      await tx.paperReaction.deleteMany({ where: { paper: { teacherId: t.id } } })
      await tx.paperQuestion.deleteMany({ where: { paper: { teacherId: t.id } } })
      await tx.weaknessRecord.deleteMany({ where: { paper: { teacherId: t.id } } })
      await tx.examPaper.deleteMany({ where: { teacherId: t.id } })
      await tx.achievementBadge.deleteMany({ where: { teacherId: t.id } })
      await tx.classroomFeedback.deleteMany({ where: { teacherId: t.id } })
      await tx.classHighlight.deleteMany({ where: { teacherId: t.id } })
      await tx.activityLog.updateMany({ where: { teacherId: t.id }, data: { teacherId: null } })
      await tx.classLesson.updateMany({ where: { teacherId: t.id }, data: { teacherId: null } })
      await tx.classGroupTeacher.deleteMany({ where: { teacherId: t.id } })
      await tx.teacherAlert.deleteMany({ where: { teacherId: t.id } })
      await tx.teacher.delete({ where: { id: t.id } })
    })
  }
  results.resignedTeachers = resignedTeachers.length

  // 6. 硬删除 INACTIVE 学员（已离校，在事务中执行）
  const inactiveStudents = await prisma.student.findMany({ where: { status: 'INACTIVE' }, select: { id: true, parentId: true, parentUserId: true } })
  for (const s of inactiveStudents) {
    await prisma.$transaction(async (tx) => {
      const parentIds = [s.parentId, s.parentUserId].filter((parentId): parentId is string => Boolean(parentId))
      await tx.makeupRequest.deleteMany({ where: { studentId: s.id } })
      await tx.attendance.deleteMany({ where: { studentId: s.id } })
      await tx.classHighlight.deleteMany({ where: { studentId: s.id } })
      await tx.dimensionScore.deleteMany({ where: { grade: { studentId: s.id } } })
      await tx.gradeRecord.deleteMany({ where: { studentId: s.id } })
      await tx.enrollment.deleteMany({ where: { studentId: s.id } })
      await tx.scheduleStudent.deleteMany({ where: { studentId: s.id } })
      await tx.learningGoal.deleteMany({ where: { studentId: s.id } })
      await tx.weaknessRecord.deleteMany({ where: { studentId: s.id } })
      await tx.fee.deleteMany({ where: { studentId: s.id } })
      await tx.postComment.deleteMany({ where: { post: { studentId: s.id } } })
      await tx.postReaction.deleteMany({ where: { post: { studentId: s.id } } })
      await tx.postBadge.deleteMany({ where: { post: { studentId: s.id } } })
      await tx.performancePost.deleteMany({ where: { studentId: s.id } })
      await tx.paperComment.deleteMany({ where: { paper: { studentId: s.id } } })
      await tx.paperReaction.deleteMany({ where: { paper: { studentId: s.id } } })
      await tx.paperQuestion.deleteMany({ where: { paper: { studentId: s.id } } })
      await tx.examPaper.deleteMany({ where: { studentId: s.id } })
      await tx.achievementBadge.deleteMany({ where: { studentId: s.id } })
      const feedbacks = await tx.classroomFeedback.findMany({ where: { studentIds: { has: s.id } }, select: { id: true, studentIds: true } })
      for (const feedback of feedbacks) {
        const studentIds = feedback.studentIds.filter((studentId) => studentId !== s.id)
        if (studentIds.length) await tx.classroomFeedback.update({ where: { id: feedback.id }, data: { studentIds } })
        else await tx.classroomFeedback.delete({ where: { id: feedback.id } })
      }
      if (parentIds.length) {
        await tx.notification.deleteMany({
          where: { userId: { in: parentIds }, link: { in: ['/parent/performance', '/parent/grades', '/parent/schedule'] } },
        })
      }
      await tx.student.delete({ where: { id: s.id } })
    })
  }
  results.inactiveStudents = inactiveStudents.length

  // 7. 清理无关联的 DeletedRecord (超过30天)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  const oldRecords = await prisma.deletedRecord.count({ where: { createdAt: { lt: thirtyDaysAgo } } })
  await prisma.deletedRecord.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } })
  results.cleanedDeletedRecords = oldRecords

  // 8. 清理 WITHDRAWN 报名记录
  const withdrawn = await prisma.enrollment.count({ where: { status: 'WITHDRAWN' } })
  await prisma.enrollment.deleteMany({ where: { status: 'WITHDRAWN' } })
  results.withdrawnEnrollments = withdrawn

  // 9. 清理无关联的 activityLogs (超过90天)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000)
  const oldLogs = await prisma.activityLog.count({ where: { createdAt: { lt: ninetyDaysAgo } } })
  await prisma.activityLog.deleteMany({ where: { createdAt: { lt: ninetyDaysAgo } } })
  results.cleanedOldLogs = oldLogs

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'SYSTEM_CLEANUP', detail: `永久删除数据: 班级${results.archivedGroups} 排课${results.cancelledSchedules} 课次${results.cancelledLessons} 试卷${results.deletedPapers} 教师${results.resignedTeachers} 学员${results.inactiveStudents}` },
  })

  return NextResponse.json({ success: true, results })
})

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '仅管理员' }, { status: 403 })


  const prisma = await getRequestPrisma()
  const [archivedGroups, cancelledSchedules, cancelledLessons, deletedPapers, resignedTeachers, inactiveStudents, withdrawnEnrollments, oldLogs, oldRecords] = await Promise.all([
    prisma.classGroup.count({ where: { status: 'ARCHIVED' } }),
    prisma.schedule.count({ where: { status: 'cancelled' } }),
    prisma.classLesson.count({ where: { status: 'CANCELLED' } }),
    prisma.examPaper.count({ where: { status: 'DELETED' } }),
    prisma.teacher.count({ where: { status: 'RESIGNED' } }),
    prisma.student.count({ where: { status: 'INACTIVE' } }),
    prisma.enrollment.count({ where: { status: 'WITHDRAWN' } }),
    prisma.activityLog.count({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86400000) } } }),
    prisma.deletedRecord.count(),
  ])

  return NextResponse.json({
    archivedGroups, cancelledSchedules, cancelledLessons, deletedPapers,
    resignedTeachers, inactiveStudents, withdrawnEnrollments,
    oldActivityLogs: oldLogs, deletedRecords: oldRecords,
    totalSoftDeleted: archivedGroups + cancelledSchedules + cancelledLessons + deletedPapers + resignedTeachers + inactiveStudents + withdrawnEnrollments,
  })
})
