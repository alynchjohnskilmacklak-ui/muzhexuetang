import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireCurrentTeacher, TEACHER_LOG_ACTIONS, teacherLessonScopeWhere, todayRange } from '@/lib/teacher-portal'
import { calculateAttendanceDeductHours, shouldCreateMakeupRequest, termKindToBillingMode } from '@/lib/attendance-hours'
import { createLessonPayInTransaction } from '@/lib/teacher-salary'
import { postAttendanceHours } from '@/lib/attendance-hour-posting'
import { getAttendanceSubmissionConflict } from '@/lib/attendance-submission-conflict'
import { createAttendanceParentAlerts, type AttendanceAlertConfig } from '@/lib/attendance-alerts'
import { resolveIntensiveActualMinutes } from '@/lib/intensive-class'
import {
  IntensiveReviewError,
  submitIntensiveLessonReview,
  type IntensiveReviewAttendanceRecord,
} from '@/lib/intensive-review'
import { getTeacherAttendanceSubmissionState, teacherAttendanceOpenAt } from '@/lib/teacher-intensive-scheduling'
import { resolveEatingMealStudentIds, syncAutomaticMealAttendance } from '@/lib/meal-attendance-sync'
import { isFirstTeachingPeriod, normalizeSchedulePeriods } from '@/lib/schedule-periods'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { hasAttendingStudent, hasSubmittedLessonAttendance, isCancelledOrPostponedLesson, validateAttendanceSubmissionRecords } from '@/lib/attendance-submission'
import { loadLessonFeedbackBlockReasons } from '@/lib/classroom-feedback/lesson-eligibility'
import { visibleClassGroupWhere, visibleStudentWhere } from '@/lib/business-visibility'
import { isClassLessonInActiveTerm } from '@/lib/admin-term-scope'
import { getCurrentUser } from '@/lib/get-user'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { getLocalDayRange } from '@/lib/date/local-day'

import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  try {
    const { teacher, prisma } = await requireCurrentTeacher()
    const { start: today, end: todayEnd } = todayRange()
    const lessonId = request.nextUrl.searchParams.get('lessonId')
    const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)
    if (!activeTerm) {
      if (lessonId) return NextResponse.json({ error: '当前没有启用的运营批次' }, { status: 404 })
      return NextResponse.json([])
    }
    const lessonWhere = await teacherLessonScopeWhere(prisma, teacher.id, activeTerm.id)

    if (lessonId) {
      const lesson = await prisma.classLesson.findFirst({
        where: { id: lessonId, deletedAt: null, ...lessonWhere },
        include: {
          group: {
            include: {
              course: true,
              room: true,
              teacher: { select: { id: true, name: true } },
              teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } } },
              enrollments: { where: { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere }, include: { student: true } },
            },
          },
          attendances: { where: { deletedAt: null }, select: { studentId: true, status: true } },
          intensiveReviews: {
            orderBy: { revision: 'desc' },
            take: 1,
          },
          lessonStudents: { include: { student: true }, orderBy: { createdAt: 'asc' } },
        },
      })
      if (!lesson) return NextResponse.json({ error: '不可操作此课次' }, { status: 403 })
      if (isCancelledOrPostponedLesson(lesson.status)) {
        return NextResponse.json({ error: '课次已取消或调课，不能进行考勤' }, { status: 409 })
      }
      const lessonSubject = lesson.subject || lesson.group.teacherAssignments.find((item) => item.teacherId === teacher.id)?.subject || lesson.group.course.subject
      const rosterStudentIds = new Set(resolveSubjectLessonStudentIds(
        lesson.lessonStudents.map((item) => item.studentId),
        lesson.group.enrollments.map((enrollment) => ({ studentId: enrollment.student.id, subjects: enrollment.subjects })),
        lessonSubject,
        lesson.lessonDate,
      ))
      const enrollmentByStudentId = new Map(lesson.group.enrollments.map((enrollment) => [enrollment.student.id, enrollment]))
      const snapshotStudentById = new Map(lesson.lessonStudents
        .filter((snapshot) => snapshot.student.deletedAt === null)
        .map((snapshot) => [snapshot.studentId, snapshot.student]))
      const displayStudents = [...rosterStudentIds].flatMap((studentId) => {
        const enrollment = enrollmentByStudentId.get(studentId)
        const student = snapshotStudentById.get(studentId) || enrollment?.student
        return student && student.deletedAt === null ? [{ student, enrollment }] : []
      })
      const feedbackBlockReasonsByLesson = await loadLessonFeedbackBlockReasons(prisma, [{
        id: lesson.id,
        lessonDate: lesson.lessonDate,
        studentIds: displayStudents.map((item) => item.student.id),
      }], {
        attendanceRecords: lesson.attendances.map((attendance) => ({
          lessonId: lesson.id,
          studentId: attendance.studentId,
          status: attendance.status,
        })),
      })
      const feedbackBlockReasons = feedbackBlockReasonsByLesson.get(lesson.id) || {}
      const scheduleConfig = await prisma.systemConfig.findUnique({
        where: { id: 'singleton' },
        select: { schedulePeriods: true },
      })
      const isSystemFirstPeriod = isFirstTeachingPeriod(
        normalizeSchedulePeriods(scheduleConfig?.schedulePeriods),
        lesson.startTime,
      )
      const mealDate = new Date(`${lesson.lessonDate.toISOString().slice(0, 10)}T00:00:00.000Z`)
      const mealRecords = await prisma.studentMealAttendance.findMany({
        where: { studentId: { in: displayStudents.map((item) => item.student.id) }, mealDate },
        select: { studentId: true, eating: true },
      })
      const eatingStudentIds = new Set(mealRecords.filter((record) => record.eating).map((record) => record.studentId))
      const lessonDay = getLocalDayRange(lesson.lessonDate.toISOString().slice(0, 10))
      const dayLessons = await prisma.classLesson.findMany({
        where: {
          ...lessonWhere,
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          lessonDate: { gte: lessonDay.start, lt: lessonDay.end },
        },
        select: {
          id: true,
          startTime: true,
          status: true,
          attendanceSubmittedAt: true,
          hoursDeductedAt: true,
        },
      })
      const submittedFirstPeriodIds = dayLessons
        .filter((item) => isFirstTeachingPeriod(normalizeSchedulePeriods(scheduleConfig?.schedulePeriods), item.startTime)
          && (item.attendanceSubmittedAt || item.hoursDeductedAt || item.status === 'COMPLETED'))
        .map((item) => item.id)
      const hasFirstPeriodMealSubmission = submittedFirstPeriodIds.length > 0
        && Boolean(await prisma.studentMealAttendance.findFirst({
          where: {
            lessonId: { in: submittedFirstPeriodIds },
            mealDate,
            division: teacher.division,
          },
          select: { id: true },
        }))
      return NextResponse.json({
        lesson: {
          id: lesson.id,
          lessonDate: lesson.lessonDate,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          courseName: lesson.group.course.name,
          courseType: lesson.group.course.type,
          groupName: lesson.group.name,
          lessonMinutes: lesson.group.lessonMinutes,
          plannedMinutes: lesson.plannedMinutes,
          actualMinutes: lesson.actualMinutes,
          settlementStatus: lesson.settlementStatus,
          intensiveReviewStatus: lesson.intensiveReviewStatus,
          latestReview: lesson.intensiveReviews[0] || null,
          intensiveMode: lesson.group.intensiveMode,
          teachingType: lesson.group.teachingType,
          subject: lessonSubject,
          room: lesson.group.room?.name,
          status: lesson.status,
          hoursDeducted: !!lesson.hoursDeductedAt,
          attendanceSubmitted: hasSubmittedLessonAttendance({
            attendanceSubmittedAt: lesson.attendanceSubmittedAt,
            status: lesson.status,
            attendances: lesson.attendances.filter((attendance) => rosterStudentIds.has(attendance.studentId)),
            expectedStudentIds: [...rosterStudentIds],
          }),
          isSystemFirstPeriod,
          hasFirstPeriodMealSubmission,
          // Compatibility for an already-open client during a rolling deploy.
          isTeacherFirstLessonToday: isSystemFirstPeriod,
        },
        students: displayStudents.map(({ student, enrollment }) => ({
          studentId: student.id,
          enrollmentId: enrollment?.id || null,
          name: student.name,
          gender: student.gender,
          grade: student.grade,
          membershipLevel: student.membershipLevel || 'NORMAL',
          remainHours: enrollment?.remainHours || 0,
          courseType: lesson.group.course.type,
          lessonMinutes: lesson.group.lessonMinutes,
          status: lesson.attendances.find((attendance) => attendance.studentId === student.id)?.status
            || (feedbackBlockReasons[student.id] === 'LEAVE' ? 'LEAVE' : 'PRESENT'),
          eating: eatingStudentIds.has(student.id),
        })),
      })
    }

    const isTermScope = request.nextUrl.searchParams.get('scope') === 'term'
    const termStart = getLocalDayRange(activeTerm.startDate.toISOString().slice(0, 10)).start
    const termEnd = getLocalDayRange(activeTerm.endDate.toISOString().slice(0, 10)).end
    const lessons = await prisma.classLesson.findMany({
      where: {
        ...lessonWhere,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        lessonDate: isTermScope ? { gte: termStart, lt: termEnd } : { gte: today, lt: todayEnd },
      },
      include: {
        group: {
          include: {
            course: true,
            room: true,
            teacher: { select: { id: true, name: true } },
            teacherAssignments: { include: { teacher: { select: { id: true, name: true, subjects: true } } } },
            enrollments: {
              where: { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere },
              select: { id: true, studentId: true, subjects: true },
            },
          },
        },
        attendances: { where: { deletedAt: null }, select: { id: true, status: true, studentId: true } },
        lessonStudents: { select: { studentId: true } },
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    })
    return NextResponse.json(lessons.map((lesson) => {
      const lessonSubject = lesson.subject
        || lesson.group.teacherAssignments.find((item) => item.teacherId === teacher.id)?.subject
        || lesson.group.course.subject
      const rosterStudentIds = new Set(resolveSubjectLessonStudentIds(
        lesson.lessonStudents.map((item) => item.studentId),
        lesson.group.enrollments,
        lessonSubject,
        lesson.lessonDate,
      ))
      const visibleAttendances = lesson.attendances.filter((attendance) => rosterStudentIds.has(attendance.studentId))
      return {
        id: lesson.id,
        lessonDate: lesson.lessonDate,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        time: `${lesson.startTime}-${lesson.endTime}`,
        courseName: lesson.group.course.name,
        courseType: lesson.group.course.type,
        groupName: lesson.group.name,
        lessonMinutes: lesson.group.lessonMinutes,
        subject: lessonSubject,
        intensiveMode: lesson.group.intensiveMode,
        room: lesson.group.room?.name || '-',
        status: lesson.status,
        attendanceSubmittedAt: lesson.attendanceSubmittedAt,
        attendanceSubmitted: hasSubmittedLessonAttendance({
          attendanceSubmittedAt: lesson.attendanceSubmittedAt,
          status: lesson.status,
          attendances: visibleAttendances,
          expectedStudentIds: [...rosterStudentIds],
        }),
        studentCount: rosterStudentIds.size,
        attendanceCount: visibleAttendances.length,
        allPresent: visibleAttendances.length > 0 && visibleAttendances.every((attendance) => attendance.status === 'PRESENT'),
        hoursDeducted: !!lesson.hoursDeductedAt,
      }
    }))
  } catch (err) {
    console.error('[teacher:attendance:GET]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
})

export const POST = apiHandler(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const lessonId = typeof body.lessonId === 'string' ? body.lessonId : ''
    const requestedTeacherId = typeof body.teacherId === 'string' ? body.teacherId : ''
    const records = Array.isArray(body.records) ? body.records : []
    const rollCallSubmission = body.rollCallSubmission === true
    const mealStudentIds: string[] | null = Array.isArray(body.mealStudentIds)
      ? body.mealStudentIds.filter((value: unknown): value is string => typeof value === 'string')
      : null
    if (!lessonId) return NextResponse.json({ error: '缺少课次编号' }, { status: 400 })
    if (!records.length) {
      return NextResponse.json({ error: '本节课暂无有效学员，请先核对班级报名学科与课次名单' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: '无权限' }, { status: 401 })

    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: '登录状态已失效，请重新登录' }, { status: 401 })
    let user: { id: string; division: string } = { id: currentUser.id, division: currentUser.division }
    let teacher: { id: string; name?: string | null }
    let lessonWhere: Record<string, unknown>
    let prisma

    if (session.user.role === 'admin') {
      prisma = await getRequestPrisma()
      if (!await isClassLessonInActiveTerm(prisma, lessonId, currentUser.division)) {
        return NextResponse.json({ error: '课次不存在或不在当前可操作批次' }, { status: 404 })
      }
      const lessonForAdmin = await prisma.classLesson.findFirst({
        where: {
          id: lessonId,
          division: currentUser.division,
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'POSTPONED'] },
          group: visibleClassGroupWhere,
        },
        include: {
          teacher: { select: { id: true, name: true } },
          group: {
            include: {
              teacher: { select: { id: true, name: true } },
              teacherAssignments: {
                include: { teacher: { select: { id: true, name: true } } },
              },
            },
          },
        },
      })
      if (!lessonForAdmin) return NextResponse.json({ error: '课次不存在' }, { status: 404 })
      const selectedAssignment = lessonForAdmin.group.teacherAssignments.find((assignment) => assignment.teacherId === requestedTeacherId)
        || (lessonForAdmin.group.teacherAssignments.length === 1 ? lessonForAdmin.group.teacherAssignments[0] : null)
      const lessonTeacher = lessonForAdmin.teacher || selectedAssignment?.teacher || lessonForAdmin.group.teacher
      teacher = { id: lessonTeacher.id, name: lessonTeacher.name }
      lessonWhere = {
        id: lessonId,
        division: currentUser.division,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        group: visibleClassGroupWhere,
      }
    } else {
      const result = await requireCurrentTeacher()
      prisma = result.prisma
      user = { id: result.user.id, division: result.user.division }
      teacher = { id: result.teacher.id, name: result.teacher.name }
      const activeTerm = await getActiveAcademicTerm(prisma, result.teacher.division)
      if (!activeTerm) return NextResponse.json({ error: '当前没有启用的运营批次，暂不能提交考勤' }, { status: 409 })
      lessonWhere = { id: lessonId, ...await teacherLessonScopeWhere(prisma, teacher.id, activeTerm.id) }
    }

    const lesson = await prisma.classLesson.findFirst({
      where: { ...lessonWhere, deletedAt: null },
      include: {
        group: {
          include: {
            course: true,
            term: { select: { kind: true } },
            teacherAssignments: { select: { teacherId: true, subject: true } },
            enrollments: {
              where: { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere },
              select: { id: true, studentId: true, subjects: true, student: { select: { id: true, name: true, gender: true, grade: true, membershipLevel: true, parentId: true, parentUserId: true } } },
            },
          },
        },
        lessonStudents: { select: { studentId: true } },
      },
    })
    if (!lesson) return NextResponse.json({ error: '不可操作' }, { status: 403 })
    if (isCancelledOrPostponedLesson(lesson.status)) {
      return NextResponse.json({ error: '课次已取消或调课，不能提交考勤' }, { status: 409 })
    }

    const rejectedIntensiveRetry = lesson.group.intensiveMode === 'INTENSIVE'
      && lesson.status === 'COMPLETED'
      && lesson.intensiveReviewStatus === 'REJECTED'
    if (session.user.role === 'teacher') {
      const submissionState = getTeacherAttendanceSubmissionState({
        lessonDate: lesson.lessonDate,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        intensiveMode: lesson.group.intensiveMode,
        allowRejectedIntensiveResubmission: rejectedIntensiveRetry,
      })
      if (submissionState === 'UPCOMING') {
        const openAt = teacherAttendanceOpenAt({
          lessonDate: lesson.lessonDate,
          startTime: lesson.startTime,
          intensiveMode: lesson.group.intensiveMode,
        })
        return NextResponse.json({
          error: lesson.group.intensiveMode === 'INTENSIVE'
            ? `课程 ${lesson.startTime} 开始后才可提交考勤`
            : `未到考勤开放时间，课程 ${lesson.startTime} 开始，最早可在 ${openAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })} 提交`,
        }, { status: 400 })
      }
      if (submissionState === 'CLOSED') {
        return NextResponse.json({
          error: '教师考勤需在课程当天 18:00 前提交，超时请联系管理员补录或更正。',
        }, { status: 409 })
      }
      if (submissionState === 'INVALID') {
        return NextResponse.json({ error: '课次时间无效，暂不能提交考勤' }, { status: 400 })
      }
    }

    const scheduleConfig = await prisma.systemConfig.findUnique({
      where: { id: 'singleton' },
      select: { schedulePeriods: true },
    })
    const isSystemFirstPeriod = isFirstTeachingPeriod(
      normalizeSchedulePeriods(scheduleConfig?.schedulePeriods),
      lesson.startTime,
    )
    if (session.user.role === 'teacher' && isSystemFirstPeriod && mealStudentIds === null) {
      return NextResponse.json({ error: '系统第一课节需要同时提交学生就餐情况' }, { status: 400 })
    }
    if (!isSystemFirstPeriod && mealStudentIds !== null) {
      return NextResponse.json({ error: '就餐只能随系统第一课节登记' }, { status: 400 })
    }

    const attendanceOpenAt = teacherAttendanceOpenAt({
      lessonDate: lesson.lessonDate,
      startTime: lesson.startTime,
      intensiveMode: lesson.group.intensiveMode,
    })
    if (new Date() < attendanceOpenAt) {
      return NextResponse.json(
        {
          error: lesson.group.intensiveMode === 'INTENSIVE'
            ? `课程 ${lesson.startTime} 开始，突击全能班须在开课后提交考勤`
            : `未到考勤时间，课程 ${lesson.startTime} 开始，最早 30 分钟前可提交`,
        },
        { status: 400 }
      )
    }

    const group = lesson.group
    const isIntensive = group.intensiveMode === 'INTENSIVE'
    const existingDeductedCount = await prisma.attendance.count({
      where: { lessonId, hoursDeducted: { gt: 0 } },
    })
    // 整课重提会绕过单人更正中的课时冲退账务，因此已提交/结算课次统一锁定。
    if ((!rejectedIntensiveRetry && (lesson.attendanceSubmittedAt || lesson.status === 'COMPLETED'))
      || lesson.hoursDeductedAt
      || existingDeductedCount > 0) {
      return NextResponse.json(
        { error: '本节课考勤已经提交或结算，不能整课重提；如需更正，请使用管理员的单人考勤更正流程' },
        { status: 409 }
      )
    }
    if (isIntensive && lesson.settlementStatus !== 'UNSETTLED') {
      return NextResponse.json({ error: '该突击班课次已经结算，如需修改实际分钟请联系管理员走结算调整流程' }, { status: 409 })
    }
    const lessonSubject = lesson.subject
      || lesson.group.teacherAssignments.find((assignment) => assignment.teacherId === teacher.id)?.subject
      || lesson.group.course.subject
    const snapshotStudentIds = new Set(resolveSubjectLessonStudentIds(
      lesson.lessonStudents.map((item) => item.studentId),
      lesson.group.enrollments,
      lessonSubject,
      lesson.lessonDate,
    ))
    const eligibleStudentIds = snapshotStudentIds
    const validation = validateAttendanceSubmissionRecords(records, eligibleStudentIds)
    if (!validation.ok) {
      const messages = {
        EMPTY: { status: 400, error: '本节课没有已报读该学科的有效学员，请先核对报名学科与课次名单' },
        INVALID_RECORD: { status: 400, error: '考勤名单数据无效，请刷新页面后重试' },
        DUPLICATE_STUDENT: { status: 400, error: '考勤名单中有重复学员，请刷新页面后重试' },
        OUTSIDE_ROSTER: { status: 409, error: '本节课报名名单已更新，请刷新页面后重新提交考勤' },
        MISSING_ROSTER_STUDENT: { status: 409, error: '考勤名单不完整，已刷新完整名单后再提交，未保存本次考勤' },
        INVALID_STATUS: { status: 400, error: '存在无效考勤状态，请刷新页面后重试' },
        INVALID_MINUTES: { status: 400, error: '实际上课时长无效，请检查后重试' },
      } as const
      const result = messages[validation.reason]
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    const eligibleRecords = validation.records
    if (!hasAttendingStudent(eligibleRecords)) {
      return NextResponse.json({ error: '本次课没有实际出勤学员，不能提交已上课考勤；请联系管理员取消或调整课次' }, { status: 400 })
    }
    const intensiveActualMinutes = isIntensive
      ? resolveIntensiveActualMinutes(
          lesson.plannedMinutes || group.lessonMinutes,
          eligibleRecords.map((record) => record.actualMinutes),
        )
      : null
    const submittedAt = new Date()
    if (isIntensive) {
      const intensiveRecords: IntensiveReviewAttendanceRecord[] = eligibleRecords.map((record) => ({
        studentId: record.studentId,
        status: record.status as IntensiveReviewAttendanceRecord['status'],
        ...(record.rollCallStatus !== undefined ? { rollCallStatus: record.rollCallStatus } : {}),
      }))
      const eligibleIds = eligibleRecords.map((record) => record.studentId)
      const mealDate = new Date(`${lesson.lessonDate.toISOString().slice(0, 10)}T00:00:00.000Z`)
      const result = await submitIntensiveLessonReview({
        prisma,
        lessonId,
        teacherId: teacher.id,
        submittedById: user.id,
        actualMinutes: Number(intensiveActualMinutes),
        records: intensiveRecords,
        teacherNote: typeof body.note === 'string' ? body.note : null,
        rollCallSubmission,
        ...(isSystemFirstPeriod && mealStudentIds !== null ? {
          mealAttendance: {
            eligibleStudentIds: eligibleIds,
            eatingStudentIds: resolveEatingMealStudentIds(eligibleRecords, mealStudentIds),
            mealDate,
            division: lesson.division,
            recordedBy: user.id,
            groupId: group.id,
            groupName: group.name,
            lessonId: lesson.id,
            teacherId: teacher.id,
            teacherName: teacher.name || '教师',
          },
        } : {}),
      })
      return NextResponse.json({
        success: true,
        pendingReview: true,
        ...result,
        message: '授课记录已提交，管理员审核通过后计入课时和工资',
      })
    }
    const counts = { PRESENT: 0, LEAVE: 0, ABSENT: 0, MAKEUP: 0 }
    const alreadyDeducted = !isIntensive && (!!lesson.hoursDeductedAt || existingDeductedCount > 0)
    let processedCount = 0
    let deductedCount = 0
    const processedStudentIds: string[] = []

    const notifyConfigModel = (prisma as unknown as {
      notifyConfig?: {
        findUnique: (args: { where: { id: string }; select: { absenceAlert: true; lowHoursWarn: true } }) => Promise<AttendanceAlertConfig | null>
      }
    }).notifyConfig
    const savedNotifyConfig = await notifyConfigModel?.findUnique({
      where: { id: 'singleton' },
      select: { absenceAlert: true, lowHoursWarn: true },
    })
    const attendanceAlertConfig: AttendanceAlertConfig = {
      absenceAlert: savedNotifyConfig?.absenceAlert ?? true,
      lowHoursWarn: savedNotifyConfig?.lowHoursWarn ?? 3,
    }
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.classLesson.updateMany({
        where: {
          id: lessonId,
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] },
          attendanceSubmittedAt: null,
          hoursDeductedAt: null,
        },
        data: { attendanceSubmittedAt: submittedAt },
      })
      if (claimed.count !== 1) throw new Error('ATTENDANCE_SUBMISSION_LOCKED')

      if (isIntensive) {
        const claimed = await tx.classLesson.updateMany({
          where: { id: lessonId, settlementStatus: 'UNSETTLED' },
          data: { settlementStatus: 'SETTLED' },
        })
        if (claimed.count !== 1) throw new Error('INTENSIVE_SETTLEMENT_LOCKED')
      }

      // Use upsert instead of delete+create to avoid losing data
      for (const rec of eligibleRecords) {
        const studentId = rec.studentId
        const status = rec.status
        const enrollment = await tx.enrollment.findFirst({
          where: {
            studentId,
            groupId: group.id,
            ...(isIntensive ? {} : { status: 'ACTIVE' as const }),
            deletedAt: null,
            student: visibleStudentWhere,
            group: { course: { type: group.course.type } },
          },
          include: {
            student: { select: { id: true, name: true, parentId: true, parentUserId: true } },
          },
        })
        if (!enrollment) throw new Error('ATTENDANCE_ROSTER_CHANGED')
        let balanceChange: { beforeHours: number | null; afterHours: number | null } | null = null
        counts[status] += 1
        processedCount += 1
        processedStudentIds.push(studentId)
        const actualMinutes = isIntensive ? intensiveActualMinutes : rec.actualMinutes || null

        const rollCallFields = rec.rollCallStatus !== undefined
          ? {
              rollCallStatus: rec.rollCallStatus,
              rollCallMarkedAt: rec.rollCallStatus ? submittedAt : null,
            }
          : {}
        const attendance = await tx.attendance.upsert({
          where: {
            attendance_lesson_student_unique: {
              lessonId,
              studentId,
            },
          },
          update: { status, enrollmentId: enrollment.id, actualMinutes, ...rollCallFields, deletedAt: null, deletionBatchId: null },
          create: {
            lessonId,
            studentId,
            enrollmentId: enrollment.id,
            status,
            actualMinutes,
            ...(rec.rollCallStatus !== undefined ? {
              rollCallStatus: rec.rollCallStatus,
              rollCallMarkedAt: rec.rollCallStatus ? submittedAt : null,
            } : {}),
          },
        })
        const needsMakeup = shouldCreateMakeupRequest({
          status,
          courseType: group.course.type,
          intensiveMode: group.intensiveMode,
        })

        // Only deduct hours first time
        if (!alreadyDeducted) {
          const hoursDeducted = calculateAttendanceDeductHours({
            status,
            courseType: group.course.type,
            lessonMinutes: group.lessonMinutes,
            actualMinutes,
            intensiveMode: group.intensiveMode,
            billingMode: termKindToBillingMode(group.term?.kind),
          })
          if (hoursDeducted > 0) {
            if (!attendance.hoursDeducted || attendance.hoursDeducted <= 0) {
              const posting = await postAttendanceHours(tx, {
                attendanceId: attendance.id,
                enrollmentId: enrollment.id,
                enrollmentTotalHours: Number(enrollment.totalHours || 0),
                studentId,
                lessonId,
                groupName: group.name,
                operatorId: user.id,
                hours: hoursDeducted,
              })
              if (!posting.posted) {
                await createAttendanceParentAlerts(tx, {
                  parentUserId: enrollment.student.parentId || enrollment.student.parentUserId,
                  studentId,
                  studentName: enrollment.student.name,
                  groupName: group.name,
                  status,
                  config: attendanceAlertConfig,
                  beforeHours: posting.beforeHours,
                  afterHours: posting.afterHours,
                })
                continue
              }
              balanceChange = { beforeHours: posting.beforeHours, afterHours: posting.afterHours }
              deductedCount += 1
            }
          }
          if (needsMakeup) {
            const existingMakeup = await tx.makeupRequest.findFirst({
              where: { attendanceId: attendance.id },
            })
            if (!existingMakeup) {
              await tx.makeupRequest.create({
                data: { attendanceId: attendance.id, studentId, status: 'PENDING' },
              })
            }
          }
        } else if (needsMakeup) {
          const existingMakeup = await tx.makeupRequest.findFirst({
            where: { attendanceId: attendance.id },
          })
          if (!existingMakeup) {
            await tx.makeupRequest.create({
              data: { attendanceId: attendance.id, studentId, status: 'PENDING' },
            })
          }
        }

        await createAttendanceParentAlerts(tx, {
          parentUserId: enrollment.student.parentId || enrollment.student.parentUserId,
          studentId,
          studentName: enrollment.student.name,
          groupName: group.name,
          status,
          config: attendanceAlertConfig,
          ...balanceChange,
        })
      }

      if (processedCount === 0) {
        throw new Error('NO_VALID_ATTENDANCE_RECORDS')
      }
      if (counts.PRESENT === 0) {
        throw new Error('NO_ATTENDING_STUDENTS')
      }

      if (isSystemFirstPeriod && mealStudentIds !== null) {
        const selectedMealIds = resolveEatingMealStudentIds(eligibleRecords, mealStudentIds)
        const mealDate = new Date(`${lesson.lessonDate.toISOString().slice(0, 10)}T00:00:00.000Z`)
        await syncAutomaticMealAttendance(tx, {
          eligibleStudentIds: processedStudentIds,
          eatingStudentIds: selectedMealIds,
          mealDate,
          division: lesson.division,
          recordedBy: user.id,
          groupId: group.id,
          groupName: group.name,
          lessonId: lesson.id,
          teacherId: teacher.id,
          teacherName: teacher.name || '教师',
        })
      }

      await tx.classLesson.update({
        where: { id: lessonId },
        data: {
          status: 'COMPLETED',
          attendanceSubmittedAt: submittedAt,
          ...(rollCallSubmission ? { rollCallSubmittedAt: submittedAt } : {}),
          actualMinutes: isIntensive ? intensiveActualMinutes : undefined,
          settlementStatus: isIntensive ? 'SETTLED' : undefined,
          hoursDeductedAt: alreadyDeducted
            ? lesson.hoursDeductedAt || submittedAt
            : deductedCount > 0
              ? submittedAt
              : null,
        },
      })

      const completedCount = await tx.classLesson.count({
        where: { groupId: group.id, status: 'COMPLETED' },
      })
      await tx.classGroup.update({
        where: { id: group.id },
        data: { completedLessons: completedCount },
      })

      await tx.activityLog.create({
        data: {
          userId: user.id,
          teacherId: teacher.id,
          action: TEACHER_LOG_ACTIONS.ATTENDANCE_SUBMIT,
          detail: `${group.name} · ${counts.PRESENT}出勤/${counts.LEAVE}请假/${counts.ABSENT}旷课${alreadyDeducted ? ' (修改考勤，未重复扣课时)' : ''}`,
          entityType: 'ClassLesson',
          entityId: lessonId,
          metadata: { ...counts, alreadyDeducted, actualMinutes: intensiveActualMinutes, settlementStatus: isIntensive ? 'SETTLED' : undefined },
        },
      })

      if (!isIntensive) {
        const lessonPay = await createLessonPayInTransaction(tx, lessonId)
        if (!lessonPay.success) throw new Error(lessonPay.error || 'LESSON_PAY_FAILED')
      }

    })

    const msg = alreadyDeducted
      ? `考勤已更新（未重复扣课时）：出勤${counts.PRESENT}/请假${counts.LEAVE}/旷课${counts.ABSENT}`
      : `考勤已提交：出勤${counts.PRESENT}/请假${counts.LEAVE}/旷课${counts.ABSENT}`

    return NextResponse.json({
      success: true,
      counts,
      alreadyDeducted,
      processedCount,
      rollCallSubmittedAt: rollCallSubmission ? submittedAt.toISOString() : null,
      message: `${msg}；本节课工资按课次只结算一次`,
    })
  } catch (error) {
    const submissionConflict = getAttendanceSubmissionConflict(error)
    if (submissionConflict) return NextResponse.json(submissionConflict.body, { status: submissionConflict.status })
    if (error instanceof IntensiveReviewError) {
      return NextResponse.json(
        { error: error.message, code: error.code, detail: error.detail },
        { status: error.status },
      )
    }
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && (error.code === 'P2034' || error.code === 'P2002')
    ) {
      return NextResponse.json(
        { error: '授课记录正在被处理，请刷新后确认审核状态' },
        { status: 409 },
      )
    }
    if (error instanceof Error && error.message === 'NO_VALID_ATTENDANCE_RECORDS') {
      return NextResponse.json({ error: '没有有效考勤记录，请检查学生是否仍在班级中' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'NO_ATTENDING_STUDENTS') {
      return NextResponse.json({ error: '本次课没有实际出勤学员，不能提交已上课考勤；请联系管理员取消或调整课次' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'INTENSIVE_SETTLEMENT_LOCKED') {
      return NextResponse.json({ error: '该突击班课次已被结算，请刷新后通过结算调整流程修改' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'ATTENDANCE_ROSTER_CHANGED') {
      return NextResponse.json({ error: '学员报名状态已变化，本次考勤未保存，请刷新名单后重试' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'ATTENDANCE_SUBMISSION_LOCKED') {
      return NextResponse.json({ error: '本节课考勤正在提交或已提交，请刷新并确认最新状态' }, { status: 409 })
    }
    // 未知错误：记录日志后交给 api-handler 统一处理（生产环境不向客户端暴露内部错误细节）
    console.error('[teacher/attendance] 考勤提交未知错误', error)
    throw error
  }
})
