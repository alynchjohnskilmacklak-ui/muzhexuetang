import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminUser()
  const { id } = await context.params

  const assignment = await admin.prisma.homeworkAssignment.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          course: { select: { name: true, subject: true } },
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null },
            select: { student: { select: { id: true, name: true, grade: true } } },
          },
        },
      },
      teacher: { select: { id: true, name: true } },
      term: { select: { id: true, name: true } },
      submissions: {
        include: {
          student: { select: { id: true, name: true, grade: true } },
          parent: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { submittedAt: 'desc' },
      },
    },
  })

  if (!assignment) {
    return NextResponse.json({ error: '作业不存在或已被删除' }, { status: 404 })
  }

  return NextResponse.json({ assignment })
})

export const DELETE = apiHandler(async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminUser()
  const { id } = await context.params

  const existing = await admin.prisma.homeworkAssignment.findUnique({
    where: { id },
    include: { group: { select: { name: true } } },
  })

  if (!existing) {
    return NextResponse.json({ error: '作业不存在或已被删除' }, { status: 404 })
  }

  await admin.prisma.homeworkAssignment.delete({ where: { id } })

  await admin.prisma.activityLog.create({
    data: {
      userId: admin.user.id,
      action: '删除作业任务',
      detail: `${existing.group.name} · ${existing.title}`,
      entityType: 'HomeworkAssignment',
      entityId: id,
    },
  })

  return NextResponse.json({ success: true })
})
