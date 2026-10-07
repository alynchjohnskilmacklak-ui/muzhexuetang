import { getRequestPrisma } from '@/lib/prisma'
import { Prisma, type PrismaClient } from '@prisma/client'
import { getEffectiveMealMenuForDate } from '@/lib/meal-template'
import {
  parentActiveEnrollmentWhere,
  parentLinkedStudentWhere,
  parentVisibleExamPaperWhere,
  parentVisibleLessonWhere,
  parentVisiblePerformancePostWhere,
  visibleClassroomFeedbackWhere,
  visibleNotificationWhere,
  visibleTeacherWhere,
} from '@/lib/business-visibility'
import { redactFeedbackForParent } from '@/lib/classroom-feedback/access'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { selectLatestParentStudents, sortParentStudentsByCurrentTerm, currentTermLabel } from '@/lib/parent-student-selection'
import { resolveTier, TIER_RANK } from '@/constants/teacher-tier'

/** 姓名脱敏：王*然 / 李*（保留首末字，同姓同学也能区分；仅家长端对外展示用） */
function maskNameForParent(name: string) {
  if (!name) return '同学'
  const trimmed = name.trim()
  if (trimmed.length <= 2) return `${trimmed[0]}*`
  return `${trimmed[0]}*${trimmed[trimmed.length - 1]}`
}

type DashboardLinkedStudent = {
  id: string
  name: string
  gender: string | null
  birthYear: number | null
  grade: string | null
  updatedAt: Date
  membershipLevel: string | null
  mainTeacher: { id: string; name: string; tierLevel: string | null } | null
  enrollments: Array<{ group: { teacher: { id: string; name: string; tierLevel: string | null } | null } | null }>
  termMemberships: Array<{
    grade: string | null
    status: string
    joinedAt: Date
    term: { status: string; startDate: Date; name: string }
  }>
}

export async function getParentDashboardData(userId: string, prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? await getRequestPrisma()
  const linkedStudents = await prisma.student.findMany({
    where: parentLinkedStudentWhere(userId),
    select: {
      id: true,
      name: true,
      grade: true,
      membershipLevel: true,
      gender: true,
      birthYear: true,
      updatedAt: true,
      mainTeacher: { select: { id: true, name: true, tierLevel: true } },
      enrollments: {
        where: {
          ...parentActiveEnrollmentWhere(userId),
          group: { ...(parentActiveEnrollmentWhere(userId).group as Prisma.ClassGroupWhereInput | undefined), term: { is: { status: 'ACTIVE' } } },
        },
        select: {
          group: {
            select: {
              teacher: { select: { id: true, name: true, tierLevel: true } },
            },
          },
        },
      },
      termMemberships: {
        select: {
          grade: true,
          status: true,
          joinedAt: true,
          term: { select: { status: true, startDate: true, name: true } },
        },
      },
    },
  })
  const merged = selectLatestParentStudents(linkedStudents as unknown as DashboardLinkedStudent[])
  const students = sortParentStudentsByCurrentTerm(merged).map((student) => ({ ...student, termName: currentTermLabel(student) }))

  const studentIds = students.map((student) => student.id)
  const studentTeachers: Record<string, string[]> = {}
  for (const student of students) {
    const teacherSet = new Set<string>()
    if (student.mainTeacher?.name) teacherSet.add(student.mainTeacher.name)
    for (const enrollment of student.enrollments) {
      if (enrollment.group?.teacher?.name) teacherSet.add(enrollment.group.teacher.name)
    }
    studentTeachers[student.id] = [...teacherSet]
  }

  // 家长端 hero 卡：从主负责老师 + 报名学科老师中取等级最高的老师展示
  const studentTopTeacher: Record<string, { name: string; tierLevel?: string | null }> = {}
  for (const student of students) {
    const candidates: { name: string; tierLevel?: string | null }[] = []
    if (student.mainTeacher?.name) candidates.push(student.mainTeacher)
    for (const enrollment of student.enrollments) {
      if (enrollment.group?.teacher?.name) candidates.push(enrollment.group.teacher)
    }
    let top: { name: string; tierLevel?: string | null } | null = null
    for (const candidate of candidates) {
      if (!top || TIER_RANK[resolveTier(candidate.tierLevel)] > TIER_RANK[resolveTier(top.tierLevel)]) {
        top = candidate
      }
    }
    studentTopTeacher[student.id] = top ?? { name: '待分配' }
  }

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const [
    todayClassLessons,
    notifications,
    latestPost,
    latestClassroomFeedback,
    latestFeedbackRows,
    monthMoods,
    monthClassroomFeedbacks,
    monthAttendances,
    badgeRows,
    todayAttendances,
    todayFeedbackRows,
    todayPaperRows,
    todayMeal,
    upcomingParentLessons,
    upcomingLessonMaterials,
  ] = await Promise.all([
    prisma.classLesson.findMany({
      where: {
        ...parentVisibleLessonWhere(userId),
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        lessonDate: { gte: todayStart, lt: todayEnd },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        lessonDate: true,
        attendanceSubmittedAt: true,
        group: {
          select: {
            course: { select: { name: true } },
            teacher: { select: { name: true } },
            room: { select: { name: true } },
            enrollments: {
              where: parentActiveEnrollmentWhere(userId),
              select: { student: { select: { id: true, name: true } } },
            },
          },
        },
        teacher: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.notification.findMany({
      where: { userId, ...visibleNotificationWhere },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.performancePost.findFirst({
      where: parentVisiblePerformancePostWhere(userId),
      include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.classroomFeedback.findFirst({
      where: {
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: studentIds },
        teacher: visibleTeacherWhere,
      },
      include: { teacher: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.classroomFeedback.findMany({
      where: {
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: studentIds },
        teacher: visibleTeacherWhere,
      },
      select: {
        id: true,
        createdAt: true,
        studentIds: true,
        summary: true,
        teacher: { select: { name: true } },
        classLesson: {
          select: {
            lessonDate: true,
            subject: true,
            group: { select: { course: { select: { subject: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.performancePost.findMany({
      where: { ...parentVisiblePerformancePostWhere(userId), createdAt: { gte: monthStart, lt: monthEnd } },
      select: { createdAt: true, mood: true, id: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.classroomFeedback.findMany({
      where: {
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: studentIds },
        teacher: visibleTeacherWhere,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      select: { id: true, createdAt: true, summary: true, studentIds: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.attendance.findMany({
      where: {
        student: parentLinkedStudentWhere(userId),
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      select: { status: true, studentId: true },
    }),
    prisma.achievementBadge.findMany({
      where: { student: parentLinkedStudentWhere(userId) },
      select: { studentId: true },
    }),
    prisma.attendance.findMany({
      where: {
        student: parentLinkedStudentWhere(userId),
        lesson: { lessonDate: { gte: todayStart, lt: todayEnd } },
      },
      select: { id: true, status: true, hoursDeducted: true, createdAt: true, lessonId: true, studentId: true },
    }),
    prisma.classroomFeedback.findMany({
      where: {
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: studentIds },
        teacher: visibleTeacherWhere,
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      select: {
        id: true,
        createdAt: true,
        studentIds: true,
        summary: true,
        knowledgeCard: true,
        feedbackCourseType: true,
        teacher: { select: { name: true } },
        classLesson: {
          select: {
            subject: true,
            group: {
              select: {
                course: { select: { subject: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.examPaper.findMany({
      where: {
        ...parentVisibleExamPaperWhere(userId),
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      select: { id: true, studentId: true },
    }),
    getEffectiveMealMenuForDate(today, prisma),
    prisma.classLesson.findMany({
      where: {
        ...parentVisibleLessonWhere(userId),
        lessonDate: { gte: todayStart },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
      },
      select: {
        id: true,
        teacherId: true,
        lessonDate: true,
        startTime: true,
        endTime: true,
        subject: true,
        group: {
          select: {
            name: true,
            teacherId: true,
            teacherAssignments: { select: { teacherId: true } },
            course: { select: { subject: true } },
            enrollments: { where: parentActiveEnrollmentWhere(userId), select: { studentId: true } },
          },
        },
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
      take: 180,
    }),
    prisma.studyMaterial.findMany({
      where: {
        isLessonPreview: true,
        status: 'PUBLISHED',
        audience: { in: ['STUDENT', 'BOTH'] },
        classLesson: {
          lessonDate: { gte: todayStart },
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
        },
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
        subject: true,
        description: true,
        createdAt: true,
        teacherId: true,
        teacher: { select: { name: true } },
        classLesson: {
          select: {
            id: true,
            lessonDate: true,
            startTime: true,
            endTime: true,
            subject: true,
            group: {
              select: {
                name: true,
                course: { select: { subject: true } },
                enrollments: { where: parentActiveEnrollmentWhere(userId), select: { studentId: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  const filteredTodayClassLessons = todayClassLessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.group?.course?.name || '-',
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    teacherName: lesson.teacher?.name || lesson.group?.teacher?.name || null,
    roomName: lesson.group?.room?.name || null,
    studentIds: lesson.group?.enrollments?.map((enrollment) => enrollment.student?.id).filter(Boolean) || [],
    startTimeRaw: lesson.lessonDate ? `${new Date(lesson.lessonDate).toISOString().slice(0, 10)}T${lesson.startTime}` : null,
    endTimeRaw: lesson.lessonDate ? `${new Date(lesson.lessonDate).toISOString().slice(0, 10)}T${lesson.endTime}` : null,
    attendanceSubmittedAt: lesson.attendanceSubmittedAt?.toISOString() || null,
  }))

  const presentCount = monthAttendances.filter((attendance) => attendance.status === 'PRESENT').length
  const totalCount = monthAttendances.length
  // 无考勤记录时为 null（前端显示"暂无考勤记录"），避免把 0 条记录误判为 100% 全勤
  const attendanceRate: number | null = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null
  const badgeCount = badgeRows.length
  const todayFeedbackCount = todayFeedbackRows.length
  const todayPaperCount = todayPaperRows.length
  const studentStats = Object.fromEntries(studentIds.map((studentId) => {
    const studentAttendances = monthAttendances.filter((attendance) => attendance.studentId === studentId)
    const studentPresentCount = studentAttendances.filter((attendance) => attendance.status === 'PRESENT').length
    return [studentId, {
      attendanceRate: studentAttendances.length > 0 ? Math.round((studentPresentCount / studentAttendances.length) * 100) : null,
      badgeCount: badgeRows.filter((badge) => badge.studentId === studentId).length,
      todayFeedbackCount: todayFeedbackRows.filter((feedback) => feedback.studentIds.includes(studentId)).length,
      todayPaperCount: todayPaperRows.filter((paper) => paper.studentId === studentId).length,
    }]
  }))
  const parentLatestClassroomFeedback = latestClassroomFeedback
    ? redactFeedbackForParent(latestClassroomFeedback, studentIds)
    : null

  // 按孩子返回最近一条有效课堂反馈（多孩子家庭切换孩子时，最新关注不再因反馈属于另一个孩子而变空）
  const latestFeedbackByStudent: Record<string, {
    id: string
    createdAt: string
    lessonDate: string | null
    subject: string | null
    teacherName: string | null
    summary: string | null
  }> = {}
  for (const feedback of latestFeedbackRows) {
    for (const studentId of feedback.studentIds) {
      if (!studentIds.includes(studentId) || latestFeedbackByStudent[studentId]) continue
      latestFeedbackByStudent[studentId] = {
        id: feedback.id,
        createdAt: feedback.createdAt.toISOString(),
        lessonDate: feedback.classLesson?.lessonDate
          ? new Date(feedback.classLesson.lessonDate).toISOString().slice(0, 10)
          : null,
        subject:
          feedback.classLesson?.subject
          || feedback.classLesson?.group?.course?.subject
          || null,
        teacherName: feedback.teacher?.name || null,
        summary: feedback.summary || null,
      }
    }
  }

  // ===== 课时领先榜（家长端）：我的课时 vs 同班同学 =====
  // 同班同学 = 孩子所有活跃班级（enrollment.group）内的其他学员；
  // 课时口径 = 本月考勤记录 hoursDeducted 累计（与课时记录页一致）。
  const myEnrollments = await prisma.enrollment.findMany({
    where: { studentId: { in: studentIds }, ...parentActiveEnrollmentWhere(userId) },
    select: { studentId: true, groupId: true },
  })
  const relatedGroupIds = [...new Set(myEnrollments.map((item) => item.groupId).filter((id): id is string => Boolean(id)))]
  let classHoursByStudent: Record<string, { mineHours: number; classmates: Array<{ maskedName: string; hours: number }>; hasData: boolean }> = {}
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
    classHoursByStudent = Object.fromEntries(studentIds.map((studentId) => {
      const myGroupIds = new Set(myEnrollments.filter((item) => item.studentId === studentId).map((item) => item.groupId))
      const peerIds = [...studentGroupIds.keys()].filter((peerId) => {
        if (peerId === studentId) return false
        const peerGroups = studentGroupIds.get(peerId)
        return !!peerGroups && [...myGroupIds].some((groupId) => peerGroups.has(groupId))
      })
      const mine = hoursByStudent.get(studentId) || 0
      const classmatesData = peerIds.map((peerId) => ({
        maskedName: maskNameForParent(nameById.get(peerId) || ''),
        hours: Number((hoursByStudent.get(peerId) || 0).toFixed(1)),
      }))
      return [studentId, {
        mineHours: Number(mine.toFixed(1)),
        classmates: classmatesData,
        hasData: mine > 0 && classmatesData.some((item) => item.hours > 0),
      }]
    }))
  }

  const parentMonthClassroomFeedbacks = monthClassroomFeedbacks.map((feedback) => ({
    ...feedback,
    studentIds: feedback.studentIds.filter((studentId) => studentIds.includes(studentId)),
  }))
  const upcomingLessonsById = new Map(upcomingParentLessons.map((lesson) => [lesson.id, lesson]))
  const lessonPreviews = upcomingLessonMaterials.flatMap((material) => {
    if (!material.classLesson) return []
    const lesson = upcomingLessonsById.get(material.classLesson.id)
    if (!lesson) return []
    const studentIds = [...new Set(lesson.group.enrollments.map((item) => item.studentId))]
    return [{
      id: material.id,
      title: material.title,
      fileName: material.fileName,
      fileType: material.fileType,
      description: material.description,
      createdAt: material.createdAt,
      lessonDate: lesson.lessonDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      subject: material.subject,
      teacherName: material.teacher?.name || '授课老师',
      groupName: lesson.group.name,
      studentIds,
    }]
  })

  return {
    parentUserId: userId,
    students: students.map(({ id, name, grade, membershipLevel, termName }) => ({ id, name, grade, membershipLevel, termName })),
    studentTeachers,
    studentTopTeacher,
    todaySchedules: [],
    todayClassLessons: filteredTodayClassLessons,
    notifications,
    latestPost,
    latestClassroomFeedback: parentLatestClassroomFeedback,
    latestFeedbackByStudent,
    monthMoods,
    monthClassroomFeedbacks: parentMonthClassroomFeedbacks,
    attendanceRate,
    badgeCount,
    studentStats,
    classHoursByStudent,
    todayAttendances,
    todayFeedbacks: todayFeedbackRows.map((feedback) => ({
      id: feedback.id,
      createdAt: feedback.createdAt,
      studentIds: feedback.studentIds.filter((studentId) => studentIds.includes(studentId)),
      summary: feedback.summary,
      teacherName: feedback.teacher?.name || null,
      subject:
        feedback.classLesson?.subject
        || feedback.classLesson?.group?.course?.subject
        || (feedback.knowledgeCard ? parseStoredKnowledgeCard(feedback.knowledgeCard)?.subject || null : null)
        || null,
    })),
    todayFeedbackCount,
    todayPaperCount,
    todayMeal,
    lessonPreviews,
  }
}
