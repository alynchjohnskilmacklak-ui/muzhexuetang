import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

function calcEndTime(startTime: string, lessonMinutes: number) {
  const [hour, minute] = startTime.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return startTime
  const totalMinutes = hour * 60 + minute + lessonMinutes
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const lessons = await prisma.classLesson.findMany({
    where: { groupId: id, group: visibleClassGroupWhere },
    orderBy: { lessonDate: 'asc' },
    include: {
      teacher: { select: { id: true, name: true, subjects: true } },
      attendances: {
        where: { student: visibleStudentWhere },
        include: { student: { select: { id: true, name: true } } },
      },
    },
  })
  return NextResponse.json(lessons)
})

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const lessonDate = typeof body.lessonDate === 'string' ? body.lessonDate : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime : ''
  const bodyEndTime = typeof body.endTime === 'string' && body.endTime ? body.endTime : ''
  const bodyTeacherId = typeof body.teacherId === 'string' && body.teacherId ? body.teacherId : ''
  const bodySubject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : ''

  if (!lessonDate || !startTime) {
    return NextResponse.json({ error: '请选择日期和开始时间' }, { status: 400 })
  }

  const dayStart = new Date(`${lessonDate}T00:00:00`)
  if (Number.isNaN(dayStart.getTime())) {
    return NextResponse.json({ error: '日期格式不正确' }, { status: 400 })
  }
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const group = await prisma.classGroup.findFirst({
    where: { id, ...visibleClassGroupWhere },
    include: {
      course: true,
      teacherAssignments: { include: { teacher: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })

  const assignment = bodyTeacherId
    ? group.teacherAssignments.find((item) => item.teacherId === bodyTeacherId) || group.teacherAssignments[0]
    : group.teacherAssignments[0]
  const teacherId = bodyTeacherId || assignment?.teacherId || group.teacherId
  if (!teacherId) return NextResponse.json({ error: '请先为班级设置任课老师' }, { status: 400 })

  const subject = bodySubject || assignment?.subject || group.course.subject || null
  const endTime = bodyEndTime || calcEndTime(startTime, group.lessonMinutes || 45)

  const conflict = await prisma.classLesson.findFirst({
    where: {
      teacherId,
      lessonDate: { gte: dayStart, lt: dayEnd },
      startTime,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
    },
    select: { id: true },
  })
  if (conflict) return NextResponse.json({ error: '该老师同一时间已有课次，请调整时间或老师' }, { status: 409 })

  const lesson = await prisma.$transaction(async (tx) => {
    const created = await tx.classLesson.create({
      data: {
        groupId: id,
        teacherId,
        subject,
        lessonDate: dayStart,
        startTime,
        endTime,
        status: 'SCHEDULED',
        division: group.division,
        isManual: true,
      },
      include: { teacher: { select: { id: true, name: true, subjects: true } } },
    })

    await tx.classGroup.update({
      where: { id },
      data: { totalLessons: { increment: 1 } },
    })

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: '新增单节课',
        detail: `${group.name} ${lessonDate} ${startTime}`,
      },
    })

    return created
  })

  return NextResponse.json(lesson)
})
