import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const groupId = searchParams.get('groupId')

  const where: Record<string, unknown> = {}
  if (studentId) where.studentId = studentId
  if (groupId) where.groupId = groupId

  const highlights = await prisma.classHighlight.findMany({
    where,
    include: {
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(highlights)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

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
}
