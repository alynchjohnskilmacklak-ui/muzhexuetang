import { getRequestPrisma } from '@/lib/prisma'
import { Prisma, type PrismaClient } from '@prisma/client'
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
import { groupParentStudentRecords, sortParentStudentsByCurrentTerm, currentTermLabel } from '@/lib/parent-student-selection'
import { resolveTier, TIER_RANK } from '@/constants/teacher-tier'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'
import { isParentStudentInLesson } from '@/lib/parent-lesson-visibility'

type DashboardLinkedStudent = {
  id: string
  identityId: string
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
      identityId: true,
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
  const groups = groupParentStudentRecords(linkedStudents as unknown as DashboardLinkedStudent[])
  const merged = groups.map(({ student, recordIds }) => ({ ...student, recordIds }))
  const students = sortParentStudentsByCurrentTerm(merged).map((student) => ({ ...student, termName: currentTermLabel(student) }))

  const studentIds = students.flatMap((student) => student.recordIds)
  const canonicalId = (id: string) => students.find((student) => student.recordIds.includes(id))?.id
  const canonicalIds = (ids: string[]) => [...new Set(ids.map(canonicalId).filter((id): id is string => Boolean(id)))]
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

  const todayKey = todayLocal()
  const { start: todayStart, end: todayEnd } = getLocalDayRange(todayKey)
  const tomorrowStart = todayEnd
  const [localYear, localMonth] = todayKey.split('-').map(Number)
  const monthStartKey = `${localYear}-${String(localMonth).padStart(2, '0')}-01`
  const monthEndKey = localMonth === 12
    ? `${localYear + 1}-01-01`
    : `${localYear}-${String(localMonth + 1).padStart(2, '0')}-01`
  const monthStart = getLocalDayRange(monthStartKey).start
  const monthEnd = getLocalDayRange(monthEndKey).start

  const [
    todayClassLessons,
    notifications,
    latestPost,
    latestClassroomFeedback,
    latestFeedbackRows,
    monthAttendanceGroups,
    badgeCountGroups,
    todayAttendanceGroups,
    todayFeedbackRows,
    todayPaperGroups,
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
        subject: true,
        isManual: true,
        attendanceSubmittedAt: true,
        lessonStudents: { select: { studentId: true } },
        group: {
          select: {
            intensiveMode: true,
            course: { select: { name: true, subject: true } },
            teacher: { select: { name: true } },
            room: { select: { name: true } },
            enrollments: {
              where: parentActiveEnrollmentWhere(userId),
              select: { studentId: true, subjects: true, student: { select: { id: true, name: true } } },
            },
          },
        },
        teacher: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.notification.findMany({
      where: { userId, ...visibleNotificationWhere },
      select: {
        id: true,
        title: true,
        type: true,
        relatedType: true,
        relatedId: true,
        href: true,
        read: true,
        studentId: true,
        createdAt: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.performancePost.findFirst({
      where: parentVisiblePerformancePostWhere(userId),
      select: {
        id: true,
        studentId: true,
        content: true,
        createdAt: true,
        student: { select: { name: true } },
        teacher: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.classroomFeedback.findFirst({
      where: {
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: studentIds },
        teacher: visibleTeacherWhere,
      },
      include: {
        teacher: { select: { name: true, subjects: true } },
        classLesson: {
          select: {
            lessonDate: true,
            subject: true,
            group: { select: { course: { select: { subject: true, name: true } } } },
          },
        },
      },
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
        knowledgeCard: true,
        lessonContent: true,
        overallComment: true,
        tags: true,
        teacher: { select: { id: true, name: true, subjects: true, avatar: true, gender: true } },
        classLesson: {
          select: {
            lessonDate: true,
            subject: true,
            group: { select: { course: { select: { subject: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.attendance.groupBy({
      by: ['studentId', 'status'],
      where: {
        student: parentLinkedStudentWhere(userId),
        deletedAt: null,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      _count: { _all: true },
    }),
    prisma.achievementBadge.groupBy({
      by: ['studentId'],
      where: { student: parentLinkedStudentWhere(userId) },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ['studentId'],
      where: {
        student: parentLinkedStudentWhere(userId),
        deletedAt: null,
        lesson: { lessonDate: { gte: todayStart, lt: todayEnd } },
      },
      _max: { createdAt: true },
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
    prisma.examPaper.groupBy({
      by: ['studentId'],
      where: {
        ...parentVisibleExamPaperWhere(userId),
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      _count: { _all: true },
    }),
    prisma.classLesson.findMany({
      where: {
        ...parentVisibleLessonWhere(userId),
        lessonDate: { gte: todayStart },
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
      },
      select: {
        id: true,
        lessonDate: true,
        startTime: true,
        endTime: true,
        subject: true,
        isManual: true,
        lessonStudents: { select: { studentId: true } },
        teacher: { select: { name: true } },
        group: {
          select: {
            name: true,
            intensiveMode: true,
            teacher: { select: { name: true } },
            room: { select: { name: true } },
            course: { select: { name: true, subject: true } },
            enrollments: { where: parentActiveEnrollmentWhere(userId), select: { studentId: true, subjects: true } },
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
    subject: lesson.subject || lesson.group?.course?.subject || null,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    teacherName: lesson.teacher?.name || lesson.group?.teacher?.name || null,
    roomName: lesson.group?.room?.name || null,
    studentIds: canonicalIds(lesson.group?.enrollments
      ?.filter((enrollment) => isParentStudentInLesson(lesson, enrollment.studentId))
      .map((enrollment) => enrollment.student.id) || []),
    startTimeRaw: lesson.lessonDate ? `${new Date(lesson.lessonDate).toISOString().slice(0, 10)}T${lesson.startTime}` : null,
    endTimeRaw: lesson.lessonDate ? `${new Date(lesson.lessonDate).toISOString().slice(0, 10)}T${lesson.endTime}` : null,
    attendanceSubmittedAt: lesson.attendanceSubmittedAt?.toISOString() || null,
  }))

  const monthlyAttendanceByStudent = new Map<string, { total: number; present: number }>()
  for (const row of monthAttendanceGroups) {
    const counts = monthlyAttendanceByStudent.get(row.studentId) || { total: 0, present: 0 }
    counts.total += row._count._all
    if (row.status === 'PRESENT') counts.present += row._count._all
    monthlyAttendanceByStudent.set(row.studentId, counts)
  }
  const badgeCountsByStudent = new Map(badgeCountGroups.map((row) => [row.studentId, row._count._all]))
  const todayPaperCountsByStudent = new Map(todayPaperGroups.map((row) => [row.studentId, row._count._all]))
  const sumStudentCounts = (recordIds: string[], counts: Map<string, number>) => (
    recordIds.reduce((total, id) => total + (counts.get(id) || 0), 0)
  )
  const totalCount = [...monthlyAttendanceByStudent.values()].reduce((total, row) => total + row.total, 0)
  const presentCount = [...monthlyAttendanceByStudent.values()].reduce((total, row) => total + row.present, 0)
  // 无考勤记录时为 null（前端显示"暂无考勤记录"），避免把 0 条记录误判为 100% 全勤
  const attendanceRate: number | null = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null
  const badgeCount = [...badgeCountsByStudent.values()].reduce((total, count) => total + count, 0)
  const todayFeedbackCount = todayFeedbackRows.length
  const todayPaperCount = [...todayPaperCountsByStudent.values()].reduce((total, count) => total + count, 0)
  const studentStats = Object.fromEntries(students.map(({ id: studentId, recordIds }) => {
    const studentAttendanceTotal = recordIds.reduce((total, id) => total + (monthlyAttendanceByStudent.get(id)?.total || 0), 0)
    const studentPresentCount = recordIds.reduce((total, id) => total + (monthlyAttendanceByStudent.get(id)?.present || 0), 0)
    return [studentId, {
      attendanceRate: studentAttendanceTotal > 0 ? Math.round((studentPresentCount / studentAttendanceTotal) * 100) : null,
      badgeCount: sumStudentCounts(recordIds, badgeCountsByStudent),
      todayFeedbackCount: todayFeedbackRows.filter((feedback) => feedback.studentIds.some((id) => recordIds.includes(id))).length,
      todayPaperCount: sumStudentCounts(recordIds, todayPaperCountsByStudent),
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
    teacherAvatar?: string | null
    teacherGender?: string | null
    summary: string | null
    topic?: string | null
    tags?: string[]
  }> = {}
  for (const feedback of latestFeedbackRows) {
    const cardInfo = feedback.knowledgeCard
      ? parseStoredKnowledgeCard(feedback.knowledgeCard)
      : null
    const cardSubject = cardInfo?.subject || null
    const cardTopic = cardInfo?.topic || null
    const teacherSubject = feedback.teacher?.subjects
      ? feedback.teacher.subjects.split(/[,，、]/)[0]?.trim() || null
      : null
    const resolvedSubject =
      feedback.classLesson?.subject
      || feedback.classLesson?.group?.course?.subject
      || cardSubject
      || teacherSubject
      || null

    const firstSentence = (text: string | null | undefined) => {
      if (!text) return null
      const clean = text.trim()
      if (!clean) return null
      const match = clean.match(/^[^。！？\n]+[。！？]?/)
      return match ? match[0].trim() : clean.slice(0, 80)
    }
    const cleanSummary = feedback.summary?.trim()
    const rawRecord = feedback as { overallComment?: string | null; lessonContent?: string | null; tags?: string[] | null }
    const cleanComment = firstSentence(rawRecord.overallComment)
    const cleanLesson = firstSentence(rawRecord.lessonContent)
    const displaySummary = cleanSummary && cleanSummary !== '课堂反馈已更新'
      ? cleanSummary
      : cleanComment || cleanLesson || (cardTopic ? `围绕「${cardTopic}」开展教学与针对练习，点击查看学情详情。` : '已完成本节课学情记录与建议，点击查看专属成长档案。')

    const rawTags = Array.isArray(rawRecord.tags) ? rawRecord.tags.filter(Boolean).slice(0, 3) : []

    for (const studentId of canonicalIds(feedback.studentIds)) {
      if (latestFeedbackByStudent[studentId]) continue
      latestFeedbackByStudent[studentId] = {
        id: feedback.id,
        createdAt: feedback.createdAt.toISOString(),
        lessonDate: feedback.classLesson?.lessonDate
          ? new Date(feedback.classLesson.lessonDate).toISOString().slice(0, 10)
          : null,
        subject: resolvedSubject,
        teacherName: feedback.teacher?.name || null,
        teacherAvatar: (feedback.teacher as { avatar?: string | null })?.avatar || null,
        teacherGender: (feedback.teacher as { gender?: string | null })?.gender || null,
        summary: displaySummary,
        topic: cardTopic,
        tags: rawTags,
      }
    }
  }

  const upcomingLessonsById = new Map(upcomingParentLessons.map((lesson) => [lesson.id, lesson]))
  const nextUpcomingLessonsMapped = upcomingParentLessons
    .filter((lesson) => lesson.lessonDate >= tomorrowStart)
    .slice(0, 30)
    .map((lesson) => ({
      id: lesson.id,
      lessonDate: lesson.lessonDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      subject: lesson.subject || lesson.group.course?.subject || null,
      title: lesson.group.course?.name || lesson.group.course?.subject || '课程',
      teacherName: lesson.group.teacher?.name || lesson.teacher?.name || null,
      roomName: lesson.group.room?.name || null,
      studentIds: canonicalIds(lesson.group.enrollments
        .filter((item) => isParentStudentInLesson(lesson, item.studentId))
        .map((item) => item.studentId)),
    }))
  const lessonPreviews = upcomingLessonMaterials.flatMap((material) => {
    if (!material.classLesson) return []
    const lesson = upcomingLessonsById.get(material.classLesson.id)
    if (!lesson) return []
    const studentIds = canonicalIds(lesson.group.enrollments.map((item) => item.studentId))
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
    students: students.map(({ id, name, grade, gender, membershipLevel, termName, recordIds }) => ({ id, name, grade, gender, membershipLevel, termName, recordIds })),
    studentTopTeacher,
    todayClassLessons: filteredTodayClassLessons,
    notifications,
    latestPost,
    latestClassroomFeedback: parentLatestClassroomFeedback,
    latestFeedbackByStudent,
    attendanceRate,
    badgeCount,
    studentStats,
    todayAttendances: todayAttendanceGroups.flatMap((row) => row._max.createdAt
      ? [{ studentId: canonicalId(row.studentId) || row.studentId, createdAt: row._max.createdAt }]
      : []),
    todayFeedbacks: todayFeedbackRows.map((feedback) => ({
      id: feedback.id,
      createdAt: feedback.createdAt,
      studentIds: canonicalIds(feedback.studentIds),
      summary: feedback.summary,
      teacherName: feedback.teacher?.name || null,
      subject:
        feedback.classLesson?.subject
        || feedback.classLesson?.group?.course?.subject
        || (feedback.knowledgeCard ? parseStoredKnowledgeCard(feedback.knowledgeCard)?.subject || null : null)
        || null,
      topic: feedback.knowledgeCard ? parseStoredKnowledgeCard(feedback.knowledgeCard)?.topic || null : null,
    })),
    todayFeedbackCount,
    todayPaperCount,
    lessonPreviews,
    nextUpcomingLessons: nextUpcomingLessonsMapped,
  }
}
