import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

type IdRow = { id: string }

async function softDeleteNotifications(ids: string[], now: Date) {
  if (!ids.length) return
  await prisma.notification.updateMany({
    where: { id: { in: ids } },
    data: { status: 'DELETED', read: true, readAt: now },
  })
}

async function main() {
  const now = new Date()
  const testNotificationsWhere = {
    OR: [
      { title: { contains: '测试' } },
      { content: { contains: '测试' } },
      { title: { contains: '已加入 1' } },
      { content: { contains: '已加入 1' } },
      { type: 'mock' },
    ],
    status: { not: 'DELETED' },
  }

  const testPaperWhere = {
    status: { not: 'DELETED' as const },
    OR: [
      { title: { contains: '测试' } },
      {
        AND: [
          { title: '新试卷' },
          { imageUrls: { isEmpty: true } },
          { fileUrl: null },
          { OR: [{ overallComment: null }, { overallComment: '' }] },
          { questions: { none: {} } },
        ],
      },
    ],
  }

  const [
    allPaperIds,
    deletedPaperIds,
    allFeedbackIds,
    unpublishedFeedbackIds,
    allPostIds,
    deletedPostIds,
    allAttendanceIds,
    inactiveStudentIds,
    archivedLessonIds,
  ] = await Promise.all([
    prisma.examPaper.findMany({ select: { id: true } }),
    prisma.examPaper.findMany({ where: { status: 'DELETED' }, select: { id: true } }),
    prisma.classroomFeedback.findMany({ select: { id: true } }),
    prisma.classroomFeedback.findMany({ where: { status: { not: 'PUBLISHED' } }, select: { id: true } }),
    prisma.performancePost.findMany({ select: { id: true } }),
    prisma.performancePost.findMany({ where: { deletedAt: { not: null } }, select: { id: true } }),
    prisma.attendance.findMany({ select: { id: true } }),
    prisma.student.findMany({ where: { status: 'INACTIVE' }, select: { id: true } }),
    prisma.classLesson.findMany({ where: { group: { status: 'ARCHIVED' } }, select: { id: true } }),
  ])

  const paperIdSet = new Set(allPaperIds.map((item) => item.id))
  const deletedPaperIdSet = new Set(deletedPaperIds.map((item) => item.id))
  const feedbackIdSet = new Set(allFeedbackIds.map((item) => item.id))
  const unpublishedFeedbackIdSet = new Set(unpublishedFeedbackIds.map((item) => item.id))
  const postIdSet = new Set(allPostIds.map((item) => item.id))
  const deletedPostIdSet = new Set(deletedPostIds.map((item) => item.id))
  const attendanceIdSet = new Set(allAttendanceIds.map((item) => item.id))
  const inactiveStudentIdSet = new Set(inactiveStudentIds.map((item) => item.id))
  const archivedLessonIdSet = new Set(archivedLessonIds.map((item) => item.id))

  const relatedNotifications = await prisma.notification.findMany({
    where: {
      status: { not: 'DELETED' },
      relatedType: { in: ['EXAM_PAPER', 'CLASSROOM_FEEDBACK', 'PERFORMANCE_POST', 'PERFORMANCE_UPDATE', 'ATTENDANCE'] },
    },
    select: { id: true, relatedType: true, relatedId: true, studentId: true },
  })

  const invalidExamPaperNotificationIds = relatedNotifications
    .filter((item) => item.relatedType === 'EXAM_PAPER' && item.relatedId && (!paperIdSet.has(item.relatedId) || deletedPaperIdSet.has(item.relatedId)))
    .map((item) => item.id)

  const invalidClassroomFeedbackNotificationIds = relatedNotifications
    .filter((item) => item.relatedType === 'CLASSROOM_FEEDBACK' && item.relatedId && (!feedbackIdSet.has(item.relatedId) || unpublishedFeedbackIdSet.has(item.relatedId)))
    .map((item) => item.id)

  const invalidPerformanceNotificationIds = relatedNotifications
    .filter((item) => ['PERFORMANCE_POST', 'PERFORMANCE_UPDATE'].includes(String(item.relatedType)) && item.relatedId && (!postIdSet.has(item.relatedId) || deletedPostIdSet.has(item.relatedId)))
    .map((item) => item.id)

  const invalidAttendanceNotificationIds = relatedNotifications
    .filter((item) => item.relatedType === 'ATTENDANCE' && item.relatedId && !attendanceIdSet.has(item.relatedId))
    .map((item) => item.id)

  const attendanceNotificationsWithoutRelatedId = relatedNotifications
    .filter((item) => item.relatedType === 'ATTENDANCE' && !item.relatedId)
    .map((item) => item.id)

  const inactiveStudentNotificationIds = await prisma.notification.findMany({
    where: { status: { not: 'DELETED' }, studentId: { in: [...inactiveStudentIdSet] } },
    select: { id: true },
  })

  const archivedLessonNotificationIds = await prisma.notification.findMany({
    where: {
      status: { not: 'DELETED' },
      relatedType: { in: ['CLASS_LESSON', 'LESSON'] },
      relatedId: { in: [...archivedLessonIdSet] },
    },
    select: { id: true },
  })

  const allStudentIds = new Set((await prisma.student.findMany({ where: { status: { not: 'INACTIVE' } }, select: { id: true } })).map((item) => item.id))
  const feedbacksWithInvalidStudents = (await prisma.classroomFeedback.findMany({ select: { id: true, studentIds: true } }))
    .filter((feedback) => feedback.studentIds.some((studentId) => !allStudentIds.has(studentId)))

  const inactiveExamPaperIds = await prisma.examPaper.findMany({
    where: { status: { not: 'DELETED' }, student: { status: 'INACTIVE' } },
    select: { id: true },
  })

  const orphanAttendanceIds = await prisma.$queryRaw<IdRow[]>`SELECT a.id FROM "Attendance" a LEFT JOIN "Student" s ON s.id = a."studentId" WHERE s.id IS NULL`
  const orphanExamPaperIds = await prisma.$queryRaw<IdRow[]>`SELECT p.id FROM "ExamPaper" p LEFT JOIN "Student" s ON s.id = p."studentId" WHERE s.id IS NULL`
  const orphanPerformancePostIds = await prisma.$queryRaw<IdRow[]>`SELECT p.id FROM "PerformancePost" p LEFT JOIN "Student" s ON s.id = p."studentId" WHERE s.id IS NULL`
  const orphanNotificationIds = await prisma.$queryRaw<IdRow[]>`SELECT n.id FROM "Notification" n LEFT JOIN "User" u ON u.id = n."userId" WHERE u.id IS NULL`

  const counts = {
    testNotifications: await prisma.notification.count({ where: testNotificationsWhere }),
    testPapers: await prisma.examPaper.count({ where: testPaperWhere }),
    invalidExamPaperNotifications: invalidExamPaperNotificationIds.length,
    invalidClassroomFeedbackNotifications: invalidClassroomFeedbackNotificationIds.length,
    invalidPerformanceNotifications: invalidPerformanceNotificationIds.length,
    invalidAttendanceNotifications: invalidAttendanceNotificationIds.length,
    inactiveStudentNotifications: inactiveStudentNotificationIds.length,
    archivedLessonNotifications: archivedLessonNotificationIds.length,
    feedbacksWithInvalidStudents: feedbacksWithInvalidStudents.length,
    inactiveExamPapers: inactiveExamPaperIds.length,
    orphanAttendances: orphanAttendanceIds.length,
    orphanExamPapers: orphanExamPaperIds.length,
    orphanPerformancePosts: orphanPerformancePostIds.length,
    orphanNotifications: orphanNotificationIds.length,
  }

  console.log(`将隐藏测试通知：${counts.testNotifications} 条`)
  console.log(`将隐藏测试试卷：${counts.testPapers} 条`)
  console.log(`将隐藏无效试卷通知：${counts.invalidExamPaperNotifications} 条`)
  console.log(`将隐藏无效课堂反馈通知：${counts.invalidClassroomFeedbackNotifications} 条`)
  console.log(`将隐藏无效表现反馈通知：${counts.invalidPerformanceNotifications} 条`)
  console.log(`将隐藏无效考勤通知：${counts.invalidAttendanceNotifications} 条`)
  console.log(`将隐藏离校学生通知：${counts.inactiveStudentNotifications} 条`)
  console.log(`将隐藏归档课次通知：${counts.archivedLessonNotifications} 条`)
  console.log(`将隐藏离校学生试卷：${counts.inactiveExamPapers} 条`)
  console.log(`课堂反馈包含无效学生ID：${counts.feedbacksWithInvalidStudents} 条`)
  console.log(`将删除孤儿考勤：${counts.orphanAttendances} 条`)
  console.log(`将删除孤儿试卷：${counts.orphanExamPapers} 条`)
  console.log(`将删除孤儿表现反馈：${counts.orphanPerformancePosts} 条`)
  console.log(`将删除孤儿通知：${counts.orphanNotifications} 条`)
  if (attendanceNotificationsWithoutRelatedId.length) {
    console.log(`警告：考勤通知缺少 relatedId：${attendanceNotificationsWithoutRelatedId.length} 条，未自动处理`)
  }

  if (dryRun) {
    console.log('dry-run 模式未写入数据库')
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.updateMany({ where: testNotificationsWhere, data: { status: 'DELETED', read: true, readAt: now } })
    await tx.examPaper.updateMany({ where: testPaperWhere, data: { status: 'DELETED' } })
    await tx.examPaper.updateMany({ where: { id: { in: inactiveExamPaperIds.map((item) => item.id) } }, data: { status: 'DELETED' } })
    await tx.attendance.deleteMany({ where: { id: { in: orphanAttendanceIds.map((item) => item.id) } } })
    await tx.examPaper.deleteMany({ where: { id: { in: orphanExamPaperIds.map((item) => item.id) } } })
    await tx.performancePost.deleteMany({ where: { id: { in: orphanPerformancePostIds.map((item) => item.id) } } })
    await tx.notification.deleteMany({ where: { id: { in: orphanNotificationIds.map((item) => item.id) } } })
  })

  await softDeleteNotifications([
    ...invalidExamPaperNotificationIds,
    ...invalidClassroomFeedbackNotificationIds,
    ...invalidPerformanceNotificationIds,
    ...invalidAttendanceNotificationIds,
    ...inactiveStudentNotificationIds.map((item) => item.id),
    ...archivedLessonNotificationIds.map((item) => item.id),
  ], now)

  console.log('残留数据清理完成')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
