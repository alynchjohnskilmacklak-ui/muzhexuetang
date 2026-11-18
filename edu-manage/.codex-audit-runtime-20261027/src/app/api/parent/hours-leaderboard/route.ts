import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { parentActiveEnrollmentWhere } from '@/lib/business-visibility'
import { findParentChild, getParentChildren } from '@/lib/parent-children'

/** 姓名脱敏：王*然 / 李*（仅对外展示用，不向家长端暴露同班学生完整姓名） */
function maskNameForParent(name: string) {
  if (!name) return '同学'
  const trimmed = name.trim()
  if (trimmed.length <= 2) return `${trimmed[0]}*`
  return `${trimmed[0]}*${trimmed[trimmed.length - 1]}`
}

export const dynamic = 'force-dynamic'

interface HoursLeaderboardPayload {
  studentName: string
  mineHours: number
  classmates: Array<{ maskedName: string; hours: number }>
  hasData: boolean
}

/**
 * 家长端「课时领先榜」取数接口
 * 口径与家长首页一致：
 *  - 课时 = 本月考勤记录 hoursDeducted 累计
 *  - 同班同学 = 孩子所有活跃班级（enrollment.group）内的其他学员
 */
export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const linkedStudents = await getParentChildren(prisma, user.id)
  if (linkedStudents.length === 0) {
    return NextResponse.json<HoursLeaderboardPayload>({
      studentName: '我的孩子',
      mineHours: 0,
      classmates: [],
      hasData: false,
    })
  }

  const requested = req.nextUrl.searchParams.get('studentId')
  const target = findParentChild(linkedStudents, requested)
  if (!target) return NextResponse.json({ error: '未找到该孩子的档案，请刷新后重试' }, { status: 404 })

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const myEnrollments = await prisma.enrollment.findMany({
    where: { studentId: { in: target.recordIds }, ...parentActiveEnrollmentWhere(user.id) },
    select: { studentId: true, groupId: true },
  })
  const relatedGroupIds = [...new Set(myEnrollments.map((item) => item.groupId).filter((id): id is string => Boolean(id)))]

  let payload: HoursLeaderboardPayload = {
    studentName: target.name,
    mineHours: 0,
    classmates: [],
    hasData: false,
  }

  if (relatedGroupIds.length > 0) {
    const classmates = await prisma.enrollment.findMany({
      where: { groupId: { in: relatedGroupIds }, status: 'ACTIVE', student: { deletedAt: null } },
      select: { groupId: true, student: { select: { id: true, name: true } } },
    })
    const classmateIds = [...new Set(classmates.map((item) => item.student.id))]
    const hoursRows = classmateIds.length > 0 ? await prisma.attendance.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: classmateIds },
        lesson: { lessonDate: { gte: monthStart, lt: monthEnd } },
        deletedAt: null,
      },
      _sum: { hoursDeducted: true },
    }) : []
    const hoursByStudent = new Map(hoursRows.map((row) => [row.studentId, Number(row._sum.hoursDeducted || 0)]))
    const nameById = new Map(classmates.map((item) => [item.student.id, item.student.name]))

    const studentGroupIds = new Map<string, Set<string>>()
    for (const item of classmates) {
      if (!studentGroupIds.has(item.student.id)) studentGroupIds.set(item.student.id, new Set())
      studentGroupIds.get(item.student.id)?.add(item.groupId)
    }
    const myGroupIds = new Set(myEnrollments.map((item) => item.groupId))
    const peerIds = [...studentGroupIds.keys()].filter((peerId) => {
      if (target.recordIds.includes(peerId)) return false
      const peerGroups = studentGroupIds.get(peerId)
      return !!peerGroups && [...myGroupIds].some((groupId) => peerGroups.has(groupId))
    })

    const mine = target.recordIds.reduce((total, id) => total + (hoursByStudent.get(id) || 0), 0)
    const classmatesData = peerIds.map((peerId) => ({
      maskedName: maskNameForParent(nameById.get(peerId) || ''),
      hours: Number((hoursByStudent.get(peerId) || 0).toFixed(1)),
    }))
    payload = {
      studentName: target.name,
      mineHours: Number(mine.toFixed(1)),
      classmates: classmatesData,
      hasData: mine > 0 && classmatesData.some((item) => item.hours > 0),
    }
  }

  return NextResponse.json(payload)
})
