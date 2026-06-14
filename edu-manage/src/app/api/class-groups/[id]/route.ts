import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { activeEnrollmentWhere, visibleClassGroupWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

function normalizeTeacherAssignments(body: Record<string, unknown>) {
  if (Array.isArray(body.teacherAssignments)) {
    const seen = new Set<string>()
    return body.teacherAssignments
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const entry = item as Record<string, unknown>
        const teacherId = typeof entry.teacherId === 'string' ? entry.teacherId : ''
        const subject = typeof entry.subject === 'string' ? entry.subject.trim() : ''
        if (!teacherId || seen.has(`${teacherId}:${subject}`)) return null
        seen.add(`${teacherId}:${subject}`)
        return { teacherId, subject: subject || null }
      })
      .filter((item): item is { teacherId: string; subject: string | null } => Boolean(item))
  }

  const teacherIds = Array.isArray(body.teacherIds)
    ? [...new Set(body.teacherIds.filter((tid): tid is string => typeof tid === 'string' && tid.length > 0))]
    : []
  const teacherId = typeof body.teacherId === 'string' && body.teacherId ? body.teacherId : teacherIds[0]
  return (teacherIds.length ? teacherIds : teacherId ? [teacherId] : []).map((id) => ({
    teacherId: id,
    subject: typeof body.subject === 'string' ? body.subject : null,
  }))
}

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const group = await prisma.classGroup.findFirst({
    where: { id, ...visibleClassGroupWhere },
    include: {
      course: true,
      teacher: { select: { id: true, name: true, phone: true } },
      teacherAssignments: {
        include: { teacher: { select: { id: true, name: true, phone: true, subjects: true } } },
        orderBy: { createdAt: 'asc' },
      },
      room: true,
      enrollments: { where: activeEnrollmentWhere, include: { student: true }, orderBy: { enrolledAt: 'asc' } },
      classLessons: {
        orderBy: { lessonDate: 'asc' },
        include: { teacher: { select: { id: true, name: true, subjects: true } } },
      },
      assessments: { orderBy: { assessDate: 'desc' } },
    },
  })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })
  revalidatePath('/parent/dashboard')
  revalidatePath('/parent/schedule')
  revalidatePath('/parent/grades')
  revalidatePath('/parent/performance')
  revalidatePath('/parent/teachers')

  return NextResponse.json(group)
})

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const body = await req.json()
  const { name, teacherId, roomId, maxStudents, status, note } = body
  const normalizedAssignments = normalizeTeacherAssignments(body)
  const primaryTeacherId = typeof teacherId === 'string' && teacherId ? teacherId : normalizedAssignments[0]?.teacherId

  const group = await prisma.$transaction(async (tx) => {
    const updated = await tx.classGroup.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(primaryTeacherId && { teacherId: primaryTeacherId }),
        ...(roomId !== undefined && { roomId }),
        ...(maxStudents && { maxStudents }),
        ...(status && { status }),
        ...(note !== undefined && { note }),
        updatedAt: new Date(),
      },
    })

    // 班级归档：级联清理学员报名、课时、未来课次
    if (status === 'ARCHIVED') {
      const activeEnrollments = await tx.enrollment.findMany({
        where: { groupId: id, status: 'ACTIVE' },
        select: { id: true, studentId: true, student: { select: { parentId: true, parentUserId: true } } },
      })
      const lessonIds = (await tx.classLesson.findMany({ where: { groupId: id }, select: { id: true } })).map((lesson) => lesson.id)
      if (activeEnrollments.length) {
        await tx.enrollment.updateMany({
          where: { groupId: id, status: 'ACTIVE' },
          data: { status: 'WITHDRAWN', remainHours: 0 },
        })
      }
      await tx.classLesson.updateMany({
        where: { groupId: id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        data: { status: 'CANCELLED', cancelReason: '班级已归档' },
      })
      if (lessonIds.length) {
        await tx.performancePost.updateMany({
          where: { classLessonId: { in: lessonIds }, deletedAt: null },
          data: { deletedAt: new Date(), isReadByParent: true },
        })
        await tx.examPaper.updateMany({
          where: { classLessonId: { in: lessonIds }, status: { not: 'DELETED' } },
          data: { status: 'DELETED', isReadByParent: true },
        })
        await tx.classroomFeedback.updateMany({
          where: { classLessonId: { in: lessonIds }, status: { not: 'ARCHIVED' } },
          data: { status: 'ARCHIVED', notifySent: true },
        })
      }
      const parentIds = [...new Set(activeEnrollments
        .flatMap((enr) => [enr.student.parentId, enr.student.parentUserId])
        .filter((parentId): parentId is string => Boolean(parentId)))]
      if (parentIds.length) {
        await tx.notification.deleteMany({
          where: { userId: { in: parentIds }, link: { in: ['/parent/performance', '/parent/grades', '/parent/schedule'] } },
        })
      }
      // 清除学员 mainTeacher 引用（如无其他该教师班级）
      for (const enr of activeEnrollments) {
        const student = await tx.student.findUnique({ where: { id: enr.studentId }, select: { mainTeacherId: true } })
        if (student?.mainTeacherId) {
          const otherGroups = await tx.enrollment.count({
            where: { studentId: enr.studentId, id: { not: enr.id }, status: 'ACTIVE',
              group: { OR: [{ teacherId: student.mainTeacherId }, { teacherAssignments: { some: { teacherId: student.mainTeacherId } } }] } },
          })
          if (otherGroups === 0) {
            await tx.student.update({ where: { id: enr.studentId }, data: { mainTeacherId: null } })
          }
        }
        const activeClassCount = await tx.enrollment.count({
          where: {
            studentId: enr.studentId,
            status: 'ACTIVE',
            group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
          },
        })
        if (activeClassCount === 0) {
          await tx.student.update({
            where: { id: enr.studentId },
            data: { status: 'TRIAL', remainHours: 0, totalHours: 0, mainTeacherId: null },
          })
        }
      }
      await tx.activityLog.create({
        data: { userId: user.id, action: '归档班级', detail: `${updated.name}，清理 ${activeEnrollments.length} 名学员报名及课时` },
      })
    } else {
      if (normalizedAssignments.length) {
        await tx.classGroupTeacher.deleteMany({ where: { groupId: id } })
        await tx.classGroupTeacher.createMany({
          data: normalizedAssignments.map((item, index) => ({
            groupId: id, teacherId: item.teacherId, subject: item.subject,
            role: index === 0 ? 'PRIMARY' : 'SUBJECT',
          })), skipDuplicates: true,
        })
      }
      await tx.activityLog.create({ data: { userId: user.id, action: '编辑班级', detail: updated.name } })
    }

    return updated
  })

  return NextResponse.json(group)
})

export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const { id } = await params
  const group = await prisma.classGroup.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: '班级不存在' }, { status: 404 })

  const deleted = await prisma.$transaction(async (tx) => {
    const snapshot = await tx.classGroup.findUnique({
      where: { id },
      include: {
        course: true,
        teacher: true,
        teacherAssignments: { include: { teacher: true } },
        room: true,
        enrollments: { include: { student: true, attendances: true } },
        classLessons: { include: { teacher: true, attendances: { include: { makeupRequest: true } } } },
        assessments: { include: { gradeRecords: { include: { student: true, dimensions: true, highlights: true } } } },
      },
    })

    if (!snapshot) throw new Error('CLASS_GROUP_NOT_FOUND')

    const lessonIds = snapshot.classLessons.map((lesson) => lesson.id)
    const enrollmentIds = snapshot.enrollments.map((enrollment) => enrollment.id)
    const assessmentIds = snapshot.assessments.map((assessment) => assessment.id)
    const gradeIds = snapshot.assessments.flatMap((assessment) => assessment.gradeRecords.map((record) => record.id))
    const attendanceWhere = [
      lessonIds.length ? { lessonId: { in: lessonIds } } : null,
      enrollmentIds.length ? { enrollmentId: { in: enrollmentIds } } : null,
    ].filter(Boolean) as Prisma.AttendanceWhereInput[]
    const attendanceIds = attendanceWhere.length
      ? await tx.attendance.findMany({ where: { OR: attendanceWhere }, select: { id: true } })
      : []
    const attendanceIdList = attendanceIds.map((attendance) => attendance.id)

    const backupPayload = {
      deletedAt: new Date().toISOString(),
      deletedBy: { id: user.id, name: user.name, role: user.role },
      entity: snapshot,
    }

    await tx.$executeRaw`
      INSERT INTO "DeletedRecord" ("id", "entityType", "entityId", "entityName", "payload", "deletedById", "reason")
      VALUES (
        ${randomUUID()},
        ${'ClassGroup'},
        ${snapshot.id},
        ${snapshot.name},
        ${Prisma.sql`CAST(${JSON.stringify(backupPayload)} AS JSONB)`},
        ${user.id},
        ${'delete_from_course_management'}
      )
    `

    if (attendanceIdList.length) await tx.makeupRequest.deleteMany({ where: { attendanceId: { in: attendanceIdList } } })
    if (gradeIds.length) {
      await tx.dimensionScore.deleteMany({ where: { gradeId: { in: gradeIds } } })
      await tx.classHighlight.deleteMany({ where: { gradeId: { in: gradeIds } } })
      await tx.gradeRecord.deleteMany({ where: { id: { in: gradeIds } } })
    }
    if (assessmentIds.length) await tx.assessment.deleteMany({ where: { id: { in: assessmentIds } } })
    await tx.classHighlight.deleteMany({ where: { groupId: id } })
    if (lessonIds.length) {
      await tx.postComment.deleteMany({ where: { post: { classLessonId: { in: lessonIds } } } })
      await tx.postReaction.deleteMany({ where: { post: { classLessonId: { in: lessonIds } } } })
      await tx.postBadge.deleteMany({ where: { post: { classLessonId: { in: lessonIds } } } })
      await tx.performancePost.deleteMany({ where: { classLessonId: { in: lessonIds } } })
      await tx.paperComment.deleteMany({ where: { paper: { classLessonId: { in: lessonIds } } } })
      await tx.paperReaction.deleteMany({ where: { paper: { classLessonId: { in: lessonIds } } } })
      await tx.paperQuestion.deleteMany({ where: { paper: { classLessonId: { in: lessonIds } } } })
      await tx.weaknessRecord.deleteMany({ where: { paper: { classLessonId: { in: lessonIds } } } })
      await tx.examPaper.deleteMany({ where: { classLessonId: { in: lessonIds } } })
      await tx.classroomFeedback.deleteMany({ where: { classLessonId: { in: lessonIds } } })
    }
    if (attendanceIdList.length) await tx.attendance.deleteMany({ where: { id: { in: attendanceIdList } } })
    if (lessonIds.length) await tx.classLesson.deleteMany({ where: { id: { in: lessonIds } } })
    if (enrollmentIds.length) await tx.enrollment.deleteMany({ where: { id: { in: enrollmentIds } } })
    await tx.classGroupTeacher.deleteMany({ where: { groupId: id } })
    await tx.classGroup.delete({ where: { id } })

    const affectedStudentIds = [...new Set(snapshot.enrollments.map((enrollment) => enrollment.studentId))]
    for (const studentId of affectedStudentIds) {
      const activeClassCount = await tx.enrollment.count({
        where: {
          studentId,
          status: 'ACTIVE',
          group: { status: { not: 'ARCHIVED' }, course: { isActive: true } },
        },
      })
      if (activeClassCount === 0) {
        await tx.student.update({
          where: { id: studentId },
          data: { status: 'TRIAL', remainHours: 0, totalHours: 0, mainTeacherId: null },
        })
      }
    }

    const remainingGroups = await tx.classGroup.count({
      where: { courseId: snapshot.courseId, status: { not: 'ARCHIVED' } },
    })
    const remainingSchedules = await tx.schedule.count({
      where: { courseId: snapshot.courseId, status: { not: 'cancelled' } },
    })
    if (remainingGroups === 0 && remainingSchedules === 0) {
      await tx.course.update({
        where: { id: snapshot.courseId },
        data: { isActive: false },
      })
    }

    await tx.activityLog.create({
      data: { userId: user.id, action: '删除班级', detail: `${group.name}，已备份后硬删除` },
    })

    return { id: snapshot.id, name: snapshot.name }
  })

  revalidatePath('/parent/dashboard')
  revalidatePath('/parent/schedule')
  revalidatePath('/parent/grades')
  revalidatePath('/parent/performance')
  revalidatePath('/parent/teachers')

  return NextResponse.json({ success: true, deleted })
})
