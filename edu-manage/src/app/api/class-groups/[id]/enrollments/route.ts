import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { minutesToHours, roundHours } from '@/lib/hours'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

async function syncStudentHours(tx: Prisma.TransactionClient, studentId: string) {
  const activeEnrollments = await tx.enrollment.findMany({
    where: {
      studentId,
      status: 'ACTIVE',
      group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
    },
    select: { remainHours: true, totalHours: true },
  })
  const totalRemain = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
  const totalAll = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)

  await tx.student.update({
    where: { id: studentId },
    data: { remainHours: totalRemain, totalHours: totalAll },
  })
}

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id } = await params
  const enrollments = await prisma.enrollment.findMany({
    where: { groupId: id, ...activeEnrollmentWhere },
    include: {
      student: {
        select: { id: true, name: true, phone: true, grade: true, school: true, parentName: true, parentPhone: true },
      },
    },
    orderBy: { enrolledAt: 'asc' },
  })
  return NextResponse.json(enrollments)
})

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const totalHours = Number(body.totalHours || 0)
  if (!studentId) return NextResponse.json({ error: '请选择学员' }, { status: 400 })

  const group = await prisma.classGroup.findFirst({
    where: { id, ...visibleClassGroupWhere },
    include: {
      course: true,
      teacher: { select: { name: true } },
      room: { select: { name: true } },
      classLessons: { orderBy: { lessonDate: 'asc' }, take: 1 },
    },
  })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })

  const student = await prisma.student.findFirst({
    where: { id: studentId, ...visibleStudentWhere },
  })
  if (!student) return NextResponse.json({ error: 'STUDENT_NOT_AVAILABLE' }, { status: 404 })

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_groupId: { studentId, groupId: id } },
  })
  if (existing?.status === 'ACTIVE') return NextResponse.json({ error: '该学员已在此班级中' }, { status: 409 })

  const hours = totalHours > 0 ? roundHours(totalHours) : minutesToHours(group.totalLessons * group.lessonMinutes)
  const enrollment = await prisma.$transaction(async (tx) => {
    const created = existing
      ? await tx.enrollment.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', totalHours: hours, remainHours: hours, usedHours: 0 },
          include: { student: true },
        })
      : await tx.enrollment.create({
          data: { studentId, groupId: id, totalHours: hours, remainHours: hours, usedHours: 0 },
          include: { student: true },
        })

    await tx.student.update({
      where: { id: studentId },
      data: { status: 'ACTIVE', mainTeacherId: group.teacherId },
    })
    await syncStudentHours(tx, studentId)

    const parentId = created.student.parentId || created.student.parentUserId
    const firstLesson = group.classLessons[0]
    if (group.status === 'ACTIVE' && parentId) {
      await tx.notification.create({
        data: {
          userId: parentId,
          type: 'CLASS_ENROLLMENT',
          title: `${created.student.name} 已加入 ${group.name}`,
          content: `课程：${group.course.name}；教师：${group.teacher.name}；首次课：${firstLesson ? `${firstLesson.lessonDate.toISOString().slice(0, 10)} ${firstLesson.startTime}` : '待通知'}；教室：${group.room?.name || '待分配'}。`,
        },
      })
    }

    await tx.activityLog.create({
      data: { userId: user.id, action: '学员报班', detail: `${created.student.name} -> ${group.name}` },
    })

    return created
  })

  return NextResponse.json(enrollment, { status: 201 })
})

export const DELETE = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const enrollmentId = searchParams.get('enrollmentId')
  if (!enrollmentId) return NextResponse.json({ error: '缺少报名记录' }, { status: 400 })

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, groupId: id },
    include: { student: true, group: true },
  })
  if (!enrollment) return NextResponse.json({ error: '报名记录不存在' }, { status: 404 })

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'WITHDRAWN', remainHours: 0 },
    })

    const activeClassCount = await tx.enrollment.count({
      where: {
        studentId: enrollment.studentId,
        status: 'ACTIVE',
        group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
      },
    })
    await syncStudentHours(tx, enrollment.studentId)
    if (activeClassCount === 0) {
      await tx.student.update({
        where: { id: enrollment.studentId },
        data: { status: 'TRIAL', remainHours: 0, totalHours: 0, mainTeacherId: null },
      })
    }

    await tx.activityLog.create({
      data: { userId: user.id, action: '移出班级', detail: `${enrollment.student.name} -> ${enrollment.group.name}` },
    })

    return result
  })

  return NextResponse.json(updated)
})
