import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    const {
      title, teacherId, roomId, startDate, startTimeVal, endTimeVal,
      status, color, notes, classType, studentIds,
    } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (teacherId !== undefined) data.teacherId = teacherId
    if (roomId !== undefined) data.roomId = roomId || null
    if (status !== undefined) data.status = status
    if (color !== undefined) data.color = color
    if (notes !== undefined) data.notes = notes
    if (classType !== undefined) data.classType = classType

    let startTime: Date | undefined
    let endTime: Date | undefined

    if (startDate && startTimeVal) {
      startTime = new Date(`${startDate}T${startTimeVal}:00`)
      if (!isNaN(startTime.getTime())) data.startTime = startTime
    }
    if (startDate && endTimeVal) {
      endTime = new Date(`${startDate}T${endTimeVal}:00`)
      if (!isNaN(endTime.getTime())) data.endTime = endTime
    }

    if (startTime && endTime && endTime <= startTime) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }

    // Get current schedule for conflict check context
    const existing = await prisma.schedule.findUnique({
      where: { id },
      select: { teacherId: true, roomId: true, startTime: true, endTime: true },
    })
    if (!existing) return NextResponse.json({ error: '排课不存在' }, { status: 404 })

    const effectiveTeacherId = (teacherId as string) || existing.teacherId
    const effectiveRoomId = roomId !== undefined ? (roomId || null) : existing.roomId
    const effectiveStart = startTime || existing.startTime
    const effectiveEnd = endTime || existing.endTime

    if (effectiveEnd <= effectiveStart) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }

    // Check conflicts
    const conflicts = await checkScheduleConflicts({
      teacherId: effectiveTeacherId,
      roomId: effectiveRoomId,
      startTime: effectiveStart,
      endTime: effectiveEnd,
      excludeScheduleId: id,
    })

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

    // Sync students if studentIds provided
    if (studentIds !== undefined) {
      if (classType === 'ONE_ON_ONE' && studentIds.length !== 1) {
        return NextResponse.json({ error: '一对一课程必须且只能选择 1 名学生' }, { status: 400 })
      }
      if (classType === 'SMALL_CLASS' && studentIds.length === 0) {
        return NextResponse.json({ error: '小班课至少需要选择 1 名学生' }, { status: 400 })
      }
      // Delete old and create new
      await prisma.scheduleStudent.deleteMany({ where: { scheduleId: id } })
      if (studentIds.length > 0) {
        await prisma.scheduleStudent.createMany({
          data: studentIds.map((studentId: string) => ({ scheduleId: id, studentId })),
        })
      }
    }

    const s = await prisma.schedule.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, name: true } },
        room: { select: { id: true, name: true, type: true, usageType: true } },
        course: { select: { id: true, name: true, subject: true, type: true } },
        students: { include: { student: { select: { id: true, name: true } } } },
      },
    })

    revalidatePath('/schedule')
    return NextResponse.json(s)
  } catch {
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.schedule.update({ where: { id }, data: { status: 'cancelled' } })
  revalidatePath('/schedule')
  return NextResponse.json({ success: true })
}
