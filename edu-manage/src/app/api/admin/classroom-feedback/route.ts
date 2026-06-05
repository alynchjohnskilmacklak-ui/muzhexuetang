import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/teacher-portal'
import { isPayableFeedback } from '@/lib/teacher-salary'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser()
    const sp = req.nextUrl.searchParams
    const teacherId = sp.get('teacherId') || undefined
    const date = sp.get('date') || new Date().toISOString().slice(0, 10)
    const all = sp.get('all') === '1'
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit') || 100)))

    const dayStart = new Date(`${date}T00:00:00`)
    const dayEnd = new Date(dayStart.getTime() + 86400000)

    const feedbacks = await prisma.classroomFeedback.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
        ...(all ? {} : { createdAt: { gte: dayStart, lt: dayEnd } }),
      },
      include: {
        teacher: { select: { id: true, name: true } },
        classLesson: {
          include: {
            group: { include: { course: { select: { name: true, subject: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const allStudentIds = [...new Set(feedbacks.flatMap((feedback) => feedback.studentIds))]
    const students = allStudentIds.length
      ? await prisma.student.findMany({
          where: { id: { in: allStudentIds } },
          select: { id: true, name: true, grade: true },
        })
      : []
    const studentMap = new Map(students.map((student) => [student.id, student]))

    const teachers = await prisma.teacher.findMany({
      where: teacherId ? { id: teacherId, status: 'ACTIVE' } : { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    const feedbackTeacherIds = new Set(feedbacks.map((feedback) => feedback.teacherId))
    const teachersWithoutFeedback = all
      ? []
      : teachers.filter((teacher) => !feedbackTeacherIds.has(teacher.id))

    return NextResponse.json({
      date,
      feedbacks: feedbacks.map((feedback) => ({
        id: feedback.id,
        teacherId: feedback.teacherId,
        teacherName: feedback.teacher.name,
        lessonName: feedback.classLesson?.group?.name ?? '-',
        courseName: feedback.classLesson?.group?.course?.name ?? '-',
        subject: feedback.classLesson?.group?.course?.subject ?? '-',
        status: feedback.status,
        isValid: isPayableFeedback(feedback),
        studentIds: feedback.studentIds,
        studentCount: feedback.studentIds.length,
        students: feedback.studentIds.map((studentId) => studentMap.get(studentId)).filter(Boolean),
        knowledgePoints: feedback.knowledgePoints,
        summary: feedback.summary,
        homework: feedback.homework,
        imageUrls: feedback.imageUrls,
        studentRatings: feedback.studentRatings,
        createdAt: feedback.createdAt.toISOString(),
      })),
      teachersWithoutFeedback: teachersWithoutFeedback.map((teacher) => ({ id: teacher.id, name: teacher.name })),
    })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}
