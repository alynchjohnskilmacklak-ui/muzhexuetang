import { NextResponse } from 'next/server'
import { differenceInDays } from 'date-fns'
import { requireCurrentTeacher, teacherLessonScopeWhere, teacherStudentWhere } from '@/lib/teacher-portal'
import { apiHandler } from '@/lib/api-handler'
import { calculateApprovedIntensiveHours, calculateTaughtHours } from '@/lib/student-taught-hours'
import { getActiveAcademicTerm } from '@/lib/academic-term'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
    const { user, teacher, prisma } = await requireCurrentTeacher()
    const activeTerm = await getActiveAcademicTerm(prisma, teacher.division)
    if (!activeTerm) return NextResponse.json([])
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lessonScope = await teacherLessonScopeWhere(prisma, teacher.id, activeTerm.id)
    const students = await prisma.student.findMany({
      where: {
        ...teacherStudentWhere(teacher.id, activeTerm.id),
        status: { not: 'INACTIVE' },
      },
      select: {
        id: true,
        name: true,
        grade: true,
        gender: true,
        school: true,
        membershipLevel: true,
        enrollments: {
          where: {
            status: 'ACTIVE',
            group: {
              termId: activeTerm.id,
              status: { not: 'ARCHIVED' },
              course: { isActive: true },
            },
          },
          select: {
            id: true,
            status: true,
            remainHours: true,
            totalHours: true,
            usedHours: true,
            subjects: true,
            group: {
              select: {
                id: true,
                name: true,
                status: true,
                lessonMinutes: true,
                intensiveMode: true,
                course: {
                  select: { id: true, name: true, subject: true, type: true, isActive: true },
                },
                teacherAssignments: {
                  where: { teacherId: teacher.id },
                  select: { subject: true },
                },
              },
            },
          },
        },
        classLessonStudents: {
          where: { lesson: lessonScope },
          select: { lesson: { select: { groupId: true, subject: true } } },
        },
        studyHallClasses: {
          where: {
            status: 'ACTIVE',
            studyClass: {
              termId: activeTerm.id,
              status: 'ACTIVE',
              teachers: { some: { teacherId: user.id, active: true } },
            },
          },
          select: {
            id: true,
            purchasedDays: true,
            adjustedDays: true,
            studyClass: { select: { id: true, name: true, scheduleType: true, gradeScope: true } },
          },
        },
        attendances: {
          where: {
            createdAt: { gte: monthStart },
            lesson: lessonScope,
          },
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const lastFeedbacks = await prisma.classroomFeedback.findMany({
      where: {
        teacherId: teacher.id,
        termId: activeTerm.id,
        status: 'PUBLISHED',
        studentIds: { isEmpty: false },
      },
      orderBy: { createdAt: 'desc' },
      select: { studentIds: true, createdAt: true },
    })
    const approvedIntensiveAttendances = students.length
      ? await prisma.attendance.findMany({
          where: {
            studentId: { in: students.map((student) => student.id) },
            lesson: {
              intensiveReviewStatus: 'APPROVED',
              group: {
                termId: activeTerm.id,
                intensiveMode: 'INTENSIVE',
                status: { not: 'ARCHIVED' },
                course: { isActive: true },
              },
              OR: [
                { teacherId: teacher.id },
                {
                  teacherId: null,
                  group: {
                    OR: [
                      { teacherId: teacher.id },
                      { teacherAssignments: { some: { teacherId: teacher.id } } },
                    ],
                  },
                },
              ],
            },
          },
          select: {
            studentId: true,
            status: true,
            actualMinutes: true,
            lesson: { select: { actualMinutes: true } },
          },
        })
      : []
    const approvedIntensiveByStudent = new Map<string, typeof approvedIntensiveAttendances>()
    for (const attendance of approvedIntensiveAttendances) {
      const current = approvedIntensiveByStudent.get(attendance.studentId) || []
      current.push(attendance)
      approvedIntensiveByStudent.set(attendance.studentId, current)
    }
    const lastFeedbackMap = new Map<string, Date>()
    for (const feedback of lastFeedbacks) {
      for (const studentId of feedback.studentIds) {
        if (!lastFeedbackMap.has(studentId)) lastFeedbackMap.set(studentId, feedback.createdAt)
      }
    }

    const visibleStudents = students.map((student) => {
      const visibleGroupIds = new Set(student.classLessonStudents.map((snapshot) => snapshot.lesson.groupId))
      const activeEnrollments = student.enrollments.filter((enrollment) => (
        enrollment.status === 'ACTIVE'
        && enrollment.group?.status !== 'ARCHIVED'
        && enrollment.group?.course?.isActive !== false
        && visibleGroupIds.has(enrollment.group?.id)
        && (() => {
          const subjects = enrollment.group?.teacherAssignments
            .map((assignment) => assignment.subject)
            .filter((subject): subject is string => Boolean(subject)) || []
          const teacherSubjects = subjects.length ? subjects : [enrollment.group?.course?.subject || '']
          return teacherSubjects.some((subject) => enrollmentIncludesSubject(enrollment.subjects, subject))
        })()
      ))
      const remainHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
      const totalHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)
      const taughtHours = calculateTaughtHours(
        activeEnrollments,
        calculateApprovedIntensiveHours(approvedIntensiveByStudent.get(student.id) || []),
      )
      const attendanceTotal = student.attendances.length
      const present = student.attendances.filter((attendance) => attendance.status === 'PRESENT').length
      const lastFeedback = lastFeedbackMap.get(student.id) || null
      const activeStudyHallMemberships = student.studyHallClasses
      if (!activeEnrollments.length && !activeStudyHallMemberships.length) return null
      const primaryCourseType = activeEnrollments.some((enrollment) => enrollment.group?.course?.type === 'ONE_ON_ONE')
        ? 'ONE_ON_ONE'
        : activeEnrollments.some((enrollment) => enrollment.group?.course?.type === 'SMALL_GROUP')
          ? 'SMALL_GROUP'
          : activeEnrollments.length
            ? 'GROUP'
            : activeStudyHallMemberships.length
              ? 'STUDY_HALL'
              : 'GROUP'
      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        gender: student.gender,
        school: student.school,
        membershipLevel: student.membershipLevel || 'NORMAL',
        enrollments: activeEnrollments.map((enrollment) => ({
          id: enrollment.id,
          remainHours: enrollment.remainHours,
          totalHours: enrollment.totalHours,
          usedHours: enrollment.usedHours,
          group: enrollment.group ? {
            id: enrollment.group.id,
            name: enrollment.group.name,
            lessonMinutes: enrollment.group.lessonMinutes,
            intensiveMode: enrollment.group.intensiveMode,
            course: enrollment.group.course ? {
              id: enrollment.group.course.id,
              name: enrollment.group.course.name,
              subject: enrollment.group.course.subject,
              type: enrollment.group.course.type,
            } : null,
            teacherAssignments: enrollment.group.teacherAssignments.map((assignment) => ({
              subject: assignment.subject,
            })),
          } : null,
        })),
        studyHallMemberships: activeStudyHallMemberships.map((membership) => ({
          id: membership.id,
          purchasedDays: membership.purchasedDays,
          adjustedDays: membership.adjustedDays,
          studyClass: membership.studyClass,
        })),
        remainHours,
        totalHours,
        taughtHours,
        attendanceRate: attendanceTotal ? Math.round((present / attendanceTotal) * 100) : 100,
        lastFeedback,
        daysSinceLastFeedback: lastFeedback ? differenceInDays(now, lastFeedback) : 999,
        primaryCourseType,
      }
    }).filter((student) => student !== null)
    return NextResponse.json(visibleStudents)
})
