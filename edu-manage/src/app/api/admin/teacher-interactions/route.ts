import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser } from '@/lib/teacher-portal'
import { getRequestDivision, divisionWhere } from '@/lib/division'
import { getLocalDayRange, localDateKey, todayLocal } from '@/lib/date/local-day'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const admin = await requireAdminUser()
  const { prisma } = admin
  const sp = req.nextUrl.searchParams

  const division = getRequestDivision(admin, sp.get('division'))
  const range = sp.get('range') || '30d' // today | 7d | 30d | term | custom | all
  const startDateParam = sp.get('startDate')
  const endDateParam = sp.get('endDate')
  const subjectFilter = sp.get('subject')?.trim() || undefined
  const teacherIdFilter = sp.get('teacherId')?.trim() || undefined
  const searchKeyword = sp.get('search')?.trim().toLowerCase() || ''

  const now = new Date()
  let gteDate: Date | undefined
  let lteDate: Date | undefined

  if (range === 'today') {
    const todayStr = todayLocal()
    const dayRange = getLocalDayRange(todayStr)
    gteDate = dayRange.start
    lteDate = dayRange.end
  } else if (range === '7d') {
    gteDate = new Date(now.getTime() - 7 * 86_400_000)
    lteDate = now
  } else if (range === '30d' || range === 'month') {
    gteDate = new Date(now.getTime() - 30 * 86_400_000)
    lteDate = now
  } else if (range === 'custom' && startDateParam) {
    try {
      const startRange = getLocalDayRange(startDateParam)
      gteDate = startRange.start
      if (endDateParam) {
        const endRange = getLocalDayRange(endDateParam)
        lteDate = endRange.end
      } else {
        lteDate = now
      }
    } catch {
      gteDate = new Date(now.getTime() - 30 * 86_400_000)
      lteDate = now
    }
  } else if (range === 'all') {
    gteDate = undefined
    lteDate = undefined
  } else {
    // 默认近 30 天
    gteDate = new Date(now.getTime() - 30 * 86_400_000)
    lteDate = now
  }

  // 1. 获取范围内的所有课堂提问记录
  const picks = await prisma.classroomPick.findMany({
    where: {
      ...(gteDate || lteDate
        ? {
            createdAt: {
              ...(gteDate ? { gte: gteDate } : {}),
              ...(lteDate ? { lte: lteDate } : {}),
            },
          }
        : {}),
      ...(teacherIdFilter ? { teacherId: teacherIdFilter } : {}),
      ...(subjectFilter ? { lesson: { subject: subjectFilter } } : {}),
      ...(division ? { lesson: { group: { division } } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      lessonId: true,
      studentId: true,
      teacherId: true,
      round: true,
      source: true,
      questionLabel: true,
      result: true,
      comment: true,
      createdAt: true,
      lesson: {
        select: {
          id: true,
          lessonDate: true,
          startTime: true,
          endTime: true,
          subject: true,
          group: {
            select: {
              id: true,
              name: true,
              division: true,
              course: { select: { name: true, subject: true } },
            },
          },
        },
      },
    },
  })

  // 2. 收集涉及的所有 studentId，批量查询学员信息
  const studentIds = Array.from(new Set(picks.map((p) => p.studentId).filter(Boolean)))
  const rawStudents = studentIds.length > 0
    ? await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true, grade: true, gender: true },
      })
    : []
  type StudentItem = {
    id: string
    name: string
    grade: string | null
    gender: string | null
  }
  const studentMap = new Map<string, StudentItem>(
    (rawStudents as any[]).map((s: any) => [s.id, s as StudentItem])
  )

  // 3. 获取所有教师及带课情况（用于“有课教师”与“暂无排课”分组筛选）
  const [allTeachers, activeGroups, groupCoTeachers, activeLessons] = await Promise.all([
    prisma.teacher.findMany({
      where: {
        status: 'ACTIVE',
        ...(division ? divisionWhere(division) : {}),
        ...(teacherIdFilter ? { id: teacherIdFilter } : {}),
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        gender: true,
        tierLevel: true,
        subjects: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    }),
    // 活跃班级主讲教师
    prisma.classGroup.findMany({
      where: {
        status: { in: ['ACTIVE', 'WAITING'] },
        deletedAt: null,
        ...(division ? { division } : {}),
      },
      select: { id: true, teacherId: true },
    }),
    // 活跃班级联合授课教师
    prisma.classGroupTeacher.findMany({
      where: {
        group: {
          status: { in: ['ACTIVE', 'WAITING'] },
          deletedAt: null,
          ...(division ? { division } : {}),
        },
      },
      select: { teacherId: true },
    }),
    // 有效排课课次（排除已取消）
    prisma.classLesson.findMany({
      where: {
        status: { not: 'CANCELLED' },
        teacherId: { not: null },
        ...(division ? { division } : {}),
      },
      select: { teacherId: true },
    }),
  ])

  // 统计每位教师关联的在教班级数与排课数
  const teacherGroupCounts = new Map<string, number>()
  for (const g of activeGroups) {
    if (g.teacherId) {
      teacherGroupCounts.set(g.teacherId, (teacherGroupCounts.get(g.teacherId) || 0) + 1)
    }
  }
  for (const ct of groupCoTeachers) {
    if (ct.teacherId) {
      teacherGroupCounts.set(ct.teacherId, (teacherGroupCounts.get(ct.teacherId) || 0) + 1)
    }
  }

  const teacherLessonCounts = new Map<string, number>()
  for (const l of activeLessons) {
    if (l.teacherId) {
      teacherLessonCounts.set(l.teacherId, (teacherLessonCounts.get(l.teacherId) || 0) + 1)
    }
  }

  // 建立教师聚合 Map
  type StudentAgg = {
    studentId: string
    studentName: string
    grade: string | null
    gender: string | null
    pickCount: number
    correctCount: number
    partialCount: number
    needsWorkCount: number
    noAnswerCount: number
    lastPickedAt: string
    lastResult: string | null
    lastComment: string | null
  }

  type TeacherPickDetail = {
    id: string
    lessonId: string
    groupName: string
    courseName: string
    subject: string
    lessonDate: string
    timeRange: string
    studentId: string
    studentName: string
    grade: string | null
    round: number
    source: 'RANDOM' | 'MANUAL'
    questionLabel: string | null
    result: string | null
    comment: string | null
    createdAt: string
  }

  // 按 teacherId 分组归纳
  const teacherPicksMap = new Map<string, typeof picks>()
  for (const pick of picks) {
    const list = teacherPicksMap.get(pick.teacherId) || []
    list.push(pick)
    teacherPicksMap.set(pick.teacherId, list)
  }

  // 构建教师统计列表
  const teacherResults = allTeachers.map((t) => {
    const tPicks = teacherPicksMap.get(t.id) || []
    const lessonSet = new Set<string>()
    const studentAggMap = new Map<string, StudentAgg>()

    let correctCount = 0
    let partialCount = 0
    let needsWorkCount = 0
    let noAnswerCount = 0
    let randomCount = 0

    const recentPicks: TeacherPickDetail[] = []

    for (const p of tPicks) {
      if (p.lessonId) lessonSet.add(p.lessonId)
      if (p.source === 'RANDOM') randomCount++

      if (p.result === 'CORRECT') correctCount++
      else if (p.result === 'PARTIAL') partialCount++
      else if (p.result === 'NEEDS_WORK') needsWorkCount++
      else if (p.result === 'NO_ANSWER') noAnswerCount++

      const sInfo = studentMap.get(p.studentId)
      const sName = sInfo?.name || '学员'
      const sGrade = sInfo?.grade || null
      const sGender = sInfo?.gender || null

      let sAgg = studentAggMap.get(p.studentId)
      if (!sAgg) {
        sAgg = {
          studentId: p.studentId,
          studentName: sName,
          grade: sGrade,
          gender: sGender,
          pickCount: 0,
          correctCount: 0,
          partialCount: 0,
          needsWorkCount: 0,
          noAnswerCount: 0,
          lastPickedAt: p.createdAt.toISOString(),
          lastResult: p.result,
          lastComment: p.comment,
        }
        studentAggMap.set(p.studentId, sAgg)
      }

      sAgg.pickCount++
      if (p.result === 'CORRECT') sAgg.correctCount++
      else if (p.result === 'PARTIAL') sAgg.partialCount++
      else if (p.result === 'NEEDS_WORK') sAgg.needsWorkCount++
      else if (p.result === 'NO_ANSWER') sAgg.noAnswerCount++

      if (recentPicks.length < 50) {
        const lDateStr = p.lesson?.lessonDate ? localDateKey(p.lesson.lessonDate) : ''
        const tRange = p.lesson?.startTime && p.lesson?.endTime
          ? `${p.lesson.startTime}–${p.lesson.endTime}`
          : p.lesson?.startTime || ''
        recentPicks.push({
          id: p.id,
          lessonId: p.lessonId,
          groupName: p.lesson?.group?.name || '日常班课',
          courseName: p.lesson?.group?.course?.name || '',
          subject: p.lesson?.subject || p.lesson?.group?.course?.subject || t.subjects || '通用',
          lessonDate: lDateStr,
          timeRange: tRange,
          studentId: p.studentId,
          studentName: sName,
          grade: sGrade,
          round: p.round,
          source: p.source === 'MANUAL' ? 'MANUAL' : 'RANDOM',
          questionLabel: p.questionLabel,
          result: p.result,
          comment: p.comment,
          createdAt: p.createdAt.toISOString(),
        })
      }
    }

    const studentRanking = Array.from(studentAggMap.values()).sort(
      (a, b) => b.pickCount - a.pickCount
    )

    const ratedCount = correctCount + partialCount + needsWorkCount + noAnswerCount
    const correctRate = ratedCount > 0 ? Math.round(((correctCount + partialCount * 0.5) / ratedCount) * 100) : 0

    const activeGroupsCount = teacherGroupCounts.get(t.id) || 0
    const activeLessonsCount = teacherLessonCounts.get(t.id) || 0
    const hasClasses = activeGroupsCount > 0 || activeLessonsCount > 0 || tPicks.length > 0 || lessonSet.size > 0

    return {
      teacher: t,
      hasClasses,
      activeGroupsCount,
      activeLessonsCount,
      stats: {
        totalPicks: tPicks.length,
        uniqueStudentsCount: studentRanking.length,
        totalLessons: lessonSet.size,
        avgPicksPerLesson: lessonSet.size > 0 ? Number((tPicks.length / lessonSet.size).toFixed(1)) : 0,
        correctCount,
        partialCount,
        needsWorkCount,
        noAnswerCount,
        randomRatio: tPicks.length > 0 ? Math.round((randomCount / tPicks.length) * 100) : 0,
        correctRate,
        lastInteractionAt: tPicks[0]?.createdAt ? tPicks[0].createdAt.toISOString() : null,
      },
      topStudentsPreview: studentRanking.slice(0, 3).map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        grade: s.grade,
        pickCount: s.pickCount,
      })),
      studentRanking,
      recentPicks,
    }
  })

  // 排序：默认有课教师排在最前，其次按提问总数与带课量排序
  teacherResults.sort((a, b) => {
    if (a.hasClasses !== b.hasClasses) {
      return a.hasClasses ? -1 : 1
    }
    if (b.stats.totalPicks !== a.stats.totalPicks) {
      return b.stats.totalPicks - a.stats.totalPicks
    }
    return (b.activeGroupsCount + b.activeLessonsCount) - (a.activeGroupsCount + a.activeLessonsCount)
  })

  // 如果有搜索词，根据教师姓名或提问学员姓名过滤
  const filteredTeachers = searchKeyword
    ? teacherResults.filter((item) => {
        const teacherMatch = item.teacher.name.toLowerCase().includes(searchKeyword)
        const studentMatch = item.studentRanking.some((s) =>
          s.studentName.toLowerCase().includes(searchKeyword)
        )
        return teacherMatch || studentMatch
      })
    : teacherResults

  // 计算全局宏观汇总
  const globalTotalPicks = picks.length
  const globalUniqueStudents = studentIds.length
  const activeTeachers = teacherResults.filter((t) => t.stats.totalPicks > 0).length
  const teachersWithClassesCount = teacherResults.filter((t) => t.hasClasses).length
  const idleTeachersCount = allTeachers.length - teachersWithClassesCount
  const globalLessons = new Set(picks.map((p) => p.lessonId).filter(Boolean)).size
  const globalCorrect = picks.filter((p) => p.result === 'CORRECT').length
  const globalPartial = picks.filter((p) => p.result === 'PARTIAL').length
  const globalNeedsWork = picks.filter((p) => p.result === 'NEEDS_WORK').length
  const globalNoAnswer = picks.filter((p) => p.result === 'NO_ANSWER').length
  const globalRated = globalCorrect + globalPartial + globalNeedsWork + globalNoAnswer
  const overallCorrectRate = globalRated > 0
    ? Math.round(((globalCorrect + globalPartial * 0.5) / globalRated) * 100)
    : 0
  const globalRandom = picks.filter((p) => p.source === 'RANDOM').length
  const overallRandomRatio = globalTotalPicks > 0 ? Math.round((globalRandom / globalTotalPicks) * 100) : 0

  return NextResponse.json({
    summary: {
      totalPicks: globalTotalPicks,
      totalStudentsCovered: globalUniqueStudents,
      activeTeachersCount: activeTeachers,
      totalTeachersCount: allTeachers.length,
      teachersWithClassesCount,
      idleTeachersCount,
      totalLessons: globalLessons,
      avgPicksPerLesson: globalLessons > 0 ? Number((globalTotalPicks / globalLessons).toFixed(1)) : 0,
      overallCorrectRate,
      needsWorkCount: globalNeedsWork,
      randomRatio: overallRandomRatio,
    },
    teachers: filteredTeachers,
    timeRange: {
      range,
      startDate: gteDate ? gteDate.toISOString() : null,
      endDate: lteDate ? lteDate.toISOString() : null,
    },
  })
})
