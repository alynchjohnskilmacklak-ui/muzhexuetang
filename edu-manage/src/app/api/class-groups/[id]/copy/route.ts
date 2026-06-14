import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { addDays, differenceInDays } from 'date-fns'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const body = await req.json()
  const { newStartDate, name } = body

  const source = await prisma.classGroup.findUnique({
    where: { id },
    include: {
      classLessons: { orderBy: { lessonDate: 'asc' } },
      teacherAssignments: true,
    },
  })
  if (!source) return NextResponse.json({ error: '原班级不存在' }, { status: 404 })

  const offsetDays = newStartDate
    ? differenceInDays(new Date(newStartDate), source.startDate)
    : 0

  const copy = await prisma.$transaction(async (tx) => {
    const g = await tx.classGroup.create({
      data: {
        name: name || `${source.name}（副本）`,
        courseId: source.courseId,
        teacherId: source.teacherId,
        roomId: source.roomId,
        maxStudents: source.maxStudents,
        startDate: new Date(newStartDate || source.startDate),
        totalLessons: source.totalLessons,
        recurringDays: source.recurringDays,
        lessonStartTime: source.lessonStartTime,
        lessonMinutes: source.lessonMinutes,
        note: source.note,
        status: 'WAITING',
      },
    })

    if (source.classLessons.length > 0) {
      await tx.classLesson.createMany({
        data: source.classLessons.map((l) => ({
          groupId: g.id,
          teacherId: l.teacherId,
          subject: l.subject,
          lessonDate: addDays(l.lessonDate, offsetDays),
          startTime: l.startTime,
          endTime: l.endTime,
          status: 'SCHEDULED',
        })),
      })
    }

    const assignmentTeacherIds = source.teacherAssignments.length
      ? source.teacherAssignments
      : [{ teacherId: source.teacherId, subject: null, role: 'PRIMARY' }]
    await tx.classGroupTeacher.createMany({
      data: assignmentTeacherIds.map((item) => ({
        groupId: g.id,
        teacherId: item.teacherId,
        subject: item.subject,
        role: item.role,
      })),
      skipDuplicates: true,
    })

    await tx.activityLog.create({
      data: { userId: user.id, action: '复制班次', detail: `${source.name} → ${g.name}` },
    })

    return g
  })

  return NextResponse.json(copy, { status: 201 })
})
