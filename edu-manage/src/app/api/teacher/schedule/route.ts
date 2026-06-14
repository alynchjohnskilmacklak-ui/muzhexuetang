import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentTeacher, teacherLessonWhere } from '@/lib/teacher-portal'
import { activeEnrollmentWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { teacher, prisma } = await requireCurrentTeacher()
    const { searchParams } = req.nextUrl
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') || 'ALL'
    const where: Record<string, unknown> = {
      ...teacherLessonWhere(teacher.id),
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      ...(startDate || endDate ? {
        lessonDate: {
          ...(startDate ? { gte: new Date(`${startDate}T00:00:00`) } : {}),
          ...(endDate ? { lte: new Date(`${endDate}T23:59:59`) } : {}),
        },
      } : {}),
    }
    if (type === 'ALL') {
      // 不加 course.type 过滤，返回该教师全部课次
    } else if (type === 'GROUP') {
      where.group = { ...(where.group as Record<string, unknown> || {}), course: { type: 'GROUP' } }
    } else if (type === 'INTENSIVE') {
      where.group = { ...(where.group as Record<string, unknown> || {}), course: { type: { in: ['ONE_ON_ONE', 'SMALL_GROUP'] } } }
    }

    const lessons = await prisma.classLesson.findMany({
      where,
      include: {
        group: {
          include: {
            course: { select: { id: true, name: true, subject: true, grade: true, type: true, color: true } },
            teacher: { select: { id: true, name: true, subjects: true } },
            teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } }, orderBy: { createdAt: 'asc' } },
            room: { select: { id: true, name: true, capacity: true, type: true } },
            enrollments: { where: activeEnrollmentWhere, select: { id: true, student: { select: { id: true, name: true } } } },
          },
        },
        teacher: { select: { id: true, name: true, subjects: true } },
        attendances: { select: { id: true, status: true } },
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json({
      currentTeacherId: teacher.id,
      lessons: lessons.map((lesson) => ({
        ...lesson,
        assignedSubject: lesson.group.teacherAssignments.find((item) => item.teacherId === teacher.id)?.subject || lesson.subject || lesson.group.course.subject,
      })),
    })
  } catch {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
}
