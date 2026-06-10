import type { Prisma } from '@prisma/client'

export const visibleStudentWhere = {
  status: { not: 'INACTIVE' },
} satisfies Prisma.StudentWhereInput

export const visibleTeacherWhere = {
  status: { not: 'RESIGNED' },
} satisfies Prisma.TeacherWhereInput

export const visibleCourseWhere = {
  isActive: true,
} satisfies Prisma.CourseWhereInput

export const activeCourseWhere = visibleCourseWhere

export const visibleClassGroupWhere = {
  status: { not: 'ARCHIVED' },
  course: visibleCourseWhere,
} satisfies Prisma.ClassGroupWhereInput

export const visibleClassLessonWhere = {
  status: { notIn: ['CANCELLED', 'POSTPONED'] },
  group: visibleClassGroupWhere,
} satisfies Prisma.ClassLessonWhereInput

export const attendanceEligibleLessonWhere = {
  status: { notIn: ['CANCELLED', 'POSTPONED'] },
  group: visibleClassGroupWhere,
} satisfies Prisma.ClassLessonWhereInput

export const visibleScheduleWhere = {
  status: { not: 'cancelled' },
} satisfies Prisma.ScheduleWhereInput

export const visibleExamPaperWhere = {
  status: 'PUBLISHED',
} satisfies Prisma.ExamPaperWhereInput

export const visibleTeacherExamPaperWhere = {
  status: { not: 'DELETED' },
} satisfies Prisma.ExamPaperWhereInput

export const visibleClassroomFeedbackWhere = {
  status: 'PUBLISHED',
} satisfies Prisma.ClassroomFeedbackWhereInput

export const visiblePerformancePostWhere = {
  deletedAt: null,
} satisfies Prisma.PerformancePostWhereInput

export const visibleNotificationWhere = {
  status: 'ACTIVE',
} satisfies Prisma.NotificationWhereInput

export const activeEnrollmentWhere = {
  status: 'ACTIVE',
  student: visibleStudentWhere,
  group: visibleClassGroupWhere,
} satisfies Prisma.EnrollmentWhereInput

/**
 * Basic student link check (Parent context)
 */
export function parentLinkedStudentWhere(parentId: string): Prisma.StudentWhereInput {
  return {
    OR: [{ parentId }, { parentUserId: parentId }],
    status: { not: 'INACTIVE' },
  }
}

/**
 * Filter for active students belonging to a parent.
 * Note: This model (Student) does NOT have a 'deletedAt' field.
 */
export function parentActiveStudentWhere(parentId: string): Prisma.StudentWhereInput {
  return {
    ...parentLinkedStudentWhere(parentId),
    enrollments: { some: activeEnrollmentWhere },
  }
}

/**
 * Filter for active enrollments belonging to a parent's students.
 */
export function parentActiveEnrollmentWhere(parentId: string): Prisma.EnrollmentWhereInput {
  return {
    ...activeEnrollmentWhere,
    student: parentLinkedStudentWhere(parentId),
  }
}

/**
 * Filter for lessons visible to a parent (based on their children's active enrollments).
 */
export function parentVisibleLessonWhere(parentId: string): Prisma.ClassLessonWhereInput {
  return {
    ...visibleClassLessonWhere,
    group: {
      ...visibleClassGroupWhere,
      teacher: visibleTeacherWhere,
      enrollments: { some: parentActiveEnrollmentWhere(parentId) },
    },
  }
}

/**
 * PerformancePost filter for parents.
 * Explicitly includes 'deletedAt: null' because the PerformancePost model has this field.
 */
export function parentVisiblePerformancePostWhere(parentId: string): Prisma.PerformancePostWhereInput {
  return {
    deletedAt: null,
    teacher: visibleTeacherWhere,
    student: parentActiveStudentWhere(parentId),
    OR: [
      { classLessonId: null },
      { classLesson: { group: visibleClassGroupWhere } },
    ],
  }
}

/**
 * ExamPaper filter for parents.
 * Note: This model (ExamPaper) does NOT have a 'deletedAt' field.
 */
export function parentVisibleExamPaperWhere(parentId: string): Prisma.ExamPaperWhereInput {
  return {
    ...visibleExamPaperWhere,
    teacher: visibleTeacherWhere,
    student: parentActiveStudentWhere(parentId),
    OR: [
      { classLessonId: null },
      { classLesson: { group: visibleClassGroupWhere } },
    ],
  }
}
