import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { activeEnrollmentWhere, parentActiveEnrollmentWhere } from '@/lib/business-visibility'
import { findParentChild, getParentChildren } from '@/lib/parent-children'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'

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
  if (user.role !== 'parent') return NextResponse.json({ error: '无权限' }, { status: 403 })
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

  const monthKey = todayLocal().slice(0, 7)
  const [year, month] = monthKey.split('-').map(Number)
  const nextMonthKey = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7)
  const monthStart = getLocalDayRange(`${monthKey}-01`).start
  const monthEnd = getLocalDayRange(`${nextMonthKey}-01`).start

  const myEnrollments = await prisma.enrollment.findMany({
    where: { studentId: { in: target.recordIds }, ...parentActiveEnrollmentWhere(user.id) },
    select: {
      studentId: true,
      groupId: true,
      subjects: true,
    },
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
      where: { groupId: { in: relatedGroupIds }, ...activeEnrollmentWhere },
      select: { groupId: true, subjects: true, student: { select: { id: true, name: true } } },
    })
    const classmateIds = [...new Set(classmates.map((item) => item.student.id))]
    const hoursRows = classmateIds.length > 0 ? await prisma.attendance.findMany({
      where: {
        studentId: { in: classmateIds },
        deletedAt: null,
        lesson: {
          groupId: { in: relatedGroupIds },
          lessonDate: { gte: monthStart, lt: monthEnd },
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          deletedAt: null,
        },
      },
      select: {
        studentId: true,
        hoursDeducted: true,
        lesson: {
          select: {
            lessonDate: true,
            subject: true,
            lessonStudents: { select: { studentId: true } },
            group: {
              select: {
                course: { select: { subject: true } },
                enrollments: {
                  where: { status: 'ACTIVE', deletedAt: null, student: { deletedAt: null } },
                  select: { studentId: true, subjects: true },
                },
              },
            },
          },
        },
      },
      take: 5000,
    }) : []
    const hoursByStudent = new Map<string, number>()
    for (const row of hoursRows) {
      const lesson = row.lesson
      if (!lesson) continue
      const subject = lesson.subject || lesson.group.course?.subject
      const eligibleStudentIds = resolveSubjectLessonStudentIds(
        lesson.lessonStudents.map((item) => item.studentId),
        lesson.group.enrollments,
        subject,
        lesson.lessonDate,
      )
      if (!eligibleStudentIds.includes(row.studentId)) continue
      hoursByStudent.set(row.studentId, (hoursByStudent.get(row.studentId) || 0) + Number(row.hoursDeducted || 0))
    }
    const nameById = new Map(classmates.map((item) => [item.student.id, item.student.name]))

    const studentGroupIds = new Map<string, Set<string>>()
    const studentSubjectsByGroup = new Map<string, Map<string, Set<string>>>()
    for (const item of classmates) {
      if (!studentGroupIds.has(item.student.id)) studentGroupIds.set(item.student.id, new Set())
      studentGroupIds.get(item.student.id)?.add(item.groupId)
      if (!studentSubjectsByGroup.has(item.student.id)) studentSubjectsByGroup.set(item.student.id, new Map())
      const subjectsByGroup = studentSubjectsByGroup.get(item.student.id)!
      if (!subjectsByGroup.has(item.groupId)) subjectsByGroup.set(item.groupId, new Set())
      for (const subject of item.subjects) subjectsByGroup.get(item.groupId)?.add(subject)
    }
    const targetSubjectsByGroup = new Map<string, Set<string>>()
    for (const item of myEnrollments) {
      if (!targetSubjectsByGroup.has(item.groupId)) targetSubjectsByGroup.set(item.groupId, new Set())
      for (const subject of item.subjects) targetSubjectsByGroup.get(item.groupId)?.add(subject)
    }
    const peerIds = [...studentGroupIds.keys()].filter((peerId) => {
      if (target.recordIds.includes(peerId)) return false
      const peerGroups = studentGroupIds.get(peerId)
      if (!peerGroups) return false
      return [...peerGroups].some((groupId) => {
        const targetSubjects = targetSubjectsByGroup.get(groupId)
        const peerSubjects = studentSubjectsByGroup.get(peerId)?.get(groupId)
        return !!targetSubjects && !!peerSubjects && [...targetSubjects].some((subject) => peerSubjects.has(subject))
      })
    })

    const mine = target.recordIds.reduce((total, id) => total + (hoursByStudent.get(id) || 0), 0)
    const classmatesData = peerIds.map((peerId) => ({
      maskedName: maskNameForParent(nameById.get(peerId) || ''),
      hours: Number((hoursByStudent.get(peerId) || 0).toFixed(2)),
    }))
    payload = {
      studentName: target.name,
      mineHours: Number(mine.toFixed(2)),
      classmates: classmatesData,
      hasData: mine > 0 && classmatesData.some((item) => item.hours > 0),
    }
  }

  return NextResponse.json(payload)
})
