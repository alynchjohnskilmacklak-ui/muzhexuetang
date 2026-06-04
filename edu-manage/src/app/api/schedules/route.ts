import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { activeCourseWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { validateScheduleStudentCount } from '@/lib/schedule-class-type'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('startDate')
  const end = searchParams.get('endDate')
  const teacherId = searchParams.get('teacherId')
  const classType = searchParams.get('classType')
  const includeCancelled = searchParams.get('includeCancelled') === 'true'

  const where: Record<string, unknown> = {}
  if (!includeCancelled) {
    where.status = { not: 'cancelled' }
  }
  where.course = activeCourseWhere
  if (teacherId) where.teacherId = teacherId
  if (classType) where.classType = classType

  if (start || end) {
    where.startTime = {}
    if (start) (where.startTime as Record<string, unknown>).gte = new Date(start)
    if (end) (where.startTime as Record<string, unknown>).lte = new Date(end)
  }

  const schedules = await prisma.schedule.findMany({
    where,
    include: {
      course: { select: { id: true, name: true, subject: true, type: true } },
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, name: true, type: true, usageType: true } },
      students: {
        where: { student: visibleStudentWhere },
        include: { student: { select: { id: true, name: true } } },
      },
      attendances: {
        select: { id: true, studentId: true, status: true },
      },
    },
    orderBy: { startTime: 'asc' },
  })

  return NextResponse.json(schedules)
})

async function checkScheduleConflicts({
  teacherId,
  roomId,
  startTime,
  endTime,
  excludeScheduleId,
}: {
  teacherId: string
  roomId?: string | null
  startTime: Date
  endTime: Date
  excludeScheduleId?: string
}) {
  const conflicts: Array<{
    id: string
    title: string
    startTime: string
    endTime: string
    teacherName: string
    roomName?: string
    type: 'teacher' | 'room'
  }> = []

  const teacherSchedules = await prisma.schedule.findMany({
    where: {
      teacherId,
      status: { not: 'cancelled' },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
    },
    include: {
      teacher: { select: { name: true } },
      room: { select: { name: true } },
    },
  })

  for (const s of teacherSchedules) {
    conflicts.push({
      id: s.id,
      title: s.title,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      teacherName: s.teacher.name,
      roomName: s.room?.name || undefined,
      type: 'teacher',
    })
  }

  if (roomId) {
    const roomSchedules = await prisma.schedule.findMany({
      where: {
        roomId,
        status: { not: 'cancelled' },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
      },
      include: {
        teacher: { select: { name: true } },
        room: { select: { name: true } },
      },
    })

    for (const s of roomSchedules) {
      if (!conflicts.some(c => c.id === s.id)) {
        conflicts.push({
          id: s.id,
          title: s.title,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          teacherName: s.teacher.name,
          roomName: s.room?.name || undefined,
          type: 'room',
        })
      }
    }
  }

  return conflicts
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      title, courseId, teacherId, roomId,
      startDate, startTimeVal, endTimeVal,
      isRecurring, recurrence, color, notes,
      classType, studentIds,
    } = body

    if (!title || !teacherId || !startDate || !startTimeVal || !endTimeVal) {
      return NextResponse.json({ error: '缺少必填字段（标题、教师、日期、时间）' }, { status: 400 })
    }

    const startTime = new Date(`${startDate}T${startTimeVal}:00`)
    const endTime = new Date(`${startDate}T${endTimeVal}:00`)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json({ error: '时间格式无效' }, { status: 400 })
    }
    if (endTime <= startTime) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }

    const normalizedStudentIds = Array.isArray(studentIds) ? studentIds : []
    const room = roomId
      ? await prisma.room.findUnique({ where: { id: roomId }, select: { capacity: true } })
      : null
    const studentCountError = validateScheduleStudentCount({
      classType: classType || 'SMALL_CLASS',
      studentCount: normalizedStudentIds.length,
      roomCapacity: room?.capacity,
    })
    if (studentCountError) {
      return NextResponse.json({ error: studentCountError }, { status: 400 })
    }

    // Check teacher and room conflicts
    const conflicts = await checkScheduleConflicts({ teacherId, roomId, startTime, endTime })
    if (conflicts.length > 0) {
      const teacherConflicts = conflicts.filter(c => c.type === 'teacher')
      const roomConflicts = conflicts.filter(c => c.type === 'room')

      let errorMsg = ''
      if (teacherConflicts.length > 0) {
        errorMsg = '该老师在此时间段已有课程，不能安排'
      } else if (roomConflicts.length > 0) {
        errorMsg = '该教室在此时间段已被占用'
      }

      return NextResponse.json(
        { error: errorMsg, conflicts },
        { status: 409 }
      )
    }

    // Ensure course exists or create a placeholder reference
    let resolvedCourseId = courseId
    if (!resolvedCourseId) {
      const defaultCourse = await prisma.course.findFirst({ where: { isActive: true }, select: { id: true } })
      if (!defaultCourse) {
        const newCourse = await prisma.course.create({
          data: {
            name: title,
            subject: '其他',
            teacherId,
          },
        })
        resolvedCourseId = newCourse.id
      } else {
        resolvedCourseId = defaultCourse.id
      }
    }

    const schedule = await prisma.schedule.create({
      data: {
        title,
        courseId: resolvedCourseId,
        teacherId,
        roomId: roomId || null,
        startTime,
        endTime,
        isRecurring: isRecurring || false,
        recurrence: recurrence || null,
        color: color || null,
        notes: notes || null,
        classType: classType || 'SMALL_CLASS',
        students: normalizedStudentIds.length > 0
          ? { create: normalizedStudentIds.map((studentId: string) => ({ studentId })) }
          : undefined,
      },
      include: {
        teacher: { select: { id: true, name: true } },
        room: { select: { id: true, name: true, type: true, usageType: true } },
        course: { select: { id: true, name: true, subject: true, type: true } },
        students: { include: { student: { select: { id: true, name: true } } } },
      },
    })

    revalidatePath('/schedule')
    return NextResponse.json(schedule, { status: 201 })
  } catch (e) {
    console.error('[schedules:create]', e)
    return NextResponse.json({ error: '创建排课失败' }, { status: 500 })
  }
}
