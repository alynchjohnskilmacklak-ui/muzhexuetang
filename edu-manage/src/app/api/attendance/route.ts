import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { AttStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const teacherId = searchParams.get('teacherId')
  const classType = searchParams.get('classType')

  const dayStart = new Date(`${dateStr}T00:00:00`)
  const dayEnd = new Date(`${dateStr}T23:59:59`)

  const where: Record<string, unknown> = {
    status: { not: 'cancelled' },
    startTime: { gte: dayStart, lte: dayEnd },
  }
  if (teacherId) where.teacherId = teacherId
  if (classType) where.classType = classType

  const schedules = await prisma.schedule.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, name: true, type: true, usageType: true } },
      course: { select: { id: true, name: true, subject: true, type: true } },
      students: {
        include: { student: { select: { id: true, name: true } } },
      },
      attendances: {
        select: { id: true, studentId: true, status: true },
      },
    },
    orderBy: { startTime: 'asc' },
  })

  const result = schedules.map((s) => {
    const allDone = s.students.length > 0 && s.students.every(
      (ss) => s.attendances.some((a) => a.studentId === ss.studentId)
    )
    return {
      id: s.id,
      title: s.title,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      status: s.status,
      classType: s.classType,
      color: s.color,
      teacherId: s.teacherId,
      teacherName: s.teacher.name,
      roomId: s.roomId,
      roomName: s.room?.name || '未分配',
      roomType: s.room?.type,
      roomUsageType: s.room?.usageType,
      courseName: s.course.name,
      courseSubject: s.course.subject,
      courseType: s.course.type,
      students: s.students.map((ss) => ({
        studentId: ss.studentId,
        studentName: ss.student.name,
      })),
      studentCount: s.students.length,
      attendances: s.attendances.map((a) => ({
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
