import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const { teacher } = await requireCurrentTeacher()

  const feedback = await prisma.classroomFeedback.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      classLesson: {
        include: {
          group: {
            include: {
              course: { select: { name: true, subject: true, grade: true } },
            },
          },
        },
      },
    },
  })

  if (!feedback) return NextResponse.json({ error: '反馈不存在' }, { status: 404 })

  const students = feedback.studentIds.length
    ? await prisma.student.findMany({
        where: { id: { in: feedback.studentIds } },
        select: { id: true, name: true, grade: true },
      })
    : []

  return NextResponse.json({
    id: feedback.id,
    teacherId: feedback.teacherId,
    status: feedback.status,
    lessonName: feedback.classLesson?.group?.course?.name || feedback.classLesson?.group?.name || '-',
    lessonDate: feedback.classLesson?.lessonDate?.toISOString() || null,
    lessonTime: feedback.classLesson?.startTime
      ? `${feedback.classLesson.startTime}-${feedback.classLesson.endTime}`
      : null,
    knowledgePoints: feedback.knowledgePoints,
    summary: feedback.summary,
    homework: feedback.homework,
    imageUrls: feedback.imageUrls,
    imageTypes: feedback.imageTypes,
    studentRatings: feedback.studentRatings,
    students,
    createdAt: feedback.createdAt.toISOString(),
  })
})
