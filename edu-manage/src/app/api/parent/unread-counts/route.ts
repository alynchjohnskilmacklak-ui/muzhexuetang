import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { parentLinkedStudentWhere, parentVisibleExamPaperWhere, parentVisiblePerformancePostWhere, visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const activeStudentIds = (
    await prisma.student.findMany({
      where: parentLinkedStudentWhere(user.id),
      select: { id: true },
    })
  ).map(student => student.id)

  const [papers, posts, notifications, feedbacks, studyHallHomework] = await Promise.all([
    prisma.examPaper.count({
      where: {
        ...parentVisibleExamPaperWhere(user.id),
        isReadByParent: false,
      },
    }),
    prisma.performancePost.count({
      where: {
        ...parentVisiblePerformancePostWhere(user.id),
        isReadByParent: false,
        visibility: 'PARENT_ONLY',
      },
    }),
    prisma.notification.count({
      where: { userId: user.id, read: false, ...visibleNotificationWhere },
    }),
    prisma.classroomFeedback.count({
      where: {
        status: 'PUBLISHED',
        parentReadAt: null,
        studentIds: { hasSome: activeStudentIds },
      },
    }),
    prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
        relatedType: 'STUDY_HALL_HOMEWORK',
        ...visibleNotificationWhere,
      },
    }),
  ])

  return NextResponse.json({ papers, posts, notifications, feedbacks, studyHallHomework }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
  })
})
