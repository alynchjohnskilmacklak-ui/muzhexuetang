import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { createManyNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const groupScope = {
    division: teacher.division,
    deletedAt: null,
    status: { not: 'ARCHIVED' as const },
    OR: [{ teacherId: teacher.id }, { teacherAssignments: { some: { teacherId: teacher.id } } }],
  }
  const [groups, assignments] = await Promise.all([
    prisma.classGroup.findMany({
      where: groupScope,
      include: {
        course: { select: { name: true, subject: true } },
        enrollments: {
          where: { status: 'ACTIVE', deletedAt: null, student: { deletedAt: null, status: 'ACTIVE' } },
          select: { studentId: true },
        },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    }),
    prisma.homeworkAssignment.findMany({
      where: { teacherId: teacher.id },
      include: {
        group: { select: { id: true, name: true, course: { select: { name: true, subject: true } } } },
        submissions: {
          include: { student: { select: { id: true, name: true } }, parent: { select: { name: true } } },
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  return NextResponse.json({
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      course: group.course,
      studentCount: group.enrollments.length,
    })),
    assignments,
  })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const groupId = typeof body?.groupId === 'string' ? body.groupId.trim() : ''
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const instructions = typeof body?.instructions === 'string' ? body.instructions.trim() : ''
  const dueAtValue = typeof body?.dueAt === 'string' && body.dueAt ? body.dueAt : null
  if (!groupId || title.length < 2 || title.length > 120) {
    return NextResponse.json({ error: '请选择班级并填写 2 至 120 字的作业名称' }, { status: 400 })
  }
  if (instructions.length > 4000) return NextResponse.json({ error: '作业说明不能超过 4000 字' }, { status: 400 })
  const dueAt = dueAtValue ? new Date(dueAtValue) : null
  if (dueAtValue && Number.isNaN(dueAt!.getTime())) return NextResponse.json({ error: '截止日期格式无效' }, { status: 400 })

  const group = await prisma.classGroup.findFirst({
    where: {
      id: groupId,
      division: teacher.division,
      deletedAt: null,
      status: { not: 'ARCHIVED' },
      OR: [{ teacherId: teacher.id }, { teacherAssignments: { some: { teacherId: teacher.id } } }],
    },
    include: {
      term: { select: { id: true, status: true } },
      enrollments: {
        where: { status: 'ACTIVE', deletedAt: null, student: { status: 'ACTIVE', deletedAt: null } },
        include: { student: { select: { id: true, parentId: true, parentUserId: true } } },
      },
    },
  })
  if (!group) return NextResponse.json({ error: '无权为该班级布置作业' }, { status: 403 })
  if (group.term?.status !== 'ACTIVE') return NextResponse.json({ error: '只能为当前启用运营批次的班级布置作业' }, { status: 409 })
  const studentIds = [...new Set(group.enrollments.map((enrollment) => enrollment.student.id))]
  if (studentIds.length === 0) return NextResponse.json({ error: '班级没有在读学员，暂不能布置作业' }, { status: 409 })

  const parentIds = [...new Set(group.enrollments.flatMap((enrollment) => {
    const parentId = enrollment.student.parentId || enrollment.student.parentUserId
    return parentId ? [parentId] : []
  }))]
  const parents = parentIds.length
    ? await prisma.user.findMany({ where: { id: { in: parentIds }, role: 'parent', status: 'active' }, select: { id: true } })
    : []

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.homeworkAssignment.create({
      data: {
        groupId: group.id,
        teacherId: teacher.id,
        termId: group.term?.id || null,
        title,
        instructions: instructions || null,
        dueAt,
        studentIds,
      },
      include: { group: { select: { id: true, name: true } } },
    })
    await createManyNotifications(tx, parents.map((parent) => ({
      userId: parent.id,
      type: 'HOMEWORK_ASSIGNED',
      title: `新作业：${title}`,
      content: `${group.name}发布了新的课后作业，请查看截止时间并提交。`,
      relatedType: 'HOMEWORK_ASSIGNMENT',
      relatedId: created.id,
      studentId: studentIds.find((studentId) => group.enrollments.find((enrollment) => enrollment.student.id === studentId && (enrollment.student.parentId === parent.id || enrollment.student.parentUserId === parent.id))) || null,
      href: '/parent/homework',
      pushStatus: 'queued',
    })))
    await tx.activityLog.create({
      data: { userId: user.id, teacherId: teacher.id, action: '布置课后作业', detail: `${group.name} · ${title}`, entityType: 'HomeworkAssignment', entityId: created.id },
    })
    return created
  })

  return NextResponse.json({ assignment }, { status: 201 })
})
