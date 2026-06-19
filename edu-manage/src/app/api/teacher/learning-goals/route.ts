import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { assertTeacherOwnsStudent, requireCurrentTeacher, TEACHER_LOG_ACTIONS } from '@/lib/teacher-portal'

export const dynamic = 'force-dynamic'

async function requireOwnedStudent(teacherId: string, studentId: string, prisma: Awaited<ReturnType<typeof requireCurrentTeacher>>['prisma']) {
  const student = await assertTeacherOwnsStudent(teacherId, studentId, prisma)
  if (!student) return null
  return student
}

export const GET = apiHandler(async (req: NextRequest) => {
  const { teacher, prisma } = await requireCurrentTeacher()
  const studentId = req.nextUrl.searchParams.get('studentId') || ''
  if (!studentId) return NextResponse.json({ error: '缺少 studentId' }, { status: 400 })
  const student = await requireOwnedStudent(teacher.id, studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  const goals = await prisma.learningGoal.findMany({
    where: { studentId },
    orderBy: [{ isAchieved: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({ goals })
})

export const POST = apiHandler(async (req: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await req.json()
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const goalDesc = typeof body.goalDesc === 'string' ? body.goalDesc.trim() : ''
  if (!studentId || !subject || !goalDesc) {
    return NextResponse.json({ error: '请填写学员、学科和目标' }, { status: 400 })
  }

  const student = await requireOwnedStudent(teacher.id, studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  const goal = await prisma.learningGoal.create({
    data: {
      studentId,
      subject,
      goalDesc,
      deadline: body.deadline ? new Date(body.deadline) : null,
    },
  })
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      teacherId: teacher.id,
      action: TEACHER_LOG_ACTIONS.LEARNING_GOAL_SAVE,
      detail: `${student.name} · 新建目标：${goalDesc}`,
      entityType: 'LearningGoal',
      entityId: goal.id,
      metadata: { studentId, subject },
    },
  })
  return NextResponse.json({ goal }, { status: 201 })
})

export const PATCH = apiHandler(async (req: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const body = await req.json()
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: '缺少目标 id' }, { status: 400 })

  const existing = await prisma.learningGoal.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '目标不存在' }, { status: 404 })
  const student = await requireOwnedStudent(teacher.id, existing.studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  const isAchieve = body.action === 'achieve'
  const goal = await prisma.learningGoal.update({
    where: { id },
    data: isAchieve
      ? { isAchieved: true, achievedAt: new Date() }
      : {
          subject: typeof body.subject === 'string' ? body.subject.trim() : undefined,
          goalDesc: typeof body.goalDesc === 'string' ? body.goalDesc.trim() : undefined,
          deadline: Object.prototype.hasOwnProperty.call(body, 'deadline') ? (body.deadline ? new Date(body.deadline) : null) : undefined,
          isAchieved: typeof body.isAchieved === 'boolean' ? body.isAchieved : undefined,
          achievedAt: body.isAchieved === true ? new Date() : body.isAchieved === false ? null : undefined,
        },
  })
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      teacherId: teacher.id,
      action: TEACHER_LOG_ACTIONS.LEARNING_GOAL_SAVE,
      detail: `${student.name} · ${isAchieve ? '标记达成' : '更新目标'}：${goal.goalDesc}`,
      entityType: 'LearningGoal',
      entityId: goal.id,
      metadata: { studentId: existing.studentId, action: body.action || 'update' },
    },
  })
  return NextResponse.json({ goal })
})

export const DELETE = apiHandler(async (req: NextRequest) => {
  const { user, teacher, prisma } = await requireCurrentTeacher()
  const id = req.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: '缺少目标 id' }, { status: 400 })

  const existing = await prisma.learningGoal.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: '目标不存在' }, { status: 404 })
  const student = await requireOwnedStudent(teacher.id, existing.studentId, prisma)
  if (!student) return NextResponse.json({ error: '无权操作该学员' }, { status: 403 })

  await prisma.learningGoal.delete({ where: { id } })
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      teacherId: teacher.id,
      action: TEACHER_LOG_ACTIONS.LEARNING_GOAL_SAVE,
      detail: `${student.name} · 删除目标：${existing.goalDesc}`,
      entityType: 'LearningGoal',
      entityId: id,
      metadata: { studentId: existing.studentId, action: 'delete' },
    },
  })
  return NextResponse.json({ success: true })
})
