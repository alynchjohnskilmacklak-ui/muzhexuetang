import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { parseSubjectSettings } from '@/lib/subject-settings'

export const dynamic = 'force-dynamic'

// PATCH /api/settings/subjects/[id] — 更新学科
export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  let body: ReturnType<typeof parseSubjectSettings>
  try { body = parseSubjectSettings(await request.json()) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '学科内容无效' }, { status: 400 }) }
  const existing = await prisma.subject.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '学科不存在' }, { status: 404 })
  if (body.name && body.name !== existing.name) {
    const counts = await Promise.all([
      prisma.course.count({ where: { subject: existing.name } }),
      prisma.classGroupTeacher.count({ where: { subject: existing.name } }),
      prisma.classLesson.count({ where: { subject: existing.name } }),
      prisma.enrollment.count({ where: { subjects: { has: existing.name } } }),
      prisma.teacher.count({ where: { subjects: { contains: existing.name } } }),
      prisma.examPaper.count({ where: { subject: existing.name } }),
      prisma.studyMaterial.count({ where: { subject: existing.name } }),
    ])
    if (counts.some(count => count > 0)) return NextResponse.json({ error: '该学科已被业务数据使用，不能直接改名；仍可修改标签颜色' }, { status: 409 })
  }
  if (body.name && body.name !== existing.name && await prisma.subject.findUnique({ where: { name: body.name } })) return NextResponse.json({ error: '该学科名称已存在' }, { status: 409 })
  const subject = await prisma.$transaction(async tx => {
    const updated = await tx.subject.update({ where: { id }, data: body })
    await tx.activityLog.create({ data: { userId: user.id, action: '更新了学科', detail: `修改了「${updated.name}」` } })
    return updated
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
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

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
