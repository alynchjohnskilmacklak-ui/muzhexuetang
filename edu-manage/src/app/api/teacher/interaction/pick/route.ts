import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { ValidationError } from '@/lib/api-validate'
import { requireCurrentTeacher } from '@/lib/teacher-portal'
import { loadInteractionLesson } from '@/lib/classroom-interaction-lesson'
import { canWriteTeacherInteraction } from '@/lib/teacher-lesson-navigation'
import { createNotification } from '@/lib/notifications'
import { qywxEnabled } from '@/lib/qywx'
import {
  PICK_RESULT_LABELS,
  isPickResult,
  pickUniform,
  type PickHistoryEntry,
} from '@/lib/classroom-interaction'
import { randomInt } from 'crypto'

export const dynamic = 'force-dynamic'

const MAX_QUESTION_LABEL = 40
const MAX_COMMENT = 1000

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

/**
 * 新增一次提问。
 * 抽取在服务端完成：纯等概率随机抽取（每个在场学员被抽到的概率完全相同 1/N），缺勤/请假不进候选池，
 * 允许同一名学员被反复抽到。教师也可以直接指定学员（source=MANUAL，即「点名叫人」）。
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await request.json().catch(() => null) as
    | { lessonId?: string; studentId?: string; questionLabel?: string }
    | null
  if (!body || typeof body.lessonId !== 'string' || !body.lessonId) {
    throw new ValidationError('缺少课次')
  }

  const bundle = await loadInteractionLesson(prisma, teacher.id, body.lessonId)
  if (!bundle) return NextResponse.json({ error: '不可操作此课次' }, { status: 403 })
  if (!canWriteTeacherInteraction(bundle.lesson)) {
    return NextResponse.json({ error: '课程尚未开始，开课前 10 分钟开放随堂提问与抽人' }, { status: 409 })
  }
  if (bundle.students.length === 0) {
    return NextResponse.json({ error: '该课次没有应到学员' }, { status: 409 })
  }

  const rosterIds = bundle.students.map((student) => student.studentId)
  const existing = await prisma.classroomPick.findMany({
    where: { lessonId: body.lessonId },
    select: { studentId: true, round: true, createdAt: true, result: true },
  })
  const history: PickHistoryEntry[] = existing.map((pick) => ({
    studentId: pick.studentId,
    round: pick.round,
    createdAt: pick.createdAt,
    result: pick.result,
  }))

  // 缺勤、请假的学员直接跳过，不进入可提问名单
  const attendance = await prisma.attendance.findMany({
    where: { lessonId: body.lessonId, deletedAt: null },
    select: { studentId: true, status: true },
  })
  const skippedIds = new Set(
    attendance
      .filter((row) => row.status === 'ABSENT' || row.status === 'LEAVE')
      .map((row) => row.studentId),
  )
  const candidates = rosterIds.filter((studentId) => !skippedIds.has(studentId))
  if (candidates.length === 0) {
    return NextResponse.json({ error: '本节课没有到课学员，无法提问' }, { status: 409 })
  }

  const manualStudentId = typeof body.studentId === 'string' && body.studentId ? body.studentId : null
  if (manualStudentId && !rosterIds.includes(manualStudentId)) {
    throw new ValidationError('该学员不在本节课名单内')
  }
  if (manualStudentId && skippedIds.has(manualStudentId)) {
    return NextResponse.json({ error: '该学员本节课缺勤或请假，已跳过' }, { status: 409 })
  }

  // 纯等概率随机抽取：每个到课学员被抽到的概率完全相同 (1/N)，无任何权重或历史偏置
  let targetStudentId: string
  if (manualStudentId) {
    targetStudentId = manualStudentId
  } else {
    const picked = pickUniform(candidates, {
      random: (maxExclusive) => randomInt(maxExclusive),
    })
    if (!picked) {
      return NextResponse.json({ error: '候选名单为空，无法抽取' }, { status: 409 })
    }
    targetStudentId = picked
  }

  // round 记录"本节第几次提问"，每次自增，天然不会再撞唯一键
  let created
  try {
    created = await prisma.classroomPick.create({
      data: {
        lessonId: body.lessonId,
        studentId: targetStudentId,
        teacherId: teacher.id,
        round: existing.length + 1,
        source: manualStudentId ? 'MANUAL' : 'RANDOM',
        questionLabel: cleanText(body.questionLabel, MAX_QUESTION_LABEL),
      },
    })
  } catch (error) {
    // 连点同一名学员会撞 (lessonId, studentId, round) 唯一键，按业务冲突返回，避免 500
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: '上一次还没写入完成，请再点一次' }, { status: 409 })
    }
    throw error
  }

  const student = bundle.students.find((item) => item.studentId === targetStudentId)
  let notified = false
  // 同一课次同一学员只推一次，避免一节课反复打扰家长
  if (student?.parentUserId) {
    const priorNotified = await prisma.classroomPick.count({
      where: { lessonId: body.lessonId, studentId: targetStudentId, notifiedAt: { not: null } },
    })
    if (priorNotified === 0) {
      // 优先落到本节课的家长端反馈详情，家长在那里既能看到反馈也能看到提问记录
      const lessonFeedback = await prisma.classroomFeedback.findFirst({
        where: {
          classLessonId: body.lessonId,
          status: 'PUBLISHED',
          deletedAt: null,
          studentIds: { has: targetStudentId },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      const fallbackHref = `/parent/interaction?childId=${encodeURIComponent(student.studentId)}`
      const href = lessonFeedback
        ? `/parent/class-feedback/${lessonFeedback.id}?childId=${encodeURIComponent(student.studentId)}`
        : fallbackHref
      await createNotification(prisma, {
        userId: student.parentUserId,
        type: 'CLASSROOM_PICK',
        title: `${teacher.name || '老师'}在课堂上提问了${student.name}`,
        content: `${student.name}在这节课上被老师提问，点开可查看老师的即时点评。`,
        studentId: student.studentId,
        pushStatus: qywxEnabled() ? 'queued' : 'none',
        link: lessonFeedback ? `/parent/class-feedback/${lessonFeedback.id}` : '/parent/interaction',
        href,
        relatedType: 'CLASSROOM_PICK',
        relatedId: created.id,
        senderId: user.id,
      })
      await prisma.classroomPick.update({
        where: { id: created.id },
        data: { notifiedAt: new Date() },
      })
      notified = true
    }
  }

  return NextResponse.json({
    ok: true,
    notified,
    pick: {
      id: created.id,
      studentId: created.studentId,
      studentName: student?.name ?? '',
      round: created.round,
      source: created.source,
      questionLabel: created.questionLabel,
      result: created.result,
      comment: created.comment,
      createdAt: created.createdAt.toISOString(),
    },
  })
})

/**
 * 删除一条误操作的提问记录（点错人、重复点）。
 * 只允许删除本课次、本人创建的记录。
 */
export const DELETE = apiHandler(async (request: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const pickId = request.nextUrl.searchParams.get('pickId')
  if (!pickId) throw new ValidationError('缺少提问记录')

  const pick = await prisma.classroomPick.findFirst({
    where: { id: pickId, teacherId: teacher.id },
    select: { id: true, lessonId: true },
  })
  if (!pick) return NextResponse.json({ error: '无权删除该记录' }, { status: 403 })

  const bundle = await loadInteractionLesson(prisma, teacher.id, pick.lessonId)
  if (!bundle) return NextResponse.json({ error: '无权删除该课次记录' }, { status: 403 })

  await prisma.classroomPick.delete({ where: { id: pick.id } })
  return NextResponse.json({ ok: true, deleted: pick.id })
})

/**
 * 记录一次提问的结果与点评。
 * 家长端只看到自己孩子的记录，因此这里不做班级横向数据。
 */
export const PATCH = apiHandler(async (request: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await request.json().catch(() => null) as
    | { pickId?: string; result?: string; comment?: string; questionLabel?: string }
    | null
  if (!body || typeof body.pickId !== 'string' || !body.pickId) {
    throw new ValidationError('缺少提问记录')
  }

  const pick = await prisma.classroomPick.findFirst({
    where: { id: body.pickId, teacherId: teacher.id },
    select: { id: true, lessonId: true, studentId: true },
  })
  if (!pick) return NextResponse.json({ error: '无权修改该记录' }, { status: 403 })

  // 课次归属再校验一次：教师可能已被移出该班，历史记录不应继续被改
  const bundle = await loadInteractionLesson(prisma, teacher.id, pick.lessonId)
  if (!bundle) return NextResponse.json({ error: '无权修改该课次记录' }, { status: 403 })
  if (!canWriteTeacherInteraction(bundle.lesson)) {
    return NextResponse.json({ error: '课程尚未开始，当前仅可预览名单，暂不可修改课堂互动记录' }, { status: 409 })
  }

  if (body.result !== undefined && body.result !== null && !isPickResult(body.result)) {
    throw new ValidationError('评价结果不合法')
  }

  const updated = await prisma.classroomPick.update({
    where: { id: pick.id },
    data: {
      result: body.result === null ? null : (body.result as string | undefined) ?? undefined,
      comment: body.comment === undefined ? undefined : cleanText(body.comment, MAX_COMMENT),
      questionLabel: body.questionLabel === undefined ? undefined : cleanText(body.questionLabel, MAX_QUESTION_LABEL),
    },
  })

  // 随堂互动点评提交后，同步更新/推送家长端通知，将深度评语标签与作答表现完整呈现给家长
  const student = bundle.students.find((item) => item.studentId === pick.studentId)
  if (student?.parentUserId) {
    const lessonFeedback = await prisma.classroomFeedback.findFirst({
      where: {
        classLessonId: pick.lessonId,
        status: 'PUBLISHED',
        deletedAt: null,
        studentIds: { has: pick.studentId },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    const fallbackHref = `/parent/interaction?childId=${encodeURIComponent(student.studentId)}`
    const href = lessonFeedback
      ? `/parent/class-feedback/${lessonFeedback.id}?childId=${encodeURIComponent(student.studentId)}`
      : fallbackHref
    const link = lessonFeedback ? `/parent/class-feedback/${lessonFeedback.id}` : '/parent/interaction'

    const resultLabel = updated.result && isPickResult(updated.result) ? PICK_RESULT_LABELS[updated.result] : ''
    const notificationTitle = `${teacher.name || '老师'}随堂互动点评：${student.name}「${resultLabel || '已点评'}」`
    const notificationContent = [
      resultLabel ? `作答表现：${resultLabel}` : '',
      updated.comment ? `深度评语：${updated.comment}` : '',
    ].filter(Boolean).join('；') || `${student.name}在课堂上积极互动。点击查看老师即时点评。`

    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: student.parentUserId,
        relatedType: 'CLASSROOM_PICK',
        relatedId: updated.id,
      },
    })

    if (existingNotification) {
      await prisma.notification.update({
        where: { id: existingNotification.id },
        data: {
          title: notificationTitle,
          content: notificationContent,
          href,
          link,
        },
      })
    } else {
      await createNotification(prisma, {
        userId: student.parentUserId,
        type: 'CLASSROOM_PICK',
        title: notificationTitle,
        content: notificationContent,
        studentId: student.studentId,
        pushStatus: qywxEnabled() ? 'queued' : 'none',
        link,
        href,
        relatedType: 'CLASSROOM_PICK',
        relatedId: updated.id,
        senderId: user.id,
      })
    }

    await prisma.classroomPick.update({
      where: { id: updated.id },
      data: { notifiedAt: new Date() },
    })
  }

  return NextResponse.json({
    ok: true,
    pick: {
      id: updated.id,
      result: updated.result,
      resultLabel: updated.result && isPickResult(updated.result) ? PICK_RESULT_LABELS[updated.result] : null,
      comment: updated.comment,
      questionLabel: updated.questionLabel,
    },
  })
})
