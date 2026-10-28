import type { PrismaClient } from '@prisma/client'
import type { ClassDetail } from '@/types/dashboard'
import { visibleClassLessonWhere, visibleStudentWhere, visibleClassroomFeedbackWhere } from './business-visibility'

export async function findDashboardLessonDetail(prisma: PrismaClient, id: string, division: string, termId: string) {
  return prisma.classLesson.findFirst({
    where: { ...visibleClassLessonWhere, id, division, group: { ...visibleClassLessonWhere.group, termId } },
    include: {
      teacher: { select: { name: true, avatar: true, gender: true, tierLevel: true, subjects: true } },
      group: { include: {
        course: { select: { name: true, subject: true, grade: true } },
        room: { select: { name: true } },
        teacher: { select: { name: true, avatar: true, gender: true, tierLevel: true, subjects: true } },
        enrollments: { where: { deletedAt: null, status: { not: 'WITHDRAWN' } }, select: { studentId: true, totalHours: true, usedHours: true, remainHours: true } },
      } },
      lessonStudents: { where: { student: visibleStudentWhere }, select: { student: { select: { id: true, name: true, gender: true, membershipLevel: true } } } },
      attendances: { where: { deletedAt: null }, select: { studentId: true, status: true } },
      classroomFeedbacks: { where: visibleClassroomFeedbackWhere, select: { studentIds: true } },
    },
  })
}

export function dashboardClassDetail(lesson: NonNullable<Awaited<ReturnType<typeof findDashboardLessonDetail>>>): ClassDetail {
  const attendance = new Map(lesson.attendances.map(row => [row.studentId, row.status]))
  const feedbackStudents = new Set(lesson.classroomFeedbacks.flatMap(row => row.studentIds))
  const teacher = lesson.teacher || lesson.group.teacher
  const date = lesson.lessonDate.toISOString().slice(0, 10)
  const start = new Date(`${date}T${lesson.startTime}:00+08:00`).getTime()
  const end = new Date(`${date}T${lesson.endTime}:00+08:00`).getTime()
  const now = Date.now()
  return {
    id: lesson.id, courseName: lesson.group.course.name, time: `${lesson.startTime}-${lesson.endTime}`,
    room: lesson.group.room?.name || '未安排教室', subject: lesson.subject || lesson.group.course.subject,
    grade: lesson.group.course.grade || '',
    statusLabel: lesson.status === 'COMPLETED' || lesson.attendanceSubmittedAt ? '已完成' : now >= end ? '待考勤' : now >= start ? '上课中' : '待上课',
    teacher: teacher ? { ...teacher, gender: teacher.gender || undefined } : { name: '未安排教师', avatar: null },
    students: lesson.lessonStudents.map(({ student }) => ({
      id: student.id, name: student.name, gender: student.gender,
      membershipLevel: ['VIP', 'SVIP'].includes(student.membershipLevel) ? student.membershipLevel as 'VIP' | 'SVIP' : 'NORMAL',
      attendanceStatus: ({ PRESENT: '出勤', ABSENT: '缺勤', LEAVE: '请假', MAKEUP: '补课' } as Record<string, string>)[attendance.get(student.id) || ''] || null,
      feedbackDone: feedbackStudents.has(student.id),
    })),
    attendanceDone: Boolean(lesson.attendanceSubmittedAt),
    feedbackDone: lesson.lessonStudents.length > 0 && lesson.lessonStudents.every(({ student }) => feedbackStudents.has(student.id)),
  }
}
