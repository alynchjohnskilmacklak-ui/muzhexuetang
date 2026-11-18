import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { checkScheduleConflict } from '@/lib/schedule-conflict'
import { apiHandler } from '@/lib/api-handler'
import { intensiveStudentCountError, toIntensiveTeachingType } from '@/lib/intensive-class'
import { isClassLessonInActiveTerm } from '@/lib/admin-term-scope'
import { getCurrentUser } from '@/lib/get-user'
import { cancelScheduledLesson, CancelLessonError } from '@/lib/cancel-class-lesson'
import { chinaClock } from '@/lib/enrollment-subject-change'
import { getLocalDayRange, localDateColumnValue, localDateKey } from '@/lib/date/local-day'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const { id } = await params
  const prisma = await getRequestPrisma()

  try {
    if (!await isClassLessonInActiveTerm(prisma, id)) {
      return NextResponse.json({ error: '历史批次只允许查看，不能修改排课' }, { status: 409 })
    }
    const body = await req.json()
    const {
      teacherId, roomId, startDate, startTimeVal, endTimeVal,
      status, notes, studentIds,
    } = body

    const existing = await prisma.classLesson.findUnique({
      where: { id },
      select: {
        division: true,
        teacherId: true,
        subject: true,
        lessonDate: true,
        startTime: true,
        endTime: true,
        status: true,
        groupId: true,
        lessonStudents: { select: { studentId: true } },
        group: {
          select: {
            termId: true,
            roomId: true,
            intensiveMode: true,
            teachingType: true,
            enrollments: { where: { status: 'ACTIVE', deletedAt: null }, select: { studentId: true, subjects: true } },
          },
        },
      },
    })
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
    if (!existing || existing.division !== user.division) return NextResponse.json({ error: '课次不存在' }, { status: 404 })
    if (status === 'CANCELLED') {
      try {
        const cancelled = await cancelScheduledLesson(prisma, {
          lessonId: id, division: user.division, operatorId: user.id,
          reason: typeof body.cancelReason === 'string' ? body.cancelReason : '',
        })
        revalidatePath('/schedule')
        revalidatePath('/teacher/schedule')
        revalidatePath('/parent/schedule')
        return NextResponse.json(cancelled)
      } catch (error) {
        if (error instanceof CancelLessonError) return NextResponse.json({ error: error.message }, { status: error.status })
        throw error
      }
    }
    if (status !== undefined && status !== existing.status) {
      return NextResponse.json({ error: '课次状态须通过考勤或专门的停课流程调整' }, { status: 400 })
    }
    if (existing.status !== 'SCHEDULED') {
      return NextResponse.json({ error: '只能调整尚未开始的待上课课次' }, { status: 409 })
    }
    const clock = chinaClock(new Date())
    const originalDay = localDateKey(existing.lessonDate)
    if (originalDay < clock.day || (originalDay === clock.day && existing.startTime <= clock.time)) {
      return NextResponse.json({ error: '已开始或已过去的课次不能直接调课' }, { status: 409 })
    }
    if (studentIds !== undefined && existing.group.intensiveMode !== 'INTENSIVE') {
      return NextResponse.json({ error: '精品班学员名单请在班级学员管理中调整，不能通过调课覆盖报名' }, { status: 400 })
    }
    if (roomId !== undefined && roomId !== existing.group.roomId && existing.group.intensiveMode !== 'INTENSIVE') {
      return NextResponse.json({ error: '此入口仅调整本次课；更换整班教室请在班级管理中操作' }, { status: 400 })
    }

    const effectiveTeacherId = teacherId || existing.teacherId
    const effectiveDate = startDate || originalDay
    const effectiveStart = startTimeVal || existing.startTime
    const effectiveEnd = endTimeVal || existing.endTime
    const effectiveStudentIds: string[] = Array.isArray(studentIds)
      ? [...new Set(studentIds)] as string[]
      : existing.group.intensiveMode === 'INTENSIVE'
        ? existing.lessonStudents.map((item) => item.studentId)
        : existing.lessonStudents.length
          ? existing.lessonStudents.map((item) => item.studentId)
          : existing.group.enrollments.filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, existing.subject)).map((enrollment) => enrollment.studentId)

    const intensiveTeachingType = toIntensiveTeachingType(existing.group.teachingType)
    if (existing.group.intensiveMode === 'INTENSIVE' && intensiveTeachingType) {
      const countError = intensiveStudentCountError(intensiveTeachingType, effectiveStudentIds.length)
      if (countError) return NextResponse.json({ error: countError }, { status: 400 })
    }

    if (effectiveStart >= effectiveEnd) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }
    let targetDate: Date
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) throw new Error('invalid date')
      if (localDateKey(getLocalDayRange(effectiveDate).start) !== effectiveDate) throw new Error('invalid date')
      targetDate = localDateColumnValue(effectiveDate)
    } catch {
      return NextResponse.json({ error: '排课日期不正确' }, { status: 400 })
    }
    if (effectiveDate < clock.day || (effectiveDate === clock.day && effectiveStart <= clock.time)) {
      return NextResponse.json({ error: '只能将课次调整到尚未开始的时段' }, { status: 400 })
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
        termId: existing.group.termId || undefined,
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
      const activeTeacher = effectiveTeacherId && await tx.teacher.findFirst({
        where: { id: effectiveTeacherId, division: existing.division, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!activeTeacher) throw { status: 400, message: '请选择当前学部的在职教师' }

      // Update lesson fields
      const lessonData: Record<string, unknown> = {}
      if (teacherId !== undefined) lessonData.teacherId = teacherId
      if (status !== undefined) lessonData.status = status
      if (notes !== undefined) lessonData.note = notes
      if (startDate) lessonData.lessonDate = targetDate
      if (startTimeVal !== undefined) lessonData.startTime = startTimeVal
      if (endTimeVal !== undefined) lessonData.endTime = endTimeVal
      if (existing.group.intensiveMode === 'INTENSIVE' && (startTimeVal !== undefined || endTimeVal !== undefined)) {
        const [sh, sm] = effectiveStart.split(':').map(Number)
        const [eh, em] = effectiveEnd.split(':').map(Number)
        lessonData.plannedMinutes = (eh * 60 + em) - (sh * 60 + sm)
      }

      // Update group room if provided
      if (roomId !== undefined) {
        await tx.classGroup.update({
          where: { id: existing.groupId },
          data: { roomId: roomId || null },
        })
      }

      // Sync enrollments if studentIds provided
      if (studentIds !== undefined) {
        if (existing.group.intensiveMode === 'INTENSIVE') {
          for (const sid of effectiveStudentIds) {
            await tx.enrollment.upsert({
              where: { studentId_groupId: { studentId: sid, groupId: existing.groupId } },
              update: { status: 'ACTIVE' },
              create: { groupId: existing.groupId, studentId: sid, totalHours: 0, remainHours: 0, status: 'ACTIVE' },
            })
          }
          await tx.classLessonStudent.deleteMany({ where: { lessonId: id } })
          await tx.classLessonStudent.createMany({
            data: effectiveStudentIds.map((studentId) => ({ lessonId: id, studentId })),
            skipDuplicates: true,
          })
        } else {
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
  } catch (e: unknown) {
    const routeError = e as { status?: number; message?: string; conflicts?: unknown }
    if (routeError.status) {
      const body: Record<string, unknown> = { error: routeError.message }
      if (routeError.conflicts) body.conflicts = routeError.conflicts
      return NextResponse.json(body, { status: routeError.status })
    }
    console.error('[schedules:update]', e)
    return NextResponse.json({ error: '更新课次失败' }, { status: 500 })
  }
}

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  try {
    const cancelled = await cancelScheduledLesson(prisma, {
      lessonId: id, division: user.division, operatorId: user.id,
      reason: typeof body.reason === 'string' ? body.reason : '',
    })
    revalidatePath('/schedule')
    revalidatePath('/teacher/schedule')
    revalidatePath('/parent/schedule')
    return NextResponse.json(cancelled)
  } catch (error) {
    if (error instanceof CancelLessonError) return NextResponse.json({ error: error.message }, { status: error.status })
    throw error
  }
})
