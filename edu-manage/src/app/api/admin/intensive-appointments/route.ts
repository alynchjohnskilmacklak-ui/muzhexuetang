import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'
import { getRequestDivision } from '@/lib/division'
import { intensiveTeachingTypeLabel } from '@/lib/intensive-class'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '仅管理员可以查看教师约课记录' }, { status: 403 })
  }

  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, request.nextUrl.searchParams.get('division'))
  const where: Prisma.ClassLessonWhereInput = {
    division,
    status: { notIn: ['CANCELLED', 'POSTPONED'] },
    intensiveReviewStatus: 'DRAFT',
    attendanceSubmittedAt: null,
    group: {
      intensiveMode: 'INTENSIVE',
      status: { not: 'ARCHIVED' },
    },
  }

  const [appointments, total] = await Promise.all([
    prisma.classLesson.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true } },
        group: {
          select: {
            id: true,
            name: true,
            teachingType: true,
            course: { select: { name: true, subject: true, grade: true } },
          },
        },
        lessonStudents: {
          select: { student: { select: { id: true, name: true, grade: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { lessonDate: 'asc' }, { startTime: 'asc' }],
      take: 100,
    }),
    prisma.classLesson.count({ where }),
  ])

  return NextResponse.json({
    division,
    total,
    appointments: appointments.map((lesson) => ({
      id: lesson.id,
      groupId: lesson.groupId,
      groupName: lesson.group.name,
      teachingType: lesson.group.teachingType || 'ONE_ON_ONE',
      teachingTypeLabel: intensiveTeachingTypeLabel(lesson.group.teachingType),
      teacherId: lesson.teacherId,
      teacherName: lesson.teacher?.name || '待确认教师',
      subject: lesson.subject || lesson.group.course.subject,
      grade: lesson.group.course.grade,
      lessonDate: lesson.lessonDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      note: lesson.note,
      createdAt: lesson.createdAt,
      isHistorical: lesson.isManual,
      students: lesson.lessonStudents.map(({ student }) => student),
      status: 'BOOKED',
      statusLabel: new Date(lesson.lessonDate).getTime() < Date.now()
        ? '待补交考勤'
        : '已约课',
    })),
  })
})
