import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { checkScheduleConflict } from '@/lib/schedule-conflict'
import { revalidatePath } from 'next/cache'

import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  try {
    const body = await req.json()
    const { teacherId, studentId, subject, date, startTime, endTime, roomId, note } = body

    if (!teacherId || !studentId || !subject || !date || !startTime || !endTime) {
      return NextResponse.json({ error: '缺少必填字段（老师/学员/科目/日期/时间）' }, { status: 400 })
    }

    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const lessonMinutes = (eh * 60 + em) - (sh * 60 + sm)
    if (lessonMinutes <= 0) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }

    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } })
    if (!teacher) return NextResponse.json({ error: '教师不存在' }, { status: 400 })

    // Validate student exists
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 400 })

    // Conflict check
    const conflicts = await checkScheduleConflict({
      teacherId,
      studentId,
      roomId: roomId || undefined,
      date,
      startTime,
      endTime,
    })

    if (conflicts.length > 0) {
      return NextResponse.json({
        error: '时间冲突',
        conflicts: conflicts.map(c => ({
          type: c.type,
          message: c.type === 'teacher'
            ? '该老师在此时间段已有课程，不能安排一对一'
            : c.type === 'student'
            ? '该学员在此时间段已有课程'
            : '该教室在此时间段已被占用',
          detail: `冲突课程：${c.courseName} ${c.timeRange}${c.roomName ? `，${c.roomName}` : ''}`,
        })),
      }, { status: 409 })
    }

    // Create one-on-one in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create ONE_ON_ONE course
      let course = await tx.course.findFirst({
        where: { subject, type: 'ONE_ON_ONE', isActive: true },
      })
      if (!course) {
        course = await tx.course.create({
          data: {
            name: `一对一${subject}`,
            subject,
            type: 'ONE_ON_ONE',
            grade: student.grade || undefined,
            lessonMinutes,
            color: '#534AB7',
            isActive: true,
          },
        })
      }

      // 2. Find or create ClassGroup for this teacher-student-subject
      let group = await tx.classGroup.findFirst({
        where: {
          teacherId,
          courseId: course.id,
          status: { not: 'ARCHIVED' },
          enrollments: { some: { studentId, status: 'ACTIVE' } },
        },
      })
      if (!group) {
        group = await tx.classGroup.create({
          data: {
            name: `一对一·${teacher.name}·${student.name}·${subject}`,
            courseId: course.id,
            teacherId,
            roomId: roomId || null,
            maxStudents: 1,
            startDate: new Date(`${date}T00:00:00`),
            totalLessons: 1,
            lessonStartTime: startTime,
            lessonMinutes,
            recurringDays: [],
            status: 'ACTIVE',
          },
        })
        // Enroll student
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

      // 3. Create ClassLesson
      const lesson = await tx.classLesson.create({
        data: {
          groupId: group.id,
          teacherId,
          subject,
          lessonDate: new Date(`${date}T00:00:00`),
          startTime,
          endTime,
          status: 'SCHEDULED',
          note: note || null,
        },
        include: {
          group: {
            include: {
              course: { select: { id: true, name: true, subject: true, grade: true, type: true } },
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

    return NextResponse.json({ success: true, lesson: result, message: '一对一排课成功' }, { status: 201 })
  } catch (e) {
    console.error('[one-on-one:create]', e)
    return NextResponse.json({ error: '创建一对一课程失败' }, { status: 500 })
  }
})
