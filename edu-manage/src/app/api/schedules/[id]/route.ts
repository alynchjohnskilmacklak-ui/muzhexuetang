import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { validateScheduleStudentCount } from '@/lib/schedule-class-type'
import { checkScheduleConflicts } from '@/lib/schedule-conflicts'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
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

    // Get current schedule for context
    const existing = await prisma.schedule.findUnique({
      where: { id },
      select: {
        teacherId: true,
        roomId: true,
        startTime: true,
        endTime: true,
        classType: true,
        students: { select: { studentId: true } },
      },
    })
    if (!existing) return NextResponse.json({ error: '排课不存在' }, { status: 404 })

    const effectiveTeacherId = (teacherId as string) || existing.teacherId
    const effectiveRoomId = roomId !== undefined ? (roomId || null) : existing.roomId
    const effectiveStart = startTime || existing.startTime
    const effectiveEnd = endTime || existing.endTime
    const effectiveClassType = (classType as string | undefined) || existing.classType || 'SMALL_CLASS'
    const effectiveStudentIds = Array.isArray(studentIds)
      ? [...new Set(studentIds)] as string[]
      : existing.students.map(s => s.studentId)

    if (effectiveEnd <= effectiveStart) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }

    const room = effectiveRoomId
      ? await prisma.room.findUnique({ where: { id: effectiveRoomId }, select: { capacity: true } })
      : null
    const studentCountError = validateScheduleStudentCount({
      classType: effectiveClassType,
      studentCount: effectiveStudentIds.length,
      roomCapacity: room?.capacity,
    })
    if (studentCountError) {
      return NextResponse.json({ error: studentCountError }, { status: 400 })
    }

    const s = await prisma.$transaction(async (tx) => {
      // Re-check conflicts inside transaction
      const conflicts = await checkScheduleConflicts({
        teacherId: effectiveTeacherId,
        roomId: effectiveRoomId,
        studentIds: effectiveStudentIds,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        excludeScheduleId: id,
        tx,
      })

      if (conflicts.length > 0) {
        const teacherConflicts = conflicts.filter(c => c.type === 'teacher')
        const roomConflicts = conflicts.filter(c => c.type === 'room')
        const studentConflicts = conflicts.filter(c => c.type === 'student')

        let errorMsg = ''
        if (teacherConflicts.length > 0) {
          errorMsg = '该老师在此时间段已有课程，不能安排'
        } else if (studentConflicts.length > 0) {
          errorMsg = '有学员在此时间段已有排课'
        } else if (roomConflicts.length > 0) {
          errorMsg = '该教室在此时间段已被占用'
        }

        throw { status: 409, message: errorMsg, conflicts }
      }

      // Sync students if studentIds provided
      if (studentIds !== undefined) {
        await tx.scheduleStudent.deleteMany({ where: { scheduleId: id } })
        if (effectiveStudentIds.length > 0) {
          await tx.scheduleStudent.createMany({
            data: effectiveStudentIds.map((sid: string) => ({ scheduleId: id, studentId: sid })),
            skipDuplicates: true,
          })
        }
      }

      return tx.schedule.update({
        where: { id },
        data,
        include: {
          teacher: { select: { id: true, name: true } },
          room: { select: { id: true, name: true, type: true, usageType: true } },
          course: { select: { id: true, name: true, subject: true, type: true } },
          students: { include: { student: { select: { id: true, name: true } } } },
        },
      })
    })

    revalidatePath('/schedule')
    return NextResponse.json(s)
  } catch (e: any) {
    if (e?.status) {
      const body: Record<string, unknown> = { error: e.message }
      if (e.conflicts) body.conflicts = e.conflicts
      return NextResponse.json(body, { status: e.status })
    }
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const { id } = await params
  const existing = await prisma.schedule.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: '排课不存在' }, { status: 404 })
  await prisma.schedule.update({ where: { id }, data: { status: 'cancelled' } })
  revalidatePath('/schedule')
  return NextResponse.json({ success: true })
})
