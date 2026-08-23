import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId')

  if (!groupId) return NextResponse.json({ error: '请指定班级' }, { status: 400 })

  // 整班成绩仅管理员或该班授课教师可读，家长不得越权读取整班数据。
  if (user.role !== 'admin' && user.role !== 'teacher') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  if (user.role === 'teacher') {
    if (!user.teacherId) return NextResponse.json({ error: '无权限' }, { status: 403 })
    const owns = await prisma.classGroup.findFirst({
      where: {
        id: groupId,
        status: { not: 'ARCHIVED' },
        OR: [
          { teacherId: user.teacherId },
          { teacherAssignments: { some: { teacherId: user.teacherId } } },
        ],
      },
      select: { id: true },
    })
    if (!owns) return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const assessments = await prisma.assessment.findMany({
    where: { groupId },
    include: {
      gradeRecords: {
        include: {
          student: { select: { id: true, name: true } },
          dimensions: true,
        },
      },
    },
    orderBy: { assessDate: 'desc' },
  })
  return NextResponse.json(assessments)
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })


  const prisma = await getRequestPrisma()
  const body = await req.json()
  const { groupId, name, type, assessDate, fullScore } = body

  if (!groupId || !name) return NextResponse.json({ error: '请填写班级和测评名称' }, { status: 400 })

  const activeGroup = await prisma.classGroup.findFirst({
    where: { id: groupId, division: user.division, term: { status: 'ACTIVE' } },
    select: { id: true },
  })
  if (!activeGroup) {
    return NextResponse.json({ error: '只能在当前启用批次中创建测评' }, { status: 409 })
  }

  const assessment = await prisma.assessment.create({
    data: {
      groupId,
      name,
      type: type || 'STAGE',
      assessDate: assessDate ? new Date(assessDate) : new Date(),
      fullScore: fullScore || 100,
    },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '创建测评', detail: name },
  })

  return NextResponse.json(assessment, { status: 201 })
})
