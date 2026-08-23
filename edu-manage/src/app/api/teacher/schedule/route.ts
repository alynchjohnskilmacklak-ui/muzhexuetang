import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentTeacher, teacherLessonWhere } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { activeEnrollmentWhere } from '@/lib/business-visibility'
import { dateRangeDays } from '@/lib/date/local-day'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const { searchParams } = req.nextUrl
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') || 'ALL'
    if (type === 'STUDY_HALL') {
      if (!startDate || !endDate) return NextResponse.json({ currentTeacherId: teacher.id, lessons: [] })
      const start = new Date(`${startDate}T00:00:00+08:00`)
      const end = new Date(`${endDate}T00:00:00+08:00`)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return NextResponse.json({ error: '课表日期范围不正确' }, { status: 400 })
      }
      const dayCount = Math.min(31, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1)
      const days = dateRangeDays(startDate, dayCount)
      const classes = await prisma.studyHallClass.findMany({
        where: {
          division: teacher.division,
          status: 'ACTIVE',
          term: { status: 'ACTIVE' },
          teachers: { some: { teacherId: user.id, active: true } },
        },
        include: {
          students: { where: { status: 'ACTIVE' }, select: { student: { select: { id: true, name: true } } } },
          sessions: { where: { active: true }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
        },
        orderBy: { name: 'asc' },
      })
      const closures = classes.length ? await prisma.studyHallClosure.findMany({
        where: {
          division: teacher.division,
          termId: { in: [...new Set(classes.map((studyClass) => studyClass.termId))] },
          startDate: { lte: end },
          endDate: { gte: start },
          OR: [{ classId: null }, { classId: { in: classes.map((studyClass) => studyClass.id) } }],
        },
        select: { classId: true, startDate: true, endDate: true },
      }) : []
      const lessons = classes.flatMap((studyClass) => days.flatMap((date) => {
        const weekday = new Date(`${date}T00:00:00+08:00`).getDay() || 7
        if (!studyClass.weekdays.includes(weekday)) return []
        const studyDate = new Date(`${date}T00:00:00+08:00`)
        const isClosed = closures.some((closure) => (
          (!closure.classId || closure.classId === studyClass.id)
          && closure.startDate <= studyDate
          && closure.endDate >= studyDate
        ))
        if (isClosed) return []
        const enrollments = studyClass.students.map((item) => ({ student: item.student }))
        if (studyClass.scheduleType === 'WEEKEND') {
          return studyClass.sessions
            .filter((session) => session.weekday === weekday && session.teacherId === user.id)
            .map((session) => ({
              id: `study-hall:${studyClass.id}:${date}:${session.id}`,
              lessonDate: date,
              startTime: session.startTime,
              endTime: session.endTime,
              status: 'SCHEDULED',
              scheduleKind: 'STUDY_HALL',
              subject: session.subject || '作业辅导',
              group: { id: studyClass.id, name: studyClass.name, room: null, enrollments, course: { name: '周末作业辅导', subject: session.subject || '作业辅导' } },
            }))
        }
        return [{
          id: `study-hall:${studyClass.id}:${date}:day`,
          lessonDate: date,
          startTime: studyClass.timeWindowStart || '18:30',
          endTime: studyClass.timeWindowEnd || '20:00',
          status: 'SCHEDULED',
          scheduleKind: 'STUDY_HALL',
          subject: '晚托与作业辅导',
          group: { id: studyClass.id, name: studyClass.name, room: null, enrollments, course: { name: '晚托与作业辅导', subject: '晚托与作业辅导' } },
        }]
      }))
      return NextResponse.json({ currentTeacherId: teacher.id, lessons })
    }
    const where: Record<string, unknown> = {
      ...teacherLessonWhere(teacher.id),
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      ...(startDate || endDate ? {
        lessonDate: {
          ...(startDate ? { gte: new Date(`${startDate}T00:00:00`) } : {}),
          ...(endDate ? { lte: new Date(`${endDate}T23:59:59`) } : {}),
        },
      } : {}),
    }
    if (type === 'ALL') {
      // 不加 course.type 过滤，返回该教师全部课次
    } else if (type === 'GROUP') {
      where.group = { ...(where.group as Record<string, unknown> || {}), course: { type: 'GROUP' } }
    } else if (type === 'INTENSIVE') {
      where.group = { ...(where.group as Record<string, unknown> || {}), intensiveMode: 'INTENSIVE' }
    }

    const lessons = await prisma.classLesson.findMany({
      where,
      include: {
        group: {
          include: {
            course: { select: { id: true, name: true, subject: true, grade: true, type: true, color: true } },
            teacher: { select: { id: true, name: true, subjects: true } },
            teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } }, orderBy: { createdAt: 'asc' } },
            room: { select: { id: true, name: true, capacity: true, type: true } },
            enrollments: { where: activeEnrollmentWhere, select: { id: true, totalHours: true, usedHours: true, remainHours: true, student: { select: { id: true, name: true } } } },
          },
        },
        teacher: { select: { id: true, name: true, subjects: true } },
        attendances: { select: { id: true, status: true } },
        lessonStudents: { include: { student: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        classroomFeedbacks: { where: { teacherId: teacher.id, status: 'PUBLISHED' }, select: { studentIds: true } },
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json({
      currentTeacherId: teacher.id,
      lessons: lessons.map((lesson) => ({
        ...lesson,
        assignedSubject: lesson.subject || lesson.group.teacherAssignments.find((item) => item.teacherId === teacher.id)?.subject || lesson.group.course.subject,
      })),
    })
})
