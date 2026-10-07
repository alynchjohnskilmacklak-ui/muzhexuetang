import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { selectReplacementTeachingDay } from '@/lib/class-schedule-plan'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const body = await req.json().catch(() => ({}))
  const date = typeof body.date === 'string' && body.date.trim() ? body.date.trim() : ''
  const targetDivision = typeof body.division === 'string' && body.division ? body.division : undefined
  const keepPlannedTotal = body.keepPlannedTotal !== false
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
    status: { in: ['WAITING', 'ACTIVE'] },
    course: { isActive: true },
    term: { status: 'ACTIVE' },
  }
  if (targetDivision) {
    groupWhere.division = targetDivision as 'JUNIOR' | 'SENIOR'
  }
  if (groupIds.length) {
    groupWhere.id = { in: groupIds }
  }

  const groups = await prisma.classGroup.findMany({
    where: groupWhere,
    select: {
      id: true,
      name: true,
      division: true,
      totalLessons: true,
      course: { select: { totalLessons: true } },
      enrollments: { where: { status: 'ACTIVE', deletedAt: null }, select: { studentId: true, subjects: true } },
    },
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
  let skippedNoReplacement = 0
  let replacedGroups = 0
  let replacedLessons = 0
  let alreadyBalanced = 0
  const replacementDates = new Set<string>()

  // 2. 逐个班级处理
  for (const group of groups) {
    // a. 幂等校验：该班在 targetDate 当天是否已存在非 CANCELLED 课次
    const dayStart = new Date(targetDate)
    const dayEnd = new Date(targetDate)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const existingLessons = await prisma.classLesson.findMany({
      where: {
        groupId: group.id,
        lessonDate: { gte: dayStart, lt: dayEnd },
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        teacherId: true,
        subject: true,
        startTime: true,
        endTime: true,
        isManual: true,
      },
    })
    const existingCount = existingLessons.length
    if (existingCount > 0 && existingLessons.some((lesson) => !lesson.isManual)) {
      skipped++
      continue
    }

    // b. 找"样板日"
    // 优先未来最近的一天
    let templateLesson = existingCount
      ? { lessonDate: targetDate }
      : await prisma.classLesson.findFirst({
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

    const slots = existingCount
      ? existingLessons.map(({ teacherId, subject, startTime, endTime }) => ({
          teacherId,
          subject,
          startTime,
          endTime,
        }))
      : await prisma.classLesson.findMany({
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

    const activeLessonCount = await prisma.classLesson.count({
      where: { groupId: group.id, status: { not: 'CANCELLED' } },
    })
    const plannedDays = Number(group.course.totalLessons || 0)
    const plannedLessonCount = plannedDays > 0 ? plannedDays * slots.length : 0

    let replacement: ReturnType<typeof selectReplacementTeachingDay> = null
    if (keepPlannedTotal) {
      const needsExistingRepair = existingCount > 0
        && (plannedLessonCount === 0 || activeLessonCount > plannedLessonCount)

      if (existingCount > 0 && !needsExistingRepair) {
        alreadyBalanced++
        continue
      }

      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const replacementStart = new Date(Math.max(tomorrow.getTime(), dayEnd.getTime()))
      const candidates = await prisma.classLesson.findMany({
        where: {
          groupId: group.id,
          lessonDate: { gte: replacementStart },
          status: 'SCHEDULED',
          isManual: false,
        },
        select: { id: true, lessonDate: true },
      })
      replacement = selectReplacementTeachingDay(candidates, slots.length)
      if (!replacement) {
        skippedNoReplacement++
        continue
      }
    }

    // c. 复制到 targetDate；计划内调课时同时取消一个未来原排课日
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

    const result = await prisma.$transaction(async (tx) => {
      const created = existingCount > 0
        ? 0
        : (await tx.classLesson.createMany({ data, skipDuplicates: true })).count

      if (created > 0) {
        const createdRows = await tx.classLesson.findMany({
          where: { groupId: group.id, lessonDate: { gte: dayStart, lt: dayEnd }, status: 'SCHEDULED', deletedAt: null },
          select: { id: true, subject: true },
        })
        const rosterRows = createdRows.flatMap((lesson) => group.enrollments
          .filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, lesson.subject))
          .map((enrollment) => ({ lessonId: lesson.id, studentId: enrollment.studentId })))
        if (rosterRows.length) await tx.classLessonStudent.createMany({ data: rosterRows, skipDuplicates: true })
      }

      let replaced = 0
      if (replacement) {
        const updated = await tx.classLesson.updateMany({
          where: {
            id: { in: replacement.lessonIds },
            status: 'SCHEDULED',
          },
          data: {
            status: 'CANCELLED',
            cancelReason: `计划内调课：替换为 ${date}`,
          },
        })
        replaced = updated.count
      }

      const nextTotal = await tx.classLesson.count({
        where: { groupId: group.id, status: { not: 'CANCELLED' } },
      })
      await tx.classGroup.update({
        where: { id: group.id },
        data: { totalLessons: nextTotal },
      })

      return { created, replaced }
    })

    createdLessons += result.created
    replacedLessons += result.replaced
    if (result.replaced > 0 && replacement) {
      replacedGroups++
      replacementDates.add(replacement.date.toISOString().slice(0, 10))
    }
    affectedGroups++
  }

  // 3. activityLog
  if (affectedGroups > 0 || createdLessons > 0) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: keepPlannedTotal ? '计划内调整上课日' : '新增上课日',
        detail: keepPlannedTotal
          ? `${date} 计划内调课：${affectedGroups}个班新增${createdLessons}节，替换${replacedLessons}节`
          : `${date} 额外加课：${affectedGroups}个班新增${createdLessons}节`,
      },
    })
  }

  return NextResponse.json({
    date,
    affectedGroups,
    createdLessons,
    skipped,
    skippedNoTemplate,
    skippedNoReplacement,
    replacedGroups,
    replacedLessons,
    replacementDates: [...replacementDates].sort(),
    alreadyBalanced,
    keepPlannedTotal,
  })
})
