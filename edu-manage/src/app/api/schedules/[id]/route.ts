import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { checkScheduleConflict } from '@/lib/schedule-conflict'
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
      teacherId, roomId, startDate, startTimeVal, endTimeVal,
      status, notes, studentIds,
    } = body

    const existing = await prisma.classLesson.findUnique({
      where: { id },
      select: {
        teacherId: true,
        lessonDate: true,
        startTime: true,
        endTime: true,
        status: true,
        groupId: true,
        group: {
          select: {
            roomId: true,
            enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } },
          },
        },
      },
    })
    if (!existing) return NextResponse.json({ error: '课次不存在' }, { status: 404 })

    const effectiveTeacherId = teacherId || existing.teacherId
    const effectiveDate = startDate || existing.lessonDate.toISOString().slice(0, 10)
    const effectiveStart = startTimeVal || existing.startTime
    const effectiveEnd = endTimeVal || existing.endTime
    const effectiveStudentIds: string[] = Array.isArray(studentIds)
      ? [...new Set(studentIds)] as string[]
      : existing.group.enrollments.map(e => e.studentId)

    if (effectiveStart >= effectiveEnd) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }

    // Conflict check against ClassLesson
    const allConflicts: Array<{ type: string; lessonId: string; courseName: string; timeRange: string }> = []
    for (const sid of effectiveStudentIds.length > 0 ? effectiveStudentIds : [effectiveTeacherId]) {
      const conflicts = await checkScheduleConflict({
        teacherId: effectiveTeacherId,
        studentId: effectiveStudentIds.includes(sid) ? sid : undefined,
        roomId: roomId !== undefined ? (roomId || undefined) : (existing.group.roomId || undefined),
        date: effectiveDate,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        excludeLessonId: id,
      })
      for (const c of conflicts) {
        if (!allConflicts.some(e => e.lessonId === c.lessonId && e.type === c.type)) {
          allConflicts.push(c)
        }
      }
    }

    if (allConflicts.length > 0) {
      return NextResponse.json({ error: '时间冲突', conflicts: allConflicts }, { status: 409 })
    }

    const lesson = await prisma.$transaction(async (tx) => {
      // Update lesson fields
      const lessonData: Record<string, unknown> = {}
      if (teacherId !== undefined) lessonData.teacherId = teacherId
      if (status !== undefined) lessonData.status = status
      if (notes !== undefined) lessonData.note = notes
      if (startDate) lessonData.lessonDate = new Date(`${effectiveDate}T00:00:00`)
      if (startTimeVal !== undefined) lessonData.startTime = startTimeVal
      if (endTimeVal !== undefined) lessonData.endTime = endTimeVal

      // Update group room if provided
      if (roomId !== undefined) {
        await tx.classGroup.update({
          where: { id: existing.groupId },
          data: { roomId: roomId || null },
        })
      }

      // Sync enrollments if studentIds provided
      if (studentIds !== undefined) {
        const group = await tx.classGroup.findUnique({
          where: { id: existing.groupId },
          select: { id: true, maxStudents: true },
        })
        if (group) {
          await tx.enrollment.updateMany({
            where: { groupId: existing.groupId, status: 'ACTIVE' },
            data: { status: 'WITHDRAWN' },
          })
          for (const sid of effectiveStudentIds) {
            await tx.enrollment.upsert({
              where: { studentId_groupId: { studentId: sid, groupId: existing.groupId } },
              update: { status: 'ACTIVE' },
              create: { groupId: existing.groupId, studentId: sid, totalHours: 1, remainHours: 1, status: 'ACTIVE' },
            })
          }
          await tx.classGroup.update({
            where: { id: existing.groupId },
            data: { maxStudents: Math.max(group.maxStudents, effectiveStudentIds.length) },
          })
        }
      }

      return tx.classLesson.update({
        where: { id },
        data: lessonData,
        include: {
          group: {
            include: {
              course: { select: { id: true, name: true, subject: true, type: true } },
              teacher: { select: { id: true, name: true } },
              room: { select: { id: true, name: true } },
              enrollments: { where: { status: 'ACTIVE' }, include: { student: { select: { id: true, name: true } } } },
            },
          },
          teacher: { select: { id: true, name: true } },
        },
      })
    })

    revalidatePath('/schedule')
    revalidatePath('/teacher/schedule')
    return NextResponse.json({ success: true, lesson })
  } catch (e: any) {
    if (e?.status) {
      const body: Record<string, unknown> = { error: e.message }
      if (e.conflicts) body.conflicts = e.conflicts
      return NextResponse.json(body, { status: e.status })
    }
    console.error('[schedules:update]', e)
    return NextResponse.json({ error: '更新课次失败' }, { status: 500 })
  }
}

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const { id } = await params
  const existing = await prisma.classLesson.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: '课次不存在' }, { status: 404 })
  await prisma.classLesson.update({ where: { id }, data: { status: 'CANCELLED' } })
  revalidatePath('/schedule')
  revalidatePath('/teacher/schedule')
  return NextResponse.json({ success: true })
})
