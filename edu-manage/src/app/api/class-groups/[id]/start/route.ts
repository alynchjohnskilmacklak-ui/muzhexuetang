import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { id } = await params

  try {
    const result = await prisma.$transaction(async (tx) => {
      const group = await tx.classGroup.findUnique({
        where: { id },
        include: {
          course: true,
          teacher: true,
          teacherAssignments: { include: { teacher: true }, orderBy: { createdAt: 'asc' } },
          room: true,
          enrollments: {
            where: { status: 'ACTIVE' },
            include: { student: { include: { parent: true } } },
          },
          classLessons: { orderBy: { lessonDate: 'asc' }, take: 1 },
        },
      })

      if (!group) throw new Error('班级不存在')
      if (group.status === 'ACTIVE') {
        return { group, parentCount: 0, alreadyActive: true }
      }
      if (!group.classLessons.length) throw new Error('请先生成课表后再开班')

      const updated = await tx.classGroup.update({
        where: { id },
        data: { status: 'ACTIVE' },
        include: { course: true, teacher: true, room: true },
      })

      const firstLesson = group.classLessons[0]
      const teacherNames = group.teacherAssignments.length
        ? group.teacherAssignments.map((item) => item.teacher.name).join('、')
        : group.teacher.name
      const parentIds = [...new Set(group.enrollments
        .map((enrollment) => enrollment.student.parentId || enrollment.student.parentUserId)
        .filter((parentId): parentId is string => Boolean(parentId)))]

      if (parentIds.length) {
        await tx.notification.createMany({
          data: parentIds.map((parentId) => ({
            userId: parentId,
            type: 'CLASS_START',
            title: `${group.name} 已开班`,
            content: `课程：${group.course.name}；首次上课：${firstLesson.lessonDate.toLocaleDateString('zh-CN')} ${firstLesson.startTime}-${firstLesson.endTime}；授课团队：${teacherNames}${group.room?.name ? `；教室：${group.room.name}` : ''}。`,
          })),
        })
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: '开班',
          detail: `${group.name} 已开班，通知家长 ${parentIds.length} 人，授课团队：${teacherNames}`,
        },
      })

      return { group: updated, parentCount: parentIds.length, alreadyActive: false }
    })

    revalidatePath('/courses')
    revalidatePath('/schedule')
    revalidatePath('/dashboard')
    revalidatePath('/parent/dashboard')
    revalidatePath('/parent/schedule')

    return NextResponse.json({
      success: true,
      group: result.group,
      notifiedParents: result.parentCount,
      alreadyActive: result.alreadyActive,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '开班失败' }, { status: 400 })
  }
}
