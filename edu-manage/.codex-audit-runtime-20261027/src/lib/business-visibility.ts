import type { Prisma } from '@prisma/client'

export const visibleStudentWhere = {
  status: { not: 'INACTIVE' },
  deletedAt: null,
} satisfies Prisma.StudentWhereInput

export const visibleTeacherWhere = {
  status: { not: 'RESIGNED' },
} satisfies Prisma.TeacherWhereInput

export const visibleCourseWhere = {
  isActive: true,
  deletedAt: null,
} satisfies Prisma.CourseWhereInput

export const activeCourseWhere = visibleCourseWhere

export const visibleClassGroupWhere = {
  status: { not: 'ARCHIVED' },
  deletedAt: null,
  course: visibleCourseWhere,
} satisfies Prisma.ClassGroupWhereInput

/**
 * Only individualized courses create an actionable makeup workflow.
 * Historical small-class leave/absence rows may still have legacy makeup
 * records, but they must not be surfaced as admin work items.
 */
export const makeupEligibleClassGroupWhere = {
  ...visibleClassGroupWhere,
  OR: [
    { intensiveMode: 'INTENSIVE' },
    { course: { isActive: true, type: 'ONE_ON_ONE' } },
  ],
} satisfies Prisma.ClassGroupWhereInput

export const visibleClassLessonWhere = {
  status: { notIn: ['CANCELLED', 'POSTPONED'] },
  deletedAt: null,
  group: visibleClassGroupWhere,
} satisfies Prisma.ClassLessonWhereInput

export const attendanceEligibleLessonWhere = {
  status: { notIn: ['CANCELLED', 'POSTPONED'] },
  deletedAt: null,
  group: visibleClassGroupWhere,
} satisfies Prisma.ClassLessonWhereInput

export const visibleExamPaperWhere = {
  status: 'PUBLISHED',
  deletedAt: null,
} satisfies Prisma.ExamPaperWhereInput

export const visibleTeacherExamPaperWhere = {
  status: { not: 'DELETED' },
  deletedAt: null,
} satisfies Prisma.ExamPaperWhereInput

export const visibleClassroomFeedbackWhere = {
  status: 'PUBLISHED',
  deletedAt: null,
} satisfies Prisma.ClassroomFeedbackWhereInput

export const visiblePerformancePostWhere = {
  deletedAt: null,
} satisfies Prisma.PerformancePostWhereInput

export const visibleNotificationWhere = {
  status: 'ACTIVE',
  deletedAt: null,
} satisfies Prisma.NotificationWhereInput

export const activeEnrollmentWhere = {
  status: 'ACTIVE',
  deletedAt: null,
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
    deletedAt: null,
  }
}

/**
 * Filter for active students belonging to a parent.
 * Deleted students are excluded from all parent business views.
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
 * Deleted papers are excluded from all parent business views.
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
