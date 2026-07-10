import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const oldTeacherId = typeof body.oldTeacherId === 'string' ? body.oldTeacherId : ''
  const newTeacherId = typeof body.newTeacherId === 'string' ? body.newTeacherId : ''
  const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : null

  if (!oldTeacherId || !newTeacherId) {
    return NextResponse.json({ error: '请选择要替换的老师' }, { status: 400 })
  }
  if (oldTeacherId === newTeacherId) {
    return NextResponse.json({ error: '新老师不能与原老师相同' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const group = await tx.classGroup.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          teacherId: true,
          teacher: { select: { id: true, name: true } },
        },
      })
      if (!group) throw Object.assign(new Error('班级不存在'), { status: 404 })

      const newTeacher = await tx.teacher.findFirst({
        where: { id: newTeacherId, status: 'ACTIVE' },
        select: { id: true, name: true },
      })
      if (!newTeacher) throw Object.assign(new Error('新老师不存在或未在职'), { status: 400 })

      // a. 更新未完成课次：按 teacherId + subject 过滤
      const affectedLessons = await tx.classLesson.updateMany({
        where: {
          groupId: id,
          teacherId: oldTeacherId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          ...(subject !== null ? { subject } : {}),
        },
        data: { teacherId: newTeacherId },
      })

      const oldTeacher = await tx.teacher.findUnique({
        where: { id: oldTeacherId },
        select: { name: true },
      })

      // b. 自愈 classGroupTeacher：update 或 create
      const existingAssignment = await tx.classGroupTeacher.findFirst({
        where: {
          groupId: id,
          teacherId: oldTeacherId,
          ...(subject !== null ? { subject } : {}),
        },
        select: { id: true, subject: true },
      })

      if (existingAssignment) {
        // 检查 newTeacher 同科目是否已存在（唯一约束冲突检测）
        const duplicate = await tx.classGroupTeacher.findFirst({
          where: {
            groupId: id,
            teacherId: newTeacherId,
            subject: existingAssignment.subject,
          },
          select: { id: true },
        })
        if (duplicate) {
          // 新老师已有同科目记录，删除旧记录即可
          await tx.classGroupTeacher.delete({ where: { id: existingAssignment.id } })
        } else {
          await tx.classGroupTeacher.update({
            where: { id: existingAssignment.id },
            data: { teacherId: newTeacherId },
          })
        }
      } else {
        // 对应表被塌缩过，尝试 create 一条
        const dupCheck = await tx.classGroupTeacher.findFirst({
          where: {
            groupId: id,
            teacherId: newTeacherId,
            subject: subject || null,
          },
          select: { id: true },
        })
        if (!dupCheck) {
          await tx.classGroupTeacher.create({
            data: {
              groupId: id,
              teacherId: newTeacherId,
              subject: subject || null,
              role: 'SUBJECT',
            },
          })
        }
      }

      // c. 仅当被换的是主讲时同步 group.teacherId
      if (group.teacherId === oldTeacherId) {
        await tx.classGroup.update({
          where: { id },
          data: { teacherId: newTeacherId, updatedAt: new Date() },
        })
      }

      // d. 学生 mainTeacherId 同步
      const activeEnrollments = await tx.enrollment.findMany({
        where: { groupId: id, status: 'ACTIVE' },
        select: {
          id: true,
          studentId: true,
          student: { select: { mainTeacherId: true } },
        },
      })

      for (const enrollment of activeEnrollments) {
        if (enrollment.student.mainTeacherId !== oldTeacherId) continue
        const oldTeacherGroupCount = await tx.enrollment.count({
          where: {
            studentId: enrollment.studentId,
            groupId: { not: id },
            status: 'ACTIVE',
            group: {
              status: { not: 'ARCHIVED' },
              course: { isActive: true },
              OR: [
                { teacherId: oldTeacherId },
                { teacherAssignments: { some: { teacherId: oldTeacherId } } },
              ],
            },
          },
        })
        if (oldTeacherGroupCount === 0) {
          await tx.student.update({
            where: { id: enrollment.studentId },
            data: { mainTeacherId: newTeacherId },
          })
        }
      }

      // e. activityLog
      const subjectLabel = subject || '主讲'
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: '更换老师',
          detail: `${group.name}，${subjectLabel}，${oldTeacher?.name || oldTeacherId} → ${newTeacher.name}，影响 ${affectedLessons.count} 节未上课次`,
        },
      })

      return { success: true, affectedLessons: affectedLessons.count, subject }
    })

    return NextResponse.json(result)
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : '更换老师失败' }, { status })
  }
})
