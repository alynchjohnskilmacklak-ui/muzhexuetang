import type { PrismaClient } from '@prisma/client'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { summarizeParticipation, PICK_RESULT_LABELS, isPickResult } from '@/lib/classroom-interaction'

const LOOKBACK_DAYS = 30
const MAX_RECORDS = 50

export type ParentInteractionPayload = {
  children: Array<{ id: string; name: string; grade: string | null }>
  records: Array<{
    id: string
    studentId: string
    result: string | null
    resultLabel: string | null
    comment: string | null
    questionLabel: string | null
    createdAt: string
    lessonDate: string
    startTime: string
    endTime?: string | null
    subject: string | null
    courseName: string
    groupName: string
    feedbackId?: string | null
    teacher?: {
      id: string
      name: string
      avatar: string | null
      gender: string | null
      tierLevel: string | null
    } | null
  }>
  summary: {
    studentId: string
    totalPicks: number
    correctCount: number
    needsWorkCount: number
    lastPickedAt: string | null
    todayCount: number
  } | null
  lookbackDays: number
  error?: string
}

/** Load only the selected child's recent classroom records for the parent portal. */
export async function getParentInteractionPayload(
  prisma: PrismaClient,
  parentId: string,
  requestedChildId?: string | null,
): Promise<ParentInteractionPayload> {
  const rawChildren = await prisma.student.findMany({
    where: { ...parentLinkedStudentWhere(parentId), deletedAt: null },
    select: { id: true, name: true, grade: true },
    orderBy: { createdAt: 'asc' },
  })

  // 严格去重：按学员姓名去重，并收集同名学员的所有底层 studentId，避免多出重复选项
  const childMap = new Map<string, { id: string; name: string; grade: string | null; allIds: string[] }>()
  for (const raw of rawChildren) {
    if (!raw?.id || !raw?.name) continue
    const name = raw.name.trim()
    const existing = childMap.get(name)
    if (existing) {
      if (!existing.allIds.includes(raw.id)) {
        existing.allIds.push(raw.id)
      }
      if (!existing.grade && raw.grade) {
        existing.grade = raw.grade
      }
    } else {
      childMap.set(name, {
        id: raw.id,
        name,
        grade: raw.grade,
        allIds: [raw.id],
      })
    }
  }

  const dedupedChildren = Array.from(childMap.values())
  const publicChildren = dedupedChildren.map(({ id, name, grade }) => ({ id, name, grade }))

  const base = {
    children: publicChildren,
    records: [] as ParentInteractionPayload['records'],
    summary: null as ParentInteractionPayload['summary'],
    lookbackDays: LOOKBACK_DAYS,
  }
  if (dedupedChildren.length === 0) return base

  const activeChild = requestedChildId
    ? dedupedChildren.find((child) => child.id === requestedChildId || child.allIds.includes(requestedChildId))
    : dedupedChildren[0]

  if (requestedChildId && !activeChild) return { ...base, error: '无权访问该学员数据' }

  const targetIds = activeChild ? activeChild.allIds : dedupedChildren.flatMap((c) => c.allIds)
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000)

  const [picks, allTeachers] = await Promise.all([
    prisma.classroomPick.findMany({
      where: {
        studentId: { in: targetIds },
        parentVisible: true,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_RECORDS,
      select: {
        id: true,
        studentId: true,
        teacherId: true,
        result: true,
        comment: true,
        questionLabel: true,
        createdAt: true,
        lesson: {
          select: {
            id: true,
            lessonDate: true,
            startTime: true,
            endTime: true,
            subject: true,
            teacher: {
              select: {
                id: true,
                name: true,
                avatar: true,
                gender: true,
                tierLevel: true,
              },
            },
            group: {
              select: {
                name: true,
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    gender: true,
                    tierLevel: true,
                  },
                },
                course: { select: { name: true, subject: true } },
              },
            },
          },
        },
      },
    }),
    prisma.teacher.findMany({
      select: {
        id: true,
        name: true,
        gender: true,
        avatar: true,
        tierLevel: true,
        subjects: true,
      },
    }),
  ])

  const teacherByName = new Map(allTeachers.map((t) => [t.name.trim(), t]))
  const teacherById = new Map(allTeachers.map((t) => [t.id, t]))

  // 关联已发布的课堂反馈，方便家长直接点击跳转详情
  const lessonIds = Array.from(new Set(picks.map((pick) => pick.lesson.id)))
  const feedbacks = lessonIds.length
    ? await prisma.classroomFeedback.findMany({
        where: {
          classLessonId: { in: lessonIds },
          status: 'PUBLISHED',
          deletedAt: null,
        },
        select: { id: true, classLessonId: true },
      })
    : []
  const feedbackMap = new Map(feedbacks.map((f) => [f.classLessonId, f.id]))

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  return {
    ...base,
    records: picks.map((pick) => {
      const rawTeacher =
        pick.lesson.teacher ||
        pick.lesson.group.teacher ||
        (pick.teacherId ? teacherById.get(pick.teacherId) : null)
      const matchedTeacher =
        (rawTeacher?.name ? teacherByName.get(rawTeacher.name.trim()) : null) || rawTeacher

      return {
        id: pick.id,
        studentId: pick.studentId,
        result: pick.result,
        resultLabel: pick.result && isPickResult(pick.result) ? PICK_RESULT_LABELS[pick.result] : null,
        comment: pick.comment,
        questionLabel: pick.questionLabel,
        createdAt: pick.createdAt.toISOString(),
        lessonDate: pick.lesson.lessonDate.toISOString(),
        startTime: pick.lesson.startTime,
        endTime: pick.lesson.endTime,
        subject: pick.lesson.subject || pick.lesson.group.course.subject || null,
        courseName: pick.lesson.group.course.name,
        groupName: pick.lesson.group.name,
        feedbackId: feedbackMap.get(pick.lesson.id) || null,
        teacher: matchedTeacher
          ? {
              id: matchedTeacher.id,
              name: matchedTeacher.name,
              avatar: matchedTeacher.avatar,
              gender: matchedTeacher.gender,
              tierLevel: matchedTeacher.tierLevel,
            }
          : null,
      }
    }),
    summary: activeChild
      ? {
          studentId: activeChild.id,
          ...summarizeParticipation(picks.map((pick) => ({ result: pick.result, createdAt: pick.createdAt }))),
          todayCount: picks.filter((pick) => pick.createdAt >= todayStart).length,
        }
      : null,
  }
}
