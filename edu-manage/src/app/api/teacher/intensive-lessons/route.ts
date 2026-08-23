import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { apiHandler } from '@/lib/api-handler'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'
import { checkScheduleConflict, type ConflictInfo } from '@/lib/schedule-conflict'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import {
  calculatePlannedMinutes,
  canTeacherEditIntensiveLesson,
  intensiveTeachingTypeLabel,
  parseTeacherIntensiveTeachingType,
  resolveTeacherIntensiveSubjects,
  validateTeacherIntensiveSchedule,
} from '@/lib/teacher-intensive-scheduling'

export const dynamic = 'force-dynamic'

function uniqueStudentIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item)))]
}

const courseScopeKey = (groupId: string, subject: string) => `${groupId}:${subject}`

export const GET = apiHandler(async () => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)
  const groups = await prisma.classGroup.findMany({
    where: {
      termId: activeTerm?.id || '__NO_ACTIVE_TERM__',
      intensiveMode: 'INTENSIVE',
      status: { not: 'ARCHIVED' },
      course: { isActive: true },
      OR: [
        { teacherId: teacher.id },
        { teacherAssignments: { some: { teacherId: teacher.id } } },
      ],
    },
    include: {
      course: { select: { id: true, name: true, subject: true, grade: true } },
      room: { select: { id: true, name: true } },
      teacherAssignments: {
        select: { teacherId: true, subject: true },
      },
      enrollments: {
        where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
        include: { student: { select: { id: true, name: true, grade: true } } },
        orderBy: { enrolledAt: 'asc' },
      },
      classLessons: {
        where: {
          teacherId: teacher.id,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
        },
        include: {
          lessonStudents: {
            include: { student: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
          },
          attendances: { select: { id: true, status: true } },
          classroomFeedbacks: {
            where: { teacherId: teacher.id, status: 'PUBLISHED' },
            select: { id: true, studentIds: true },
          },
          intensiveReviews: {
            where: { teacherId: teacher.id },
            select: {
              id: true,
              revision: true,
              actualMinutes: true,
              status: true,
              reviewNote: true,
              submittedAt: true,
              reviewedAt: true,
            },
            orderBy: { revision: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
        take: 20,
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
  })
  const groupIds = groups.map((group) => group.id)
  const subjectsByGroup = new Map(groups.map((group) => [
    group.id,
    resolveTeacherIntensiveSubjects({
      teacherId: teacher.id,
      groupTeacherId: group.teacherId,
      assignmentSubjects: group.teacherAssignments
        .filter((assignment) => assignment.teacherId === teacher.id)
        .map((assignment) => assignment.subject),
      hasAnyAssignments: group.teacherAssignments.length > 0,
      courseSubject: group.course.subject,
    }),
  ]))
  const [approvedLessons, pendingReviews] = groupIds.length
    ? await Promise.all([
        prisma.classLesson.findMany({
          where: {
            groupId: { in: groupIds },
            teacherId: teacher.id,
            intensiveReviewStatus: 'APPROVED',
            settlementStatus: { in: ['SETTLED', 'ADJUSTED'] },
            status: 'COMPLETED',
            actualMinutes: { not: null },
          },
          select: {
            groupId: true,
            subject: true,
            actualMinutes: true,
            attendances: { select: { studentId: true, status: true } },
          },
        }),
        prisma.intensiveLessonReview.findMany({
          where: {
            teacherId: teacher.id,
            status: 'PENDING',
            lesson: { groupId: { in: groupIds } },
          },
          select: {
            actualMinutes: true,
            lesson: {
              select: {
                groupId: true,
                subject: true,
                attendances: { select: { studentId: true, status: true } },
              },
            },
          },
        }),
      ])
    : [[], []]

  const approvedByScope = new Map<string, { minutes: number; lessons: number }>()
  const approvedByStudent = new Map<string, number>()
  let unclassifiedLessonCount = 0
  for (const lesson of approvedLessons) {
    const subjects = subjectsByGroup.get(lesson.groupId) || []
    const subject = subjects.includes(String(lesson.subject || '').trim())
      ? String(lesson.subject).trim()
      : subjects.length === 1
        ? subjects[0]
        : null
    if (!subject) {
      unclassifiedLessonCount += 1
      continue
    }
    const scopeKey = courseScopeKey(lesson.groupId, subject)
    const hasPresent = lesson.attendances.some((attendance) => attendance.status === 'PRESENT')
    if (hasPresent) {
      const current = approvedByScope.get(scopeKey) || { minutes: 0, lessons: 0 }
      approvedByScope.set(scopeKey, {
        minutes: current.minutes + Number(lesson.actualMinutes || 0),
        lessons: current.lessons + 1,
      })
    }
    for (const attendance of lesson.attendances) {
      if (attendance.status !== 'PRESENT') continue
      const key = `${scopeKey}:${attendance.studentId}`
      approvedByStudent.set(key, (approvedByStudent.get(key) || 0) + Number(lesson.actualMinutes || 0))
    }
  }
  const pendingByScope = new Map<string, number>()
  const pendingByStudent = new Map<string, number>()
  for (const review of pendingReviews) {
    const groupId = review.lesson.groupId
    const subjects = subjectsByGroup.get(groupId) || []
    const subject = subjects.includes(String(review.lesson.subject || '').trim())
      ? String(review.lesson.subject).trim()
      : subjects.length === 1
        ? subjects[0]
        : null
    if (!subject) {
      unclassifiedLessonCount += 1
      continue
    }
    const scopeKey = courseScopeKey(groupId, subject)
    if (review.lesson.attendances.some((attendance) => attendance.status === 'PRESENT')) {
      pendingByScope.set(scopeKey, (pendingByScope.get(scopeKey) || 0) + review.actualMinutes)
    }
    for (const attendance of review.lesson.attendances) {
      if (attendance.status !== 'PRESENT') continue
      const key = `${scopeKey}:${attendance.studentId}`
      pendingByStudent.set(key, (pendingByStudent.get(key) || 0) + review.actualMinutes)
    }
  }

  return NextResponse.json({
    teacher: { id: teacher.id, name: teacher.name, division: user.division },
    unclassifiedLessonCount,
    groups: groups.flatMap((group) => {
      const teachingType = parseTeacherIntensiveTeachingType(group.teachingType) || 'ONE_ON_ONE'
      const subjects = subjectsByGroup.get(group.id) || []
      return subjects.map((subject) => {
        const scopeKey = courseScopeKey(group.id, subject)
        const approvedSummary = approvedByScope.get(scopeKey) || { minutes: 0, lessons: 0 }
        const scopedLessons = group.classLessons.filter((lesson) => {
          const lessonSubject = String(lesson.subject || '').trim()
          return lessonSubject === subject || (subjects.length === 1 && !subjects.includes(lessonSubject))
        })
        return {
        id: scopeKey,
        groupId: group.id,
        name: group.name,
        teachingType,
        teachingTypeLabel: intensiveTeachingTypeLabel(teachingType),
        subject,
        grade: group.course.grade,
        courseName: group.course.name,
        room: group.room,
        defaultMinutes: group.lessonMinutes,
        approvedHours: Number((approvedSummary.minutes / 60).toFixed(2)),
        approvedLessonCount: approvedSummary.lessons,
        pendingHours: Number(((pendingByScope.get(scopeKey) || 0) / 60).toFixed(2)),
        students: group.enrollments.map((enrollment) => ({
          id: enrollment.student.id,
          name: enrollment.student.name,
          grade: enrollment.student.grade,
          enrollmentId: enrollment.id,
          totalHours: enrollment.totalHours,
          usedHours: enrollment.usedHours,
          remainHours: enrollment.remainHours,
          approvedHours: Number(((approvedByStudent.get(`${scopeKey}:${enrollment.student.id}`) || 0) / 60).toFixed(2)),
          pendingHours: Number(((pendingByStudent.get(`${scopeKey}:${enrollment.student.id}`) || 0) / 60).toFixed(2)),
        })),
        lessons: scopedLessons.map((lesson) => ({
          id: lesson.id,
          lessonDate: lesson.lessonDate,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          plannedMinutes: lesson.plannedMinutes,
          actualMinutes: lesson.actualMinutes,
          status: lesson.status,
          settlementStatus: lesson.settlementStatus,
          intensiveReviewStatus: lesson.intensiveReviewStatus,
          latestReview: lesson.intensiveReviews[0] || null,
          attendanceSubmitted: Boolean(lesson.attendanceSubmittedAt),
          attendanceCount: lesson.attendances.length,
          feedbackCount: lesson.classroomFeedbacks.length,
          students: lesson.lessonStudents.map((item) => item.student),
          canEdit: canTeacherEditIntensiveLesson(lesson),
        })),
      }
      })
    }),
  })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)
  if (!activeTerm) {
    return NextResponse.json({ error: '当前没有启用的运营批次，请联系管理员' }, { status: 409 })
  }
  const body = await request.json()
  const groupId = typeof body.groupId === 'string' ? body.groupId : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const lessonDate = typeof body.lessonDate === 'string' ? body.lessonDate : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime : ''
  const endTime = typeof body.endTime === 'string' ? body.endTime : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''
  const studentIds = uniqueStudentIds(body.studentIds)

  const group = await prisma.classGroup.findFirst({
    where: {
      id: groupId,
      termId: activeTerm.id,
      intensiveMode: 'INTENSIVE',
      status: { not: 'ARCHIVED' },
      course: { isActive: true },
      OR: [
        { teacherId: teacher.id },
        { teacherAssignments: { some: { teacherId: teacher.id } } },
      ],
    },
    include: {
      course: { select: { name: true, subject: true } },
      room: { select: { id: true, name: true } },
      teacherAssignments: { select: { teacherId: true, subject: true } },
      enrollments: {
        where: { status: 'ACTIVE', student: { status: { not: 'INACTIVE' } } },
        include: { student: { select: { id: true, name: true } } },
      },
    },
  })
  if (!group) return NextResponse.json({ error: '无权为该课程安排课次' }, { status: 403 })
  const authorizedSubjects = resolveTeacherIntensiveSubjects({
    teacherId: teacher.id,
    groupTeacherId: group.teacherId,
    assignmentSubjects: group.teacherAssignments
      .filter((assignment) => assignment.teacherId === teacher.id)
      .map((assignment) => assignment.subject),
    hasAnyAssignments: group.teacherAssignments.length > 0,
    courseSubject: group.course.subject,
  })
  if (!subject || !authorizedSubjects.includes(subject)) {
    return NextResponse.json({ error: '无权为该课程学科安排课次' }, { status: 403 })
  }

  const teachingType = parseTeacherIntensiveTeachingType(group.teachingType)
  if (!teachingType) return NextResponse.json({ error: '该个性化课程未配置班型，请联系管理员' }, { status: 409 })

  const selectedStudentIds = studentIds.length
    ? studentIds
    : group.enrollments.map((enrollment) => enrollment.studentId)
  const validationError = validateTeacherIntensiveSchedule({
    lessonDate,
    startTime,
    endTime,
    teachingType,
    studentIds: selectedStudentIds,
  })
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
  const isHistorical = lessonDate < localDateKey(new Date())
  if (isHistorical && note.length < 2) {
    return NextResponse.json({ error: '补录历史课程时请填写补录说明' }, { status: 400 })
  }

  const enrollmentByStudent = new Map(group.enrollments.map((enrollment) => [enrollment.studentId, enrollment]))
  if (selectedStudentIds.some((studentId) => !enrollmentByStudent.has(studentId))) {
    return NextResponse.json({ error: '只能选择该课程中有效报名的学生' }, { status: 403 })
  }
  const conflicts: ConflictInfo[] = []
  for (const studentId of selectedStudentIds) {
    const current = await checkScheduleConflict({
      teacherId: teacher.id,
      studentId,
      date: lessonDate,
      startTime,
      endTime,
      termId: group.termId || undefined,
    }, prisma)
    for (const conflict of current) {
      if (!conflicts.some((item) => item.type === conflict.type && item.lessonId === conflict.lessonId)) {
        conflicts.push(conflict)
      }
    }
  }
  if (conflicts.length) {
    return NextResponse.json({ error: '该时间与已有课程冲突', conflicts }, { status: 409 })
  }

  const plannedMinutes = calculatePlannedMinutes(startTime, endTime)
  if (!plannedMinutes) return NextResponse.json({ error: '课程时间不正确' }, { status: 400 })

  const lesson = await prisma.$transaction(async (tx) => {
    const created = await tx.classLesson.create({
      data: {
        division: group.division,
        groupId: group.id,
        teacherId: teacher.id,
        subject,
        lessonDate: getLocalDayRange(lessonDate).start,
        startTime,
        endTime,
        status: 'SCHEDULED',
        isManual: true,
        plannedMinutes,
        settlementStatus: 'UNSETTLED',
        intensiveReviewStatus: 'DRAFT',
        note: note || null,
      },
    })
    await tx.classLessonStudent.createMany({
      data: selectedStudentIds.map((studentId) => ({ lessonId: created.id, studentId })),
      skipDuplicates: true,
    })
    await tx.activityLog.create({
      data: {
        userId: user.id,
        teacherId: teacher.id,
        action: isHistorical ? 'INTENSIVE_LESSON_BACKFILL_CREATE' : 'INTENSIVE_LESSON_CREATE',
        detail: `${group.name} · ${subject} · ${lessonDate} ${startTime}-${endTime}`,
        entityType: 'ClassLesson',
        entityId: created.id,
        metadata: {
          groupId: group.id,
          subject,
          teachingType,
          studentIds: selectedStudentIds,
          plannedMinutes,
          source: isHistorical ? 'TEACHER_BACKFILL' : 'TEACHER',
          note: note || null,
        },
      },
    })
    return created
  })

  revalidatePath('/teacher/intensive')
  revalidatePath('/teacher/schedule')
  return NextResponse.json({ success: true, lesson, isHistorical }, { status: 201 })
})
