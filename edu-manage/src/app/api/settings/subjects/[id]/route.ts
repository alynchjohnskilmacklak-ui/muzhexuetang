import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

// PATCH /api/settings/subjects/[id] — 更新学科
export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const subject = await prisma.subject.update({ where: { id }, data: body })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '更新了学科', detail: `修改了「${subject.name}」` },
  })

  return NextResponse.json(subject)
})

// DELETE /api/settings/subjects/[id] — 删除学科（检查依赖）
export const DELETE = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { id } = await params
  const subject = await prisma.subject.findUnique({ where: { id } })
  if (!subject) return NextResponse.json({ error: '学科不存在' }, { status: 404 })

  // 检查是否有课程使用了该学科
  const courseCount = await prisma.course.count({ where: { subject: subject.name } })
  const classGroupCount = await prisma.classGroupTeacher.count({ where: { subject: subject.name } })

  if (courseCount > 0 || classGroupCount > 0) {
    return NextResponse.json({
      error: '该学科下有课程或班级关联',
      details: `共 ${courseCount + classGroupCount} 个关联：${courseCount} 门课程、${classGroupCount} 个班级教师`,
    }, { status: 409 })
  }

  await prisma.subject.delete({ where: { id } })

  await prisma.activityLog.create({
    data: { userId: user.id, action: '删除了学科', detail: `删除了「${subject.name}」` },
  })

  return NextResponse.json({ success: true })
})
