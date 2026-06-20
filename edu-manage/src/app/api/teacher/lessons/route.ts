import { NextRequest, NextResponse } from 'next/server'
import type { LessonStatus } from '@prisma/client'
import { requireCurrentTeacher, teacherLessonWhere } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
    const { teacher, prisma } = await requireCurrentTeacher()
    const { searchParams } = req.nextUrl
    const days = Math.min(30, Math.max(1, Number(searchParams.get('days') || 7)))
    const status = searchParams.get('status')
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - days)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setDate(now.getDate() + days)
    end.setHours(23, 59, 59, 999)

    const lessons = await prisma.classLesson.findMany({
      where: {
        ...teacherLessonWhere(teacher.id),
        lessonDate: { gte: start, lte: end },
        ...(status ? { status: status as LessonStatus } : { status: { not: 'CANCELLED' as const } }),
      },
      include: {
        group: {
          include: {
            course: true,
            room: true,
            enrollments: {
              where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
              include: { student: { select: { id: true, name: true, grade: true, gender: true, school: true } } },
            },
            teacherAssignments: { where: { teacherId: teacher.id } },
          },
        },
        attendances: true,
      },
      orderBy: [{ lessonDate: 'desc' }, { startTime: 'asc' }],
    })

    return NextResponse.json(lessons.map((lesson) => ({
      id: lesson.id,
      lessonDate: lesson.lessonDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      status: lesson.status,
      subject: lesson.group.teacherAssignments[0]?.subject || lesson.subject || lesson.group.course.subject,
      groupName: lesson.group.name,
      courseName: lesson.group.course.name,
      courseType: lesson.group.course.type,
      room: lesson.group.room?.name || '-',
      studentCount: lesson.group.enrollments.length,
      attendanceCount: lesson.attendances.length,
      oneOnOneStudentName: lesson.group.course.type === 'ONE_ON_ONE'
        ? lesson.group.enrollments[0]?.student?.name || ''
        : '',
      students: lesson.group.enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        ...enrollment.student,
        remainHours: enrollment.remainHours,
        totalHours: enrollment.totalHours,
      })),
    })))
})
