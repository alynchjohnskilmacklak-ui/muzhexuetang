import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { resolveTeacherForUser } from '@/lib/performance'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  const prisma = await getRequestPrisma()
  const userId = (session.user as { id?: string }).id

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const teacherIdParam = searchParams.get('teacherId')
  const classType = searchParams.get('classType')

  const dayStart = new Date(`${dateStr}T00:00:00`)
  const dayEnd = new Date(`${dateStr}T23:59:59`)

  const where: Record<string, unknown> = {
    status: { notIn: ['CANCELLED', 'POSTPONED'] },
    lessonDate: { gte: dayStart, lt: dayEnd },
  }

  // Role-based access control
  if (role === 'admin') {
    if (teacherIdParam) where.teacherId = teacherIdParam
    where.division = getRequestDivision(session.user as Record<string, unknown> | undefined, searchParams.get('division'))
  } else if (role === 'teacher') {
    const teacher = await resolveTeacherForUser(session.user as { id: string; email?: string | null; name?: string | null; role?: string | null }, prisma)
    if (!teacher) return NextResponse.json({ error: '未绑定教师身份' }, { status: 403 })
    where.teacherId = teacher.id
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (classType) where.group = { course: { type: classType } }

  const lessons = await prisma.classLesson.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true } },
      group: {
        include: {
          course: { select: { id: true, name: true, subject: true, type: true, color: true } },
          teacher: { select: { id: true, name: true } },
          room: { select: { id: true, name: true, type: true, usageType: true } },
          enrollments: {
            include: { student: { select: { id: true, name: true } } },
          },
        },
      },
      attendances: {
        select: { id: true, studentId: true, status: true },
      },
    },
    orderBy: { startTime: 'asc' },
  })

  const result = lessons.map((lesson) => {
    const enrollments = lesson.group.enrollments
    const allDone = enrollments.length > 0 && enrollments.every(
      (enr) => lesson.attendances.some((a) => a.studentId === enr.studentId)
    )
    const startTime = new Date(`${lesson.lessonDate.toISOString().slice(0, 10)}T${lesson.startTime}:00`)
    const endTime = new Date(`${lesson.lessonDate.toISOString().slice(0, 10)}T${lesson.endTime}:00`)
    return {
      id: lesson.id,
      title: lesson.group.name || lesson.group.course?.name || '-',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: lesson.status,
      classType: lesson.group.course?.type || null,
      color: lesson.group.course?.color || null,
      teacherId: lesson.teacherId,
      teacherName: lesson.teacher?.name || lesson.group.teacher?.name || '未分配',
      roomId: lesson.group.roomId,
      roomName: lesson.group.room?.name || '未分配',
      roomType: lesson.group.room?.type || null,
      roomUsageType: lesson.group.room?.usageType || null,
      courseName: lesson.group.course?.name || '-',
      courseSubject: lesson.group.course?.subject || '',
      courseType: lesson.group.course?.type || null,
      students: enrollments.map((enr) => ({
        studentId: enr.studentId,
        studentName: enr.student.name,
      })),
      studentCount: enrollments.length,
      attendances: lesson.attendances.map((a) => ({
        studentId: a.studentId,
        status: a.status,
      })),
      attendanceStatus: allDone ? 'done' : 'pending',
    }
  })

  return NextResponse.json(result)
})
