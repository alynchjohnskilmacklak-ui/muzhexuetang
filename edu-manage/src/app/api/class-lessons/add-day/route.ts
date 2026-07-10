import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const body = await req.json().catch(() => ({}))
  const date = typeof body.date === 'string' && body.date.trim() ? body.date.trim() : ''
  const targetDivision = typeof body.division === 'string' && body.division ? body.division : undefined
  const groupIds: string[] = Array.isArray(body.groupIds)
    ? body.groupIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : []

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: '请提供有效日期 (yyyy-MM-dd)' }, { status: 400 })
  }

  const targetDate = new Date(`${date}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: '日期格式不正确' }, { status: 400 })
  }

  // 1. 查出目标班级集合
  const groupWhere: Prisma.ClassGroupWhereInput = {
    status: { not: 'ARCHIVED' },
    course: { isActive: true },
  }
  if (targetDivision) {
    groupWhere.division = targetDivision as 'JUNIOR' | 'SENIOR'
  }
  if (groupIds.length) {
    groupWhere.id = { in: groupIds }
  }

  const groups = await prisma.classGroup.findMany({
    where: groupWhere,
    select: { id: true, name: true, division: true, totalLessons: true },
  })

  if (groups.length === 0) {
    return NextResponse.json({ error: '没有符合条件的在读班级' }, { status: 404 })
  }

  if (groups.length > 100) {
    return NextResponse.json({
      error: `目标班级过多（${groups.length} 个），单次最多处理 100 个班级，请缩小范围或联系管理员分批操作`,
    }, { status: 400 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let affectedGroups = 0
  let createdLessons = 0
  let skipped = 0
  let skippedNoTemplate = 0

  // 2. 逐个班级处理
  for (const group of groups) {
    // a. 幂等校验：该班在 targetDate 当天是否已存在非 CANCELLED 课次
    const dayStart = new Date(targetDate)
    const dayEnd = new Date(targetDate)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const existingCount = await prisma.classLesson.count({
      where: {
        groupId: group.id,
        lessonDate: { gte: dayStart, lt: dayEnd },
        status: { not: 'CANCELLED' },
      },
    })
    if (existingCount > 0) {
      skipped++
      continue
    }

    // b. 找"样板日"
    // 优先未来最近的一天
    let templateLesson = await prisma.classLesson.findFirst({
      where: {
        groupId: group.id,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        lessonDate: { gte: today },
      },
      orderBy: { lessonDate: 'asc' },
      select: { lessonDate: true },
    })

    // 若没有未来课次，取最近的过去一天
    if (!templateLesson) {
      templateLesson = await prisma.classLesson.findFirst({
        where: {
          groupId: group.id,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          lessonDate: { lt: today },
        },
        orderBy: { lessonDate: 'desc' },
        select: { lessonDate: true },
      })
    }

    if (!templateLesson) {
      skippedNoTemplate++
      continue
    }

    // 获取样板日当天的所有非取消课次作为 slots
    const templateDayStart = new Date(templateLesson.lessonDate)
    templateDayStart.setHours(0, 0, 0, 0)
    const templateDayEnd = new Date(templateDayStart)
    templateDayEnd.setDate(templateDayEnd.getDate() + 1)

    const slots = await prisma.classLesson.findMany({
      where: {
        groupId: group.id,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        lessonDate: { gte: templateDayStart, lt: templateDayEnd },
      },
      select: { teacherId: true, subject: true, startTime: true, endTime: true },
    })

    if (!slots.length) {
      skippedNoTemplate++
      continue
    }

    // c. 复制到 targetDate
    const data = slots.map((slot) => ({
      groupId: group.id,
      teacherId: slot.teacherId,
      subject: slot.subject,
      lessonDate: targetDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: 'SCHEDULED' as const,
      division: group.division,
      isManual: true,
    }))

    await prisma.classLesson.createMany({ data, skipDuplicates: true })

    // d. 更新 totalLessons
    await prisma.classGroup.update({
      where: { id: group.id },
      data: { totalLessons: { increment: data.length } },
    })

    createdLessons += data.length
    affectedGroups++
  }

  // 3. activityLog
  if (affectedGroups > 0 || createdLessons > 0) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: '新增上课日',
        detail: `${date} 共${affectedGroups}个班 ${createdLessons}节课`,
      },
    })
  }

  return NextResponse.json({
    date,
    affectedGroups,
    createdLessons,
    skipped,
    skippedNoTemplate,
  })
})
