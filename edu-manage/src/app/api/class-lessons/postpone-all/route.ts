import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { attendanceEligibleLessonWhere, visibleClassGroupWhere } from '@/lib/business-visibility'
import { addDays } from 'date-fns'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { lessonId, offsetDays } = body

  const lesson = await prisma.classLesson.findFirst({
    where: { id: lessonId, ...attendanceEligibleLessonWhere },
    include: { group: true },
  })
  if (!lesson) return NextResponse.json({ error: '课次不存在' }, { status: 404 })

  const days = offsetDays || 7

  const lessons = await prisma.classLesson.findMany({
    where: {
      groupId: lesson.groupId,
      group: visibleClassGroupWhere,
      lessonDate: { gte: lesson.lessonDate },
      status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] },
    },
  })

  await prisma.$transaction(
    lessons.map((l) =>
      prisma.classLesson.update({
        where: { id: l.id },
        data: { lessonDate: addDays(l.lessonDate, days) },
      })
    )
  )

  await prisma.activityLog.create({
    data: { userId: user.id, action: '一键后移课次', detail: `${lesson.group.name} 后移${days}天` },
  })

  return NextResponse.json({ success: true, count: lessons.length })
})
