import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      mainTeacher: true,
      parent: true,
      schedules: { include: { schedule: { include: { course: { select: { id: true, name: true, teacherId: true } }, teacher: { select: { id: true, name: true } } } } } },
      enrollments: {
        where: {
          status: 'ACTIVE',
          group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
        },
        include: { group: { include: { course: true, teacherAssignments: { include: { teacher: { select: { id: true, name: true } } } } } } },
        orderBy: { enrolledAt: 'desc' },
      },
      attendances: { orderBy: { createdAt: 'desc' }, take: 50 },
      fees: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const activeEnrollments = student.enrollments.filter((enrollment) => (
    enrollment.status === 'ACTIVE'
    && enrollment.group?.status !== 'ARCHIVED'
    && enrollment.group?.course?.isActive !== false
  ))
  const remainHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
  const totalHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)
  return NextResponse.json({
    ...student,
    enrollments: activeEnrollments,
    remainHours,
    totalHours,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const student = await prisma.student.update({
    where: { id },
    data: {
      name: body.name,
      gender: body.gender,
      birthYear: body.birthYear ? parseInt(body.birthYear) : undefined,
      grade: body.grade,
      school: body.school,
      phone: body.phone,
      email: body.email,
      parentName: body.parentName,
      parentPhone: body.parentPhone,
      source: body.source,
      notes: body.notes,
      tags: body.tags ? JSON.stringify(body.tags) : undefined,
      mainTeacherId: body.mainTeacherId,
      remainHours: body.remainHours,
      status: body.status,
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/students')

  return NextResponse.json(student)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: '请重新登录后再办理离校' }, { status: 401 })

    const { id } = await params

    // Find student with parent link
    const student = await prisma.student.findUnique({ where: { id }, include: { parent: true } })
    if (!student) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

    // Deactivate student
    await prisma.student.update({
      where: { id },
      data: { status: 'INACTIVE', leftAt: new Date(), mainTeacherId: null },
    })

    await prisma.enrollment.updateMany({
      where: { studentId: id, status: 'ACTIVE' },
      data: { status: 'WITHDRAWN' },
    })

    await prisma.scheduleStudent.deleteMany({ where: { studentId: id } })

    // If has linked parent user, disable the parent account
    if (student.parentUserId) {
      await prisma.user.update({
        where: { id: student.parentUserId },
        data: { status: 'disabled' },
      })
    }

    const userId = (session.user as { id?: string }).id
    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: '离校处理',
          detail: `${student.name} ${student.parentUserId ? '，家长账号已停用' : ''}`,
        },
      })
    } else {
      console.error('[students:delete] session user id missing; skipped activity log')
    }

    revalidatePath('/dashboard')
    revalidatePath('/students')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[students:delete] failed', error)
    return NextResponse.json({ error: '离校处理失败，请查看服务器日志' }, { status: 500 })
  }
}
