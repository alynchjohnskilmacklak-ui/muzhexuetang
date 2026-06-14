import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { validateScheduleStudentCount } from '@/lib/schedule-class-type'
import { checkScheduleConflict } from '@/lib/schedule-conflict'
import { apiHandler } from '@/lib/api-handler'
import { normalizeWritableDivision } from '@/lib/division'

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

  try {
    const body = await req.json()
    const {
      title, courseId, teacherId, roomId,
      startDate, startTimeVal, endTimeVal,
      color, notes, classType, studentIds,
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

    const dedupedStudentIds = [...new Set(Array.isArray(studentIds) ? studentIds : [])] as string[]
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

    // Pre-transaction conflict check against ClassLesson
    const allConflicts: Array<{ type: string; lessonId: string; courseName: string; timeRange: string; roomName?: string }> = []
    for (const sid of dedupedStudentIds.length > 0 ? dedupedStudentIds : [teacherId /* placeholder for studentless check */]) {
      const isStudentCheck = dedupedStudentIds.includes(sid)
      const conflicts = await checkScheduleConflict({
        teacherId,
        studentId: isStudentCheck ? sid : undefined,
        roomId: roomId || undefined,
        date: startDate,
        startTime: startTimeVal,
        endTime: endTimeVal,
      })
      for (const c of conflicts) {
        if (!allConflicts.some(e => e.lessonId === c.lessonId && e.type === c.type)) {
          allConflicts.push(c)
        }
      }
    }

    if (allConflicts.length > 0) {
      const teacherConflicts = allConflicts.filter(c => c.type === 'teacher')
      const roomConflicts = allConflicts.filter(c => c.type === 'room')
      const studentConflicts = allConflicts.filter(c => c.type === 'student')

      let errorMsg = ''
      if (teacherConflicts.length > 0) {
        errorMsg = '该老师在此时间段已有课程，不能安排'
      } else if (studentConflicts.length > 0) {
        errorMsg = '有学员在此时间段已有排课'
      } else if (roomConflicts.length > 0) {
        errorMsg = '该教室在此时间段已被占用'
      }

      return NextResponse.json({
        error: errorMsg,
        conflicts: allConflicts,
      }, { status: 409 })
    }

    const lessonMinutes = calcLessonMinutes(startTimeVal, endTimeVal)
    const lessonDate = new Date(`${startDate}T00:00:00`)

    const result = await prisma.$transaction(async (tx) => {
      // Verify course + teacher exist
      const course = await tx.course.findFirst({
        where: { id: courseId, isActive: true },
        select: { id: true, name: true, division: true },
      })
      if (!course) throw { status: 400, message: '所选课程不存在或已停用' }
      const lessonDivision = normalizeWritableDivision(course.division, requestedDivision)
      const teacher = await tx.teacher.findUnique({
        where: { id: teacherId },
        select: { id: true, name: true },
      })
      if (!teacher) throw { status: 400, message: '教师不存在' }

      // key 加入开始时间和班型，确保同一天同老师同课程的不同课次不会被错误合并到一个班
      const groupName = `临时·${teacher.name}·${course.name}·${startDate} ${startTimeVal}·${classType || 'SMALL_CLASS'}`
      let group = await tx.classGroup.findFirst({
        where: { name: groupName, teacherId, courseId, status: 'ACTIVE', division: lessonDivision },
      })
      if (!group) {
        group = await tx.classGroup.create({
          data: {
            name: groupName,
            courseId,
            teacherId,
            roomId: roomId || null,
            maxStudents: Math.max(1, dedupedStudentIds.length),
            startDate: lessonDate,
            totalLessons: 1,
            lessonStartTime: startTimeVal,
            lessonMinutes,
            recurringDays: [],
            status: 'ACTIVE',
            division: lessonDivision,
          },
        })
      } else if (roomId && group.roomId !== roomId) {
        // 复用已有 group 但教室不同时，更新为本次值
        await tx.classGroup.update({ where: { id: group.id }, data: { roomId } })
      }

      // Ensure enrollments for all students
      for (const studentId of dedupedStudentIds) {
        const existing = await tx.enrollment.findFirst({
          where: { groupId: group.id, studentId, status: 'ACTIVE' },
        })
        if (!existing) {
          await tx.enrollment.create({
            data: {
              groupId: group.id,
              studentId,
              totalHours: 1,
              remainHours: 1,
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

      return lesson
    })

    revalidatePath('/schedule')
    revalidatePath('/teacher/schedule')

    return NextResponse.json({ success: true, id: result.id, lesson: result }, { status: 201 })
  } catch (e: any) {
    if (e?.status) {
      const body: Record<string, unknown> = { error: e.message }
      if (e.conflicts) body.conflicts = e.conflicts
      return NextResponse.json(body, { status: e.status })
    }
    console.error('[schedules:create]', e)
    return NextResponse.json({ error: '创建排课失败' }, { status: 500 })
  }
})
