import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { activeCourseWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { validateScheduleStudentCount } from '@/lib/schedule-class-type'
import { checkScheduleConflict } from '@/lib/schedule-conflict'
import { apiHandler } from '@/lib/api-handler'
import { detectTeacherId } from '@/lib/teacher-identity'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  const userId = (session.user as { id?: string }).id
  const searchParams = new URL(req.url).searchParams
  const start = searchParams.get('startDate')
  const end = searchParams.get('endDate')
  const teacherIdParam = searchParams.get('teacherId')
  const classType = searchParams.get('classType')
  const includeCancelled = searchParams.get('includeCancelled') === 'true'

  const where: Record<string, unknown> = {}
  if (!includeCancelled) {
    where.status = { not: 'cancelled' }
  }
  where.course = activeCourseWhere

  // Role-based access control
  if (role === 'admin') {
    // Admin: may optionally filter by teacherId from URL
    if (teacherIdParam) where.teacherId = teacherIdParam
  } else if (role === 'teacher') {
    // Teacher: force to own teacherId; ignore URL teacherId to prevent leaking
    const ownTeacherId = await detectTeacherId(userId!)
    if (!ownTeacherId) return NextResponse.json({ error: '未绑定教师身份' }, { status: 403 })
    where.teacherId = ownTeacherId
  } else if (role === 'parent') {
    // Parent: schedules that include their children
    const childIds = await prisma.student.findMany({
      where: parentLinkedStudentWhere(userId!),
      select: { id: true },
    }).then(r => r.map(s => s.id))

    if (childIds.length === 0) {
      return NextResponse.json({ schedules: [], total: 0, page: 1, limit: 50 })
    }

    where.students = { some: { studentId: { in: childIds } } }
  } else {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  if (classType) where.classType = classType

  if (start || end) {
    where.startTime = {}
    if (start) (where.startTime as Record<string, unknown>).gte = new Date(start)
    if (end) (where.startTime as Record<string, unknown>).lte = new Date(end)
  }

  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)))

  const [schedules, total] = await Promise.all([
    prisma.schedule.findMany({
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
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.schedule.count({ where }),
  ])

  return NextResponse.json({ schedules, total, page, limit })
})

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
        select: { id: true, name: true },
      })
      if (!course) throw { status: 400, message: '所选课程不存在或已停用' }
      const teacher = await tx.teacher.findUnique({
        where: { id: teacherId },
        select: { id: true, name: true },
      })
      if (!teacher) throw { status: 400, message: '教师不存在' }

      // Find or create ClassGroup container
      const groupName = `临时·${teacher.name}·${course.name}·${startDate}`
      let group = await tx.classGroup.findFirst({
        where: { name: groupName, teacherId, courseId, status: 'ACTIVE' },
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
          },
        })
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
