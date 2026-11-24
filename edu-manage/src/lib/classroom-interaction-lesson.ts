import type { PrismaClient } from '@prisma/client'
import { teacherLessonScopeWhere } from '@/lib/teacher-portal'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
import { visibleStudentWhere } from '@/lib/business-visibility'

/**
 * 课堂互动共用的课次 / 名单解析。
 *
 * 名单必须以 ClassLessonStudent 快照 + 科目选课为准（而不是 ClassGroup 成员），
 * 否则临时插班、代课调课、分科目上课的学员会漏掉或串班。
 * 这里复用考勤链路的同一套解析函数，保证两个模块的"应到名单"口径一致。
 */

export type InteractionStudent = {
  studentId: string
  name: string
  grade: string | null
  /** 家长账号 id（parentId 优先，兼容历史 parentUserId） */
  parentUserId: string | null
}

export type InteractionLesson = {
  id: string
  lessonDate: string
  startTime: string
  endTime: string
  status: string
  intensiveMode: string | null
  subject: string | null
  groupName: string
  courseName: string
}

export type InteractionLessonBundle = {
  lesson: InteractionLesson
  students: InteractionStudent[]
}

type StudentSnapshot = {
  name: string
  grade: string | null
  parentId: string | null
  parentUserId: string | null
  deletedAt: Date | null
}

export async function loadInteractionLesson(
  prisma: PrismaClient,
  teacherId: string,
  lessonId: string,
): Promise<InteractionLessonBundle | null> {
  const lessonWhere = await teacherLessonScopeWhere(prisma, teacherId)
  const lesson = await prisma.classLesson.findFirst({
    where: { id: lessonId, deletedAt: null, ...lessonWhere },
    include: {
      group: {
        include: {
          course: { select: { name: true, subject: true } },
          teacherAssignments: { select: { teacherId: true, subject: true } },
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null, student: visibleStudentWhere },
            select: {
              studentId: true,
              subjects: true,
              student: {
                select: {
                  name: true,
                  grade: true,
                  parentId: true,
                  parentUserId: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      },
      lessonStudents: {
        select: {
          studentId: true,
          student: {
            select: {
              name: true,
              grade: true,
              parentId: true,
              parentUserId: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  })
  if (!lesson) return null

  const lessonSubject = lesson.subject
    || lesson.group.teacherAssignments.find((assignment) => assignment.teacherId === teacherId)?.subject
    || lesson.group.course.subject

  const rosterIds = resolveSubjectLessonStudentIds(
    lesson.lessonStudents.map((item) => item.studentId),
    lesson.group.enrollments.map((enrollment) => ({
      studentId: enrollment.studentId,
      subjects: enrollment.subjects,
    })),
    lessonSubject,
    lesson.lessonDate,
  )

  const snapshotById = new Map<string, StudentSnapshot>()
  for (const enrollment of lesson.group.enrollments) {
    snapshotById.set(enrollment.studentId, {
      name: enrollment.student.name,
      grade: enrollment.student.grade,
      parentId: enrollment.student.parentId,
      parentUserId: enrollment.student.parentUserId,
      deletedAt: enrollment.student.deletedAt,
    })
  }
  for (const item of lesson.lessonStudents) {
    if (snapshotById.has(item.studentId)) continue
    snapshotById.set(item.studentId, {
      name: item.student.name,
      grade: item.student.grade,
      parentId: item.student.parentId,
      parentUserId: item.student.parentUserId,
      deletedAt: item.student.deletedAt,
    })
  }

  const students: InteractionStudent[] = []
  for (const studentId of rosterIds) {
    const snapshot = snapshotById.get(studentId)
    // 已注销学员不进课堂互动名单，避免家长端出现已离校学员的记录
    if (!snapshot || snapshot.deletedAt !== null) continue
    students.push({
      studentId,
      name: snapshot.name,
      grade: snapshot.grade,
      parentUserId: snapshot.parentId || snapshot.parentUserId || null,
    })
  }

  return {
    lesson: {
      id: lesson.id,
      lessonDate: lesson.lessonDate.toISOString(),
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      status: lesson.status,
      intensiveMode: lesson.group.intensiveMode,
      subject: lessonSubject ?? null,
      groupName: lesson.group.name,
      courseName: lesson.group.course.name,
    },
    students,
  }
}
