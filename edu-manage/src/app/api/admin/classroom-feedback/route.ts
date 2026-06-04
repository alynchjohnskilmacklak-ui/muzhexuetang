import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/teacher-portal'
import { isPayableFeedback } from '@/lib/teacher-salary'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser()
    const teacherId = req.nextUrl.searchParams.get('teacherId') || undefined
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 50)))

    const feedbacks = await prisma.classroomFeedback.findMany({
      where: teacherId ? { teacherId } : {},
      include: {
        teacher: { select: { id: true, name: true } },
        classLesson: { include: { group: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      feedbacks: feedbacks.map((item) => ({
        id: item.id,
        teacherId: item.teacherId,
        teacherName: item.teacher.name,
        lessonName: item.classLesson?.group.name ?? '-',
        status: item.status,
        isValid: isPayableFeedback(item),
        studentCount: item.studentIds.length,
        knowledgePoints: item.knowledgePoints,
        summary: item.summary,
        createdAt: item.createdAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}
