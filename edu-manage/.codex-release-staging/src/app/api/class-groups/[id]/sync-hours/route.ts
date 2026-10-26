import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { roundHours } from '@/lib/hours'
import { hoursPerLesson } from '@/lib/lesson-units'
import { apiHandler } from '@/lib/api-handler'
import { isClassGroupInActiveTerm } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  if (!await isClassGroupInActiveTerm(prisma, id)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能校准课时' }, { status: 409 })
  }

  const group = await prisma.classGroup.findUnique({
    where: { id },
    select: { id: true, name: true, startDate: true, lessonMinutes: true },
  })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })

  const enrollments = await prisma.enrollment.findMany({
    where: {
      groupId: id,
      status: 'ACTIVE',
      enrolledAt: { gt: group.startDate },
    },
    select: {
      id: true,
      studentId: true,
      remainHours: true,
      totalHours: true,
      usedHours: true,
      enrolledAt: true,
    },
    orderBy: { enrolledAt: 'asc' },
  })

  if (!enrollments.length) {
    return NextResponse.json({ message: '没有开班后加入的插班生，无需校准', updated: 0 })
  }

  const remainingLessonCount = await prisma.classLesson.count({
    where: {
      groupId: id,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
    },
  })
  const targetHours = roundHours(
    remainingLessonCount * hoursPerLesson(group.lessonMinutes),
  )
  const toUpdate = enrollments.filter(
    (enrollment) => Math.abs(Number(enrollment.remainHours || 0) - targetHours) >= 0.01,
  )

  if (!toUpdate.length) {
    return NextResponse.json({
      message: '插班生课时已经与剩余有效课次一致',
      updated: 0,
      targetHours,
      remainingLessonCount,
    })
  }

  await prisma.$transaction(async (tx) => {
    for (const enrollment of toUpdate) {
      const beforeHours = Number(enrollment.remainHours || 0)
      const amount = roundHours(targetHours - beforeHours)
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          remainHours: targetHours,
          totalHours: roundHours(Number(enrollment.usedHours || 0) + targetHours),
        },
      })
      await tx.hourTransaction.create({
        data: {
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          amount,
          beforeHours,
          afterHours: targetHours,
          type: 'ADMIN_ADJUSTMENT',
          reason: `插班生按剩余${remainingLessonCount}节有效课次校准`,
          operatorId: user.id,
        },
      })
    }

    for (const studentId of [...new Set(toUpdate.map((enrollment) => enrollment.studentId))]) {
      const allActive = await tx.enrollment.findMany({
        where: { studentId, status: 'ACTIVE' },
        select: { remainHours: true, totalHours: true },
      })
      await tx.student.update({
        where: { id: studentId },
        data: {
          remainHours: allActive.reduce((sum, item) => sum + Number(item.remainHours || 0), 0),
          totalHours: allActive.reduce((sum, item) => sum + Number(item.totalHours || 0), 0),
        },
      })
    }

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: '批量同步课时',
        detail: `${group.name}：按剩余${remainingLessonCount}节，将${toUpdate.length}位插班生剩余课时校准为${targetHours}小时`,
      },
    })
  })

  return NextResponse.json({
    updated: toUpdate.length,
    targetHours,
    remainingLessonCount,
    studentIds: toUpdate.map(e => e.studentId),
    message: `已按剩余 ${remainingLessonCount} 节有效课次，校准 ${toUpdate.length} 位插班生课时`,
  })
})
