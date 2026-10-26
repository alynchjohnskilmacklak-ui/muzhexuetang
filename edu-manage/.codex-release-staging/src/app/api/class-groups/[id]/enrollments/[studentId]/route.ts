import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { normalizeEnrollmentSubjects, validateEnrollmentSubjects } from '@/lib/enrollment-subjects'
import { chinaClock, isEditableSubjectRosterLesson } from '@/lib/enrollment-subject-change'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; studentId: string }> }

class SubjectChangeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function planSubjectChange(
  tx: Prisma.TransactionClient,
  groupId: string,
  studentId: string,
  selected: string[],
  expectedSubjects?: string[],
) {
  const enrollment = await tx.enrollment.findFirst({
    where: { studentId, groupId, status: 'ACTIVE', deletedAt: null },
    include: {
      student: { select: { name: true } },
      group: {
        select: {
          name: true,
          course: { select: { subject: true } },
          teacherAssignments: { select: { subject: true } },
          classLessons: { where: { deletedAt: null }, select: { subject: true }, distinct: ['subject'] },
        },
      },
    },
  })
  if (!enrollment) throw new SubjectChangeError('报名记录不存在', 404)

  const available = [...new Set([
    enrollment.group.course.subject,
    ...enrollment.group.teacherAssignments.map((assignment) => assignment.subject),
    ...enrollment.group.classLessons.map((lesson) => lesson.subject),
  ].filter((subject): subject is string => Boolean(subject)))].sort()
  if (!validateEnrollmentSubjects(selected, available)) {
    throw new SubjectChangeError('请至少选择一个该班级开设的学科', 400)
  }
  if (expectedSubjects && JSON.stringify([...expectedSubjects].sort()) !== JSON.stringify([...enrollment.subjects].sort())) {
    throw new SubjectChangeError('学科报名已被其他操作修改，请刷新后重新核对', 409)
  }

  // 空数组只用于兼容旧报名：旧数据视为已报班级全部学科。
  const current = enrollment.subjects.length ? enrollment.subjects : available
  const addedSubjects = selected.filter((subject) => !current.includes(subject))
  const removedSubjects = current.filter((subject) => !selected.includes(subject))
  const now = new Date()
  const { day } = chinaClock(now)
  const lessons = await tx.classLesson.findMany({
    where: {
      groupId,
      lessonDate: { gte: new Date(`${day}T00:00:00.000Z`) },
      status: 'SCHEDULED',
      deletedAt: null,
      attendanceSubmittedAt: null,
      hoursDeductedAt: null,
    },
    select: {
      id: true, subject: true, lessonDate: true, startTime: true,
      lessonStudents: { where: { studentId }, select: { id: true } },
      attendances: { where: { studentId, deletedAt: null }, select: { id: true } },
      classroomFeedbacks: { where: { studentIds: { has: studentId }, deletedAt: null }, select: { id: true } },
    },
  })

  const editable = lessons.filter((lesson) => isEditableSubjectRosterLesson({
    lessonDate: lesson.lessonDate,
    startTime: lesson.startTime,
    hasAttendance: lesson.attendances.length > 0,
    hasFeedback: lesson.classroomFeedbacks.length > 0,
  }, now))
  const addLessonIds = editable
    .filter((lesson) => selected.includes(lesson.subject || '') && lesson.lessonStudents.length === 0)
    .map((lesson) => lesson.id)
  const removeLessonIds = editable
    .filter((lesson) => !selected.includes(lesson.subject || '') && lesson.lessonStudents.length > 0)
    .map((lesson) => lesson.id)

  return {
    enrollment, current, selected, addedSubjects, removedSubjects,
    addLessonIds, removeLessonIds,
    preview: {
      currentSubjects: current,
      storedSubjects: enrollment.subjects,
      selectedSubjects: selected,
      addedSubjects,
      removedSubjects,
      addedLessonCount: addLessonIds.length,
      removedLessonCount: removeLessonIds.length,
      protectedMessage: '已开始、已考勤、已形成反馈或结算的课次及历史记录不改动；费用和课时余额不会自动调整。',
    },
  }
}

async function authorize(groupId: string) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') throw new SubjectChangeError('无权限', 403)
  const prisma = await getRequestPrisma()
  const group = await prisma.classGroup.findFirst({
    where: { id: groupId, division: user.division, deletedAt: null },
    select: { term: { select: { status: true } } },
  })
  if (!group) throw new SubjectChangeError('班级不存在或无权限', 404)
  if (group.term?.status !== 'ACTIVE') {
    throw new SubjectChangeError('历史批次只允许查看，不能调整学员名单', 409)
  }
  return { user, prisma }
}

function errorResponse(error: unknown) {
  if (error instanceof SubjectChangeError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    return NextResponse.json({ error: '名单正在被其他操作更新，请重新预览后再试' }, { status: 409 })
  }
  throw error
}

/** 预览增减学科对未来课次名单的影响，不写入数据库。 */
export const POST = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  const { id, studentId } = await params
  try {
    const { prisma } = await authorize(id)
    const body = await req.json()
    if (!Array.isArray(body.subjects)) throw new SubjectChangeError('请选择学科', 400)
    const selected = normalizeEnrollmentSubjects(body.subjects)
    const plan = await prisma.$transaction((tx) => planSubjectChange(tx, id, studentId, selected))
    return NextResponse.json(plan.preview)
  } catch (error) {
    return errorResponse(error)
  }
})

/** 确认变更；只同步尚未开始且尚无业务记录的课次名单。 */
export const PATCH = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  const { id, studentId } = await params
  try {
    const { user, prisma } = await authorize(id)
    const body = await req.json()
    if (!Array.isArray(body.subjects) || !Array.isArray(body.expectedSubjects)) {
      throw new SubjectChangeError('请先预览并确认学科变更', 400)
    }
    const selected = normalizeEnrollmentSubjects(body.subjects)
    const expected = normalizeEnrollmentSubjects(body.expectedSubjects)
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (reason.length > 200) throw new SubjectChangeError('变更说明不能超过 200 字', 400)

    const result = await prisma.$transaction(async (tx) => {
      const plan = await planSubjectChange(tx, id, studentId, selected, expected)
      if (!plan.addedSubjects.length && !plan.removedSubjects.length && !plan.addLessonIds.length && !plan.removeLessonIds.length) return plan.preview
      if ((plan.addedSubjects.length || plan.removedSubjects.length) && !reason) {
        throw new SubjectChangeError('请填写增减学科的原因，便于日后核对', 400)
      }
      if (plan.addedSubjects.length || plan.removedSubjects.length) {
        await tx.enrollment.update({ where: { id: plan.enrollment.id }, data: { subjects: selected } })
      }
      if (plan.removeLessonIds.length) {
        await tx.classLessonStudent.deleteMany({
          where: { studentId, lessonId: { in: plan.removeLessonIds } },
        })
      }
      if (plan.addLessonIds.length) {
        await tx.classLessonStudent.createMany({
          data: plan.addLessonIds.map((lessonId) => ({ lessonId, studentId })),
          skipDuplicates: true,
        })
      }
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: '修改学科报名',
          entityType: 'Enrollment',
          entityId: plan.enrollment.id,
          detail: `${plan.enrollment.student.name} / ${plan.enrollment.group.name}：增加 ${plan.addedSubjects.join('、') || '无'}；移除 ${plan.removedSubjects.join('、') || '无'}${reason ? `；原因：${reason}` : ''}`,
          metadata: {
            before: plan.current,
            after: selected,
            reason,
            addedLessonCount: plan.addLessonIds.length,
            removedLessonCount: plan.removeLessonIds.length,
          },
        },
      })
      return plan.preview
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
})
