import type { PrismaClient } from '@prisma/client'

export type FeedbackTeacherIdentity = {
  id: string
  division: string
  subjects: string | null
}

function splitSubjects(value: string | null | undefined) {
  return (value || '').split(/[,，、]/).map((item) => item.trim()).filter(Boolean)
}

/** Subjects a teacher may use for a classless, single-student feedback. */
export async function getTeacherFeedbackSubjects(
  prisma: PrismaClient,
  teacher: FeedbackTeacherIdentity,
) {
  const [assignments, courses] = await Promise.all([
    prisma.classGroupTeacher.findMany({
      where: {
        teacherId: teacher.id,
        group: {
          division: teacher.division,
          deletedAt: null,
          course: { isActive: true, deletedAt: null },
        },
      },
      select: { subject: true },
    }),
    prisma.course.findMany({
      where: {
        teacherId: teacher.id,
        division: teacher.division,
        isActive: true,
        deletedAt: null,
      },
      select: { subject: true },
    }),
  ])

  const declared = splitSubjects(teacher.subjects)
  const extra = [
    ...assignments.map((item) => item.subject),
    ...courses.map((item) => item.subject),
  ].map((item) => item?.trim()).filter((item): item is string => Boolean(item))

  // 优先保留教师档案明确登记的学科及其原始声明顺序（例如生物老师登记为“生物”，确保生物保持第1位），避免被拼音排序打乱
  const ordered: string[] = []
  for (const s of declared) {
    if (!ordered.includes(s)) ordered.push(s)
  }
  for (const s of extra) {
    if (!ordered.includes(s)) ordered.push(s)
  }
  return ordered
}
