import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const groupId = searchParams.get('groupId')
  const division = getRequestDivision(user, searchParams.get('division'))

  const where: Record<string, unknown> = {}
  if (studentId) where.studentId = studentId
  if (groupId) where.groupId = groupId
  if (user.role === 'admin') {
    where.student = { division }
  }

  const highlights = await prisma.classHighlight.findMany({
    where,
    include: {
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(highlights)
})

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })


  const prisma = await getRequestPrisma()
  const body = await req.json()
  const { studentId, teacherId, groupId, content, imageUrl } = body

  if (!studentId || !content) return NextResponse.json({ error: '请选择学员并填写内容' }, { status: 400 })

  const highlight = await prisma.classHighlight.create({
    data: {
      studentId,
      teacherId: teacherId || '',
      groupId,
      content,
      imageUrl: imageUrl || null,
    },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '记录课堂亮点', detail: content.slice(0, 50) },
  })

  return NextResponse.json(highlight, { status: 201 })
})
