import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { roundHours } from '@/lib/hours'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params

  const enrollments = await prisma.enrollment.findMany({
    where: { groupId: id, status: 'ACTIVE' },
    select: { id: true, studentId: true, remainHours: true, totalHours: true, enrolledAt: true },
    orderBy: { enrolledAt: 'asc' },
  })

  if (enrollments.length < 2) {
    return NextResponse.json({ message: '班级学员不足2人，无需同步', updated: 0 })
  }

  const hours = enrollments.map(e => Number(e.remainHours || 0))
  const sorted = [...hours].sort((a, b) => a - b)
  const trimCount = Math.max(0, Math.floor(sorted.length * 0.2))
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount)
  const avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length
  const targetHours = roundHours(avg)

  const threshold = targetHours * 1.3
  const toUpdate = enrollments.filter(e => Number(e.remainHours || 0) > threshold)

  if (!toUpdate.length) {
    return NextResponse.json({ message: '暂无需要同步的学员', updated: 0, targetHours })
  }

  await prisma.$transaction(
    toUpdate.map(e => prisma.enrollment.update({
      where: { id: e.id },
      data: { remainHours: targetHours, totalHours: targetHours },
    }))
  )

  for (const e of toUpdate) {
    const allActive = await prisma.enrollment.findMany({
      where: { studentId: e.studentId, status: 'ACTIVE' },
      select: { remainHours: true, totalHours: true },
    })
    await prisma.student.update({
      where: { id: e.studentId },
      data: {
        remainHours: allActive.reduce((s, x) => s + Number(x.remainHours || 0), 0),
        totalHours: allActive.reduce((s, x) => s + Number(x.totalHours || 0), 0),
      },
    })
  }

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: '批量同步课时',
      detail: `班级 ${id}：将 ${toUpdate.length} 位学员课时同步至 ${targetHours} 课时`,
    },
  })

  return NextResponse.json({
    updated: toUpdate.length,
    targetHours,
    studentIds: toUpdate.map(e => e.studentId),
    message: `已将 ${toUpdate.length} 位学员的课时同步至班级平均 ${targetHours} 课时`,
  })
})
