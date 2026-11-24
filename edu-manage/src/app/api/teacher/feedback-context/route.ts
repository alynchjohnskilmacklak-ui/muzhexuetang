import { NextResponse } from 'next/server'
import { requireCurrentTeacher, teacherLessonScopeWhere, teacherStudentWhere } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { getLocalDayRange, localDateKey, todayLocal } from '@/lib/date/local-day'
import { buildTodayFeedbackScopeSet, feedbackTodayScopeKey } from '@/lib/classroom-feedback/today-scope'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { loadLessonFeedbackBlockReasons } from '@/lib/classroom-feedback/lesson-eligibility'
import { visibleStudentWhere } from '@/lib/business-visibility'
import { hasSubmittedLessonAttendance } from '@/lib/attendance-submission'
import { getStudentFeedbackRating, normalizePracticeCheckin, type PreviousFeedbackFollowup } from '@/lib/classroom-feedback/feedback-followup'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)

  if (!activeTerm) {
    return NextResponse.json({
      groups: [],
      lessons: [],
      previousFollowups: [],
      feedbackedTodayIds: [],
      contextState: 'NO_ACTIVE_TERM',
      contextMessage: '当前尚未进入运营批次，请联系管理员先在“运营批次”中选择当前工作区。',
    })
  }

  // Active groups for this teacher
  const groups = await prisma.classGroup.findMany({
    where: {
      termId: activeTerm.id,
      status: { not: 'ARCHIVED' },
      deletedAt: null,
      OR: [
        { teacherId: teacher.id },
        { teacherAssignments: { some: { teacherId: teacher.id } } },
      ],
    },
    include: {
      term: { select: { id: true, name: true } },
      course: { select: { id: true, name: true, subject: true, grade: true, type: true } },
      teacherAssignments: { where: { teacherId: teacher.id }, select: { subject: true }, orderBy: { createdAt: 'asc' } },
      enrollments: {
        where: { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere },
        include: {
          student: { select: { id: true, name: true, grade: true, gender: true, school: true, remainHours: true } },
        },
      },
      classLessons: {
        where: { status: { notIn: ['CANCELLED', 'POSTPONED'] }, deletedAt: null },
        orderBy: { lessonDate: 'desc' },
        take: 5,
        select: {
          id: true,
          lessonDate: true,
          startTime: true,
          endTime: true,
          subject: true,
          status: true,
          attendanceSubmittedAt: true,
          attendances: { where: { deletedAt: null }, select: { studentId: true } },
          lessonStudents: { select: { studentId: true } },
        },
      },
    },
  })

  // Keep recent lessons from the active term available for backfilled feedback.
  // Today's unsubmitted lessons stay visible so teachers can jump to attendance.
  const now = new Date()
  const { start: todayStart, end: tomorrowStart } = getLocalDayRange(todayLocal())
  const recentLessons = await prisma.classLesson.findMany({
    where: {
      AND: [
        await teacherLessonScopeWhere(prisma, teacher.id, activeTerm.id),
        { group: { termId: activeTerm.id } },
      ],
      lessonDate: { lt: tomorrowStart },
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      deletedAt: null,
    },
    include: {
      group: {
        include: {
          course: { select: { name: true, type: true, subject: true } },
          teacherAssignments: {
            where: { teacherId: teacher.id },
            select: { subject: true },
          },
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere },
            select: { studentId: true, subjects: true },
          },
        },
      },
      attendances: { where: { deletedAt: null }, select: { studentId: true } },
      lessonStudents: { select: { studentId: true } },
    },
    orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
    take: 250,
  })

  // A teacher can be assigned directly to an individual lesson even when the
  // legacy group-level teacher fields have not been populated. Include those
  // lesson-owned groups in the feedback picker so attendance and feedback use
  // the same teacher-to-lesson relationship.
  const loadedGroupIds = new Set(groups.map((group) => group.id))
  const lessonAssignedGroupIds = [...new Set(recentLessons.map((lesson) => lesson.groupId))]
    .filter((groupId) => !loadedGroupIds.has(groupId))
  const lessonAssignedGroups = lessonAssignedGroupIds.length
    ? await prisma.classGroup.findMany({
      where: {
        id: { in: lessonAssignedGroupIds },
        termId: activeTerm.id,
        status: { not: 'ARCHIVED' },
        deletedAt: null,
      },
      include: {
        term: { select: { id: true, name: true } },
        course: { select: { id: true, name: true, subject: true, grade: true, type: true } },
        teacherAssignments: { where: { teacherId: teacher.id }, select: { subject: true }, orderBy: { createdAt: 'asc' } },
        enrollments: {
          where: { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere },
          include: {
            student: { select: { id: true, name: true, grade: true, gender: true, school: true, remainHours: true } },
          },
        },
        classLessons: {
          where: { status: { notIn: ['CANCELLED', 'POSTPONED'] }, deletedAt: null },
          orderBy: { lessonDate: 'desc' },
          take: 5,
          select: {
            id: true,
            lessonDate: true,
            startTime: true,
            endTime: true,
            subject: true,
            status: true,
            attendanceSubmittedAt: true,
            attendances: { where: { deletedAt: null }, select: { studentId: true } },
            lessonStudents: { select: { studentId: true } },
          },
        },
      },
    })
    : []
  const feedbackGroups = [...groups, ...lessonAssignedGroups]
  const lessonSubjectsByGroupId = new Map<string, Set<string>>()
  for (const lesson of recentLessons) {
    const subject = lesson.subject?.trim()
      || (lesson.group?.teacherAssignments.length === 1 ? lesson.group.teacherAssignments[0].subject?.trim() : null)
      || lesson.group?.course?.subject?.trim()
    if (!subject) continue
    const subjects = lessonSubjectsByGroupId.get(lesson.groupId) || new Set<string>()
    subjects.add(subject)
    lessonSubjectsByGroupId.set(lesson.groupId, subjects)
  }

  // Per-student feedback history. Repeated feedback remains allowed.
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
  const feedbackHistory = await prisma.classroomFeedback.findMany({
    where: {
      teacherId: teacher.id,
      status: 'PUBLISHED',
      deletedAt: null,
    },
    select: { studentIds: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const todayFeedbacks = await prisma.classroomFeedback.findMany({
    where: {
      teacherId: teacher.id,
      status: 'PUBLISHED',
      deletedAt: null,
      createdAt: { gte: todayStart, lt: tomorrowStart },
    },
    select: {
      studentIds: true,
      feedbackGroupId: true,
      classLesson: {
        select: {
          groupId: true,
          subject: true,
          group: { select: { course: { select: { subject: true } } } },
        },
      },
    },
  })
  const feedbackedTodayIds = [...new Set(todayFeedbacks.flatMap((feedback) => feedback.studentIds))]
  const feedbackedTodayScopes = buildTodayFeedbackScopeSet(todayFeedbacks)

  // Build student feedback map
  const studentFeedbackMap = new Map<string, Date>()
  for (const fb of feedbackHistory) {
    for (const sid of fb.studentIds) {
      if (!studentFeedbackMap.has(sid) || fb.createdAt > studentFeedbackMap.get(sid)!) {
        studentFeedbackMap.set(sid, fb.createdAt)
      }
    }
  }

  // Per-student attendance rates
  const students = await prisma.student.findMany({
    where: teacherStudentWhere(teacher.id),
    select: { id: true },
  })
  const studentIds = students.map(s => s.id)

  const attendanceRecords = await prisma.attendance.findMany({
    where: { studentId: { in: studentIds }, deletedAt: null, createdAt: { gte: fourteenDaysAgo } },
    select: { studentId: true, status: true },
  })
  const attendanceMap = new Map<string, { total: number; present: number }>()
  for (const a of attendanceRecords) {
    const entry = attendanceMap.get(a.studentId) || { total: 0, present: 0 }
    entry.total++
    if (a.status === 'PRESENT' || a.status === 'MAKEUP') entry.present++
    attendanceMap.set(a.studentId, entry)
  }

  // Assemble response
  const groupsOut = feedbackGroups.flatMap(g => {
    const assignedSubjects = [...new Set(g.teacherAssignments
      .map((assignment) => assignment.subject?.trim())
      .filter((subject): subject is string => Boolean(subject)))]
    const lessonSubjects = [...(lessonSubjectsByGroupId.get(g.id) || [])]
    const teachingSubjects = assignedSubjects.length
      ? assignedSubjects
      : lessonSubjects.length
        ? lessonSubjects
        : [g.course?.subject || null]
    return teachingSubjects.map((teachingSubject) => {
      const visibleEnrollments = g.enrollments.filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, teachingSubject))
      const scopeId = `${g.id}::${encodeURIComponent(teachingSubject || '未填学科')}`
    const recentLesson = g.classLessons.find((lesson) => {
      const lessonSubject = lesson.subject
        || (g.teacherAssignments.length === 1 ? g.teacherAssignments[0].subject : null)
        || g.course?.subject
      return !teachingSubject || lessonSubject === teachingSubject
    })
      return ({
    id: scopeId,
    groupId: g.id,
    name: g.name,
    courseName: g.course?.name || '-',
    termName: g.term?.name || activeTerm.name,
    courseType: g.course?.type || 'GROUP',
    intensiveMode: g.intensiveMode,
    teachingType: g.teachingType,
    subject: teachingSubject,
    grade: g.course?.grade || null,
    studentCount: visibleEnrollments.length,
    recentLesson: recentLesson ? {
      date: recentLesson.lessonDate,
      time: `${recentLesson.startTime}-${recentLesson.endTime}`,
    } : null,
    students: visibleEnrollments.map(e => {
      const att = attendanceMap.get(e.student.id)
      const attRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null
      const lastFb = studentFeedbackMap.get(e.student.id)
      const daysSinceLastFeedback = lastFb
        ? Math.floor((now.getTime() - lastFb.getTime()) / 86400000)
        : null
      return {
        id: e.student.id,
        name: e.student.name,
        grade: e.student.grade,
        gender: e.student.gender,
        school: e.student.school,
        remainHours: g.intensiveMode === 'INTENSIVE' ? e.remainHours : e.student.remainHours,
        attendanceRate: attRate,
        daysSinceLastFeedback,
        lastFeedbackAt: lastFb,
        todayFeedback: feedbackedTodayScopes.has(feedbackTodayScopeKey(g.id, teachingSubject, e.student.id)),
      }
    }),
  })})})

  // Keep the teacher's next lesson connected to the student's latest published feedback.
  // This is intentionally bounded to active rosters and recent feedback only.
  const followupScopes = new Map<string, { groupId: string; subject: string; studentIds: Set<string> }>()
  for (const group of groupsOut) {
    const subject = group.subject?.trim()
    if (!subject) continue
    const key = `${group.groupId}::${subject.toLocaleLowerCase('zh-CN')}`
    followupScopes.set(key, {
      groupId: group.groupId,
      subject,
      studentIds: new Set(group.students.map((student) => student.id)),
    })
  }
  const followupGroupIds = [...new Set([...followupScopes.values()].map((scope) => scope.groupId))]
  const followupStudentIds = [...new Set([...followupScopes.values()].flatMap((scope) => [...scope.studentIds]))]
  const previousFeedbackRows = followupGroupIds.length && followupStudentIds.length
    ? await prisma.classroomFeedback.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          createdAt: { gte: new Date(now.getTime() - 180 * 86400000), lt: now },
          studentIds: { hasSome: followupStudentIds },
          OR: [
            { feedbackGroupId: { in: followupGroupIds } },
            { classLesson: { groupId: { in: followupGroupIds } } },
          ],
        },
        select: {
          id: true,
          feedbackGroupId: true,
          studentIds: true,
          studentRatings: true,
          knowledgePoints: true,
          knowledgeCard: true,
          createdAt: true,
          classLesson: {
            select: {
              groupId: true,
              lessonDate: true,
              subject: true,
              group: {
                select: {
                  course: { select: { subject: true } },
                  teacherAssignments: { where: { teacherId: teacher.id }, select: { subject: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
    : []
  const subjectsByGroupId = new Map<string, string[]>()
  for (const scope of followupScopes.values()) {
    const subjects = subjectsByGroupId.get(scope.groupId) || []
    if (!subjects.includes(scope.subject)) subjects.push(scope.subject)
    subjectsByGroupId.set(scope.groupId, subjects)
  }
  const previousFollowupsByStudent = new Map<string, PreviousFeedbackFollowup>()
  for (const feedback of previousFeedbackRows) {
    const groupId = feedback.classLesson?.groupId || feedback.feedbackGroupId
    if (!groupId) continue
    const subject = feedback.classLesson?.subject?.trim()
      || (feedback.classLesson?.group?.teacherAssignments.length === 1
        ? feedback.classLesson.group.teacherAssignments[0].subject?.trim()
        : null)
      || feedback.classLesson?.group?.course?.subject?.trim()
      || (subjectsByGroupId.get(groupId)?.length === 1 ? subjectsByGroupId.get(groupId)?.[0] : null)
    if (!subject) continue
    const normalizedSubject = subject.toLocaleLowerCase('zh-CN')
    const scope = followupScopes.get(`${groupId}::${normalizedSubject}`)
    if (!scope) continue
    const knowledgeCard = parseStoredKnowledgeCard(feedback.knowledgeCard)
    const topic = feedback.knowledgePoints.find((point) => point.trim()) || knowledgeCard?.topic || ''
    for (const studentId of feedback.studentIds) {
      if (!scope.studentIds.has(studentId)) continue
      const key = `${groupId}::${normalizedSubject}::${studentId}`
      if (previousFollowupsByStudent.has(key)) continue
      const rating = getStudentFeedbackRating(feedback.studentRatings, studentId, feedback.studentIds)
      const personalizedLearning = rating?.personalizedLearning && typeof rating.personalizedLearning === 'object'
        ? rating.personalizedLearning as Record<string, unknown>
        : null
      const focus = (typeof rating?.nextLessonFocus === 'string' && rating.nextLessonFocus.trim())
        || (typeof personalizedLearning?.nextLessonFollowup === 'string' && personalizedLearning.nextLessonFollowup.trim())
        || ''
      const practiceCheckin = normalizePracticeCheckin(rating?.practiceCheckin)
      if (!focus && !practiceCheckin) continue
      previousFollowupsByStudent.set(key, {
        feedbackId: feedback.id,
        groupId,
        subject: scope.subject,
        studentId,
        date: (feedback.classLesson?.lessonDate || feedback.createdAt).toISOString(),
        topic,
        focus: focus.slice(0, 240),
        practiceCheckin,
      })
    }
  }

  const lessonRosters = recentLessons.map((lesson) => ({
    id: lesson.id,
    lessonDate: lesson.lessonDate,
    studentIds: resolveSubjectLessonStudentIds(
      lesson.lessonStudents.map((item) => item.studentId),
      lesson.group?.enrollments || [],
      lesson.subject
        || (lesson.group?.teacherAssignments.length === 1 ? lesson.group.teacherAssignments[0].subject : null)
        || lesson.group?.course?.subject,
      lesson.lessonDate,
    ),
  }))
  const rosterByLessonId = new Map(lessonRosters.map((lesson) => [lesson.id, lesson.studentIds]))
  const blockedReasonsByLesson = await loadLessonFeedbackBlockReasons(prisma, lessonRosters)

  const todayKey = localDateKey(now)
  const [ty, tm, td] = todayKey.split('-').map(Number)
  const yesterdayUtc = new Date(Date.UTC(ty, tm - 1, td - 1))
  const yesterdayKey = yesterdayUtc.toISOString().slice(0, 10)
  const lessonsOut = [...recentLessons]
    .sort((a, b) => {
      const aDate = new Date(a.lessonDate)
      const bDate = new Date(b.lessonDate)
      const aIsToday = localDateKey(aDate) === todayKey
      const bIsToday = localDateKey(bDate) === todayKey
      if (aIsToday !== bIsToday) return aIsToday ? -1 : 1
      const aDistance = Math.abs(new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate()).getTime() - todayStart.getTime())
      const bDistance = Math.abs(new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate()).getTime() - todayStart.getTime())
      if (aDistance !== bDistance) return aDistance - bDistance
      return String(a.startTime || '').localeCompare(String(b.startTime || ''))
    })
    .map(l => {
      const lDateKey = localDateKey(l.lessonDate)
      return {
        id: l.id,
        groupId: l.groupId,
        groupName: l.group?.course?.name || '-',
        courseType: l.group?.course?.type || 'GROUP',
        intensiveMode: l.group?.intensiveMode,
        teachingType: l.group?.teachingType,
        lessonDate: l.lessonDate,
        startTime: l.startTime,
        endTime: l.endTime,
        isToday: lDateKey === todayKey,
        isYesterday: lDateKey === yesterdayKey,
        attendanceSubmitted: hasSubmittedLessonAttendance({
          attendanceSubmittedAt: l.attendanceSubmittedAt,
          status: l.status,
          attendances: l.attendances,
          expectedStudentIds: rosterByLessonId.get(l.id) || [],
        }),
        scopeId: `${l.groupId}::${encodeURIComponent(l.subject || (l.group?.teacherAssignments.length === 1 ? l.group.teacherAssignments[0].subject : null) || l.group?.course?.subject || '未填学科')}`,
        subject: l.subject || (l.group?.teacherAssignments.length === 1 ? l.group.teacherAssignments[0].subject : null) || l.group?.course?.subject || null,
        studentIds: rosterByLessonId.get(l.id) || [],
        blockedStudentReasons: blockedReasonsByLesson.get(l.id) || {},
      }
    })

  return NextResponse.json({
    groups: groupsOut,
    lessons: lessonsOut,
    previousFollowups: [...previousFollowupsByStudent.values()],
    feedbackedTodayIds,
    contextState: 'READY',
    activeTerm,
  })
})
