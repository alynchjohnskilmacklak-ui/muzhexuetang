import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { resolveTeacherForUser } from '@/lib/performance'
import { AttStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
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
  } else if (role === 'teacher') {
    const teacher = await resolveTeacherForUser(session.user as { id: string; email?: string | null; name?: string | null; role?: string | null })
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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { scheduleId, records } = body as {
      scheduleId: string
      records: { studentId: string; status: string; notes?: string }[]
    }

    if (!scheduleId || !records?.length) {
      return NextResponse.json({ error: '缺少排课ID或考勤记录' }, { status: 400 })
    }

    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, status: { not: 'cancelled' } },
      include: {
        students: true,
      },
    })
    if (!schedule) return NextResponse.json({ error: '排课不存在或已取消' }, { status: 404 })

    const statusMap: Record<string, AttStatus> = {
      present: AttStatus.PRESENT,
      leave: AttStatus.LEAVE,
      absent: AttStatus.ABSENT,
      late: AttStatus.PRESENT,
    }
    const validStatuses = Object.keys(statusMap)
    for (const rec of records) {
      if (!validStatuses.includes(rec.status)) {
        return NextResponse.json({ error: `无效的考勤状态: ${rec.status}` }, { status: 400 })
      }
    }

    const validStudentIds = schedule.students.map((s) => s.studentId)
    for (const rec of records) {
      if (!validStudentIds.includes(rec.studentId)) {
        return NextResponse.json({ error: `学生 ${rec.studentId} 不在本课程中` }, { status: 400 })
      }
    }

    // Upsert each record
    for (const rec of records) {
      const status = statusMap[rec.status]
      await prisma.attendance.upsert({
        where: {
          scheduleId_studentId: {
            scheduleId,
            studentId: rec.studentId,
          },
        },
        update: {
          status,
        },
        create: {
          scheduleId,
          studentId: rec.studentId,
          status,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[attendance:submit]', e)
    return NextResponse.json({ error: '考勤保存失败' }, { status: 500 })
  }
}
