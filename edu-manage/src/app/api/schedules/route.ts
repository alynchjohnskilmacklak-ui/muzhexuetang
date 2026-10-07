import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { validateScheduleStudentCount } from '@/lib/schedule-class-type'
import { checkScheduleConflict } from '@/lib/schedule-conflict'
import { apiHandler } from '@/lib/api-handler'
import { normalizeWritableDivision } from '@/lib/division'
import { intensiveStudentCountError, toIntensiveTeachingType } from '@/lib/intensive-class'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'
import { getRequestDivision } from '@/lib/division'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

function calcLessonMinutes(startTimeVal: string, endTimeVal: string) {
  const [sh, sm] = startTimeVal.split(':').map(Number)
  const [eh, em] = endTimeVal.split(':').map(Number)
  return Math.max(30, (eh * 60 + em) - (sh * 60 + sm))
}

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()

  try {
    const body = await req.json()
    const {
      title, courseId, teacherId, roomId,
      startDate, startTimeVal, endTimeVal,
      notes, classType, studentIds,
      classGroupId,
    } = body

    if (!title || !teacherId || !startDate || !startTimeVal || !endTimeVal) {
      return NextResponse.json({ error: '缺少必填字段（标题、教师、日期、时间）' }, { status: 400 })
    }

    if (isNaN(new Date(`${startDate}T00:00:00`).getTime())) {
      return NextResponse.json({ error: '日期格式无效' }, { status: 400 })
    }
    if (!/^\d{2}:\d{2}$/.test(startTimeVal) || !/^\d{2}:\d{2}$/.test(endTimeVal)) {
      return NextResponse.json({ error: '时间格式无效' }, { status: 400 })
    }
    if (startTimeVal >= endTimeVal) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }

    // 课程必须前端明确指定
    if (!courseId) {
      return NextResponse.json({ error: '请先选择课程' }, { status: 400 })
    }

    const requestedDivision = normalizeWritableDivision(body.division)
    const selectedTerm = await resolveAdminTermScope(
      prisma,
      getRequestDivision(session.user as Record<string, unknown>, requestedDivision),
      req,
    )
    if (!selectedTerm || selectedTerm.status !== 'ACTIVE') {
      return NextResponse.json({ error: '历史批次只允许查看，请切换到当前运营批次后再排课' }, { status: 409 })
    }

    const dedupedStudentIds = [...new Set(Array.isArray(studentIds) ? studentIds : [])] as string[]
    const intensiveTeachingType = toIntensiveTeachingType(classType)
    const room = roomId
      ? await prisma.room.findUnique({ where: { id: roomId }, select: { capacity: true } })
      : null
    const studentCountError = validateScheduleStudentCount({
      classType: classType || 'SMALL_CLASS',
      studentCount: dedupedStudentIds.length,
      roomCapacity: room?.capacity,
    })
    if (studentCountError) {
      return NextResponse.json({ error: studentCountError }, { status: 400 })
    }
    if (intensiveTeachingType) {
      const intensiveCountError = intensiveStudentCountError(intensiveTeachingType, dedupedStudentIds.length)
      if (intensiveCountError) {
        return NextResponse.json({ error: intensiveCountError }, { status: 400 })
      }
    }

    const collectConflicts = async (client?: Parameters<typeof checkScheduleConflict>[1]) => {
      const found: Array<{ type: string; lessonId: string; courseName: string; timeRange: string; roomName?: string }> = []
      for (const sid of dedupedStudentIds.length > 0 ? dedupedStudentIds : [teacherId /* placeholder for studentless check */]) {
        const isStudentCheck = dedupedStudentIds.includes(sid)
        const conflicts = await checkScheduleConflict({
          teacherId,
          studentId: isStudentCheck ? sid : undefined,
          roomId: intensiveTeachingType ? undefined : roomId || undefined,
          date: startDate,
          startTime: startTimeVal,
          endTime: endTimeVal,
          termId: selectedTerm.id,
        }, client)
        for (const conflict of conflicts) {
          if (!found.some(existing => existing.lessonId === conflict.lessonId && existing.type === conflict.type)) {
            found.push(conflict)
          }
        }
      }
      return found
    }

    // Fast feedback before entering the serializable write transaction.
    const allConflicts = await collectConflicts()
    if (allConflicts.length > 0) {
      const details = allConflicts.map(c => {
        const typeMap: Record<string, string> = { teacher: '教师冲突', room: '教室冲突', student: '学生冲突' }
        return `${typeMap[c.type] || c.type}：${c.courseName} (${c.timeRange})${c.roomName ? ` @${c.roomName}` : ''}`
      })
      return NextResponse.json({
        error: `排课冲突：${details.join('；')}`,
        conflicts: allConflicts,
        details,
      }, { status: 409 })
    }

    const lessonMinutes = calcLessonMinutes(startTimeVal, endTimeVal)
    const lessonDate = new Date(`${startDate}T00:00:00`)

    const createSchedule = () => prisma.$transaction(async (tx) => {
      // Repeat the conflict check in the same serializable transaction as the
      // write. Concurrent schedulers will force one transaction to retry.
      const transactionConflicts = await collectConflicts(tx)
      if (transactionConflicts.length > 0) {
        const typeMap: Record<string, string> = { teacher: '教师冲突', room: '教室冲突', student: '学生冲突' }
        const details = transactionConflicts.map(conflict =>
          `${typeMap[conflict.type] || conflict.type}：${conflict.courseName} (${conflict.timeRange})${conflict.roomName ? ` @${conflict.roomName}` : ''}`
        )
        throw { status: 409, message: `排课冲突：${details.join('；')}`, conflicts: transactionConflicts }
      }

      // Validate the course and teacher again inside the write transaction.
      const course = await tx.course.findFirst({
        where: { id: courseId, isActive: true },
        select: { id: true, name: true, division: true },
      })
      if (!course) throw { status: 400, message: '所选课程不存在或已停用' }
      const lessonDivision = normalizeWritableDivision(course.division, requestedDivision)
      if (lessonDivision !== getRequestDivision(session.user as Record<string, unknown>, requestedDivision)) {
        throw { status: 400, message: '课程学部与当前运营批次不一致' }
      }
      const teacher = await tx.teacher.findFirst({
        where: { id: teacherId, division: lessonDivision, status: 'ACTIVE' },
        select: { id: true, name: true },
      })
      if (!teacher) throw { status: 400, message: '请选择当前学部的在职教师' }

      // 使用已有 ClassGroup 或创建新班级（不再用"临时"前缀污染班级列表）
      const groupName = body.groupName || `${course.name}·${teacher.name}·${startDate}`
      let group = classGroupId
        ? await tx.classGroup.findFirst({ where: { id: classGroupId, termId: selectedTerm.id, status: { not: 'ARCHIVED' } } })
        : await tx.classGroup.findFirst({
            where: {
              name: groupName,
              teacherId,
              courseId,
              status: { not: 'ARCHIVED' },
              division: lessonDivision,
              intensiveMode: intensiveTeachingType ? 'INTENSIVE' : 'NORMAL',
              termId: selectedTerm.id,
            },
          })
      if (group && intensiveTeachingType && (group.intensiveMode !== 'INTENSIVE' || group.teachingType !== intensiveTeachingType)) {
        throw { status: 400, message: '所选班级与突击班类型不一致' }
      }
      if (!group) {
        group = await tx.classGroup.create({
          data: {
            name: groupName,
            courseId,
            teacherId,
            roomId: intensiveTeachingType ? null : roomId || null,
            maxStudents: Math.max(1, dedupedStudentIds.length),
            startDate: lessonDate,
            totalLessons: 1,
            lessonStartTime: startTimeVal,
            lessonMinutes,
            recurringDays: [],
            status: 'ACTIVE',
            division: lessonDivision,
            intensiveMode: intensiveTeachingType ? 'INTENSIVE' : 'NORMAL',
            teachingType: intensiveTeachingType,
            termId: selectedTerm.id,
          },
        })
      } else if (!intensiveTeachingType && roomId && group.roomId !== roomId) {
        // 复用已有 group 但教室不同时，更新为本次值
        await tx.classGroup.update({ where: { id: group.id }, data: { roomId } })
      }

      // Create enrollment relationship only (no fake hour purchase)
      for (const studentId of dedupedStudentIds) {
        const existing = await tx.enrollment.findFirst({
          where: { groupId: group.id, studentId },
        })
        if (!existing) {
          await tx.enrollment.create({
            data: {
              groupId: group.id,
              studentId,
              totalHours: 0,
              remainHours: 0,
              status: 'ACTIVE',
            },
          })
        }
      }

      // Create ClassLesson
      const lesson = await tx.classLesson.create({
        data: {
          groupId: group.id,
          teacherId,
          lessonDate,
          startTime: startTimeVal,
          endTime: endTimeVal,
          status: 'SCHEDULED',
          note: notes || null,
          division: lessonDivision,
          isManual: intensiveTeachingType ? true : undefined,
          plannedMinutes: intensiveTeachingType ? lessonMinutes : null,
          intensiveReviewStatus: intensiveTeachingType ? 'DRAFT' : 'NOT_REQUIRED',
        },
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

      if (intensiveTeachingType && dedupedStudentIds.length) {
        await tx.classLessonStudent.createMany({
          data: dedupedStudentIds.map((studentId) => ({ lessonId: lesson.id, studentId })),
          skipDuplicates: true,
        })
      }

      return lesson
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    let result: Awaited<ReturnType<typeof createSchedule>> | undefined
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        result = await createSchedule()
        break
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    if (!result) throw new Error('SCHEDULE_TRANSACTION_RETRY_EXHAUSTED')

    revalidatePath('/schedule')
    revalidatePath('/teacher/schedule')

    return NextResponse.json({ success: true, id: result.id, lesson: result }, { status: 201 })
  } catch (e: unknown) {
    const routeError = e as { status?: number; message?: string; conflicts?: unknown }
    if (routeError.status) {
      const body: Record<string, unknown> = { error: routeError.message }
      if (routeError.conflicts) body.conflicts = routeError.conflicts
      return NextResponse.json(body, { status: routeError.status })
    }
    console.error('[schedules:create]', e)
    return NextResponse.json({ error: '创建排课失败' }, { status: 500 })
  }
})
