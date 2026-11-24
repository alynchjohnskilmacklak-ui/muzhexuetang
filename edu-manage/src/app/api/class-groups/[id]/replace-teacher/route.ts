import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { isClassGroupInActiveTerm } from '@/lib/admin-term-scope'
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
import { recordCourseChangeEvent } from '@/lib/course-change-events'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'
import { findTeacherReplacementConflicts } from '@/lib/teacher-replacement-conflicts'
import { findTeacherAssignmentForSubject } from '@/lib/teacher-assignment-subject'

export const dynamic = 'force-dynamic'

function lessonStartAt(lessonDate: Date, startTime: string) {
  return new Date(`${localDateKey(lessonDate)}T${startTime}:00+08:00`)
}

export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const { id } = await params
  if (!await isClassGroupInActiveTerm(prisma, id, user.division)) {
    return NextResponse.json({ error: '历史批次只允许查看，不能更换教师' }, { status: 409 })
  }
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
          status: true,
          teacherId: true,
          teacher: { select: { id: true, name: true } },
          teacherAssignments: { select: { teacherId: true, subject: true } },
          course: { select: { subject: true } },
        },
      })
      if (!group) throw Object.assign(new Error('班级不存在'), { status: 404 })

      const newTeacher = await tx.teacher.findFirst({
        where: { id: newTeacherId, status: 'ACTIVE' },
        select: { id: true, name: true, subjects: true },
      })
      if (!newTeacher) throw Object.assign(new Error('新老师不存在或未在职'), { status: 400 })

      const newTeacherSubs = (newTeacher.subjects || '')
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean)

      // Resolve the effective teacher for older lessons with a null teacherId too.
      const groupLessons = await tx.classLesson.findMany({
        where: {
          groupId: id,
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] },
        },
        select: { id: true, teacherId: true, subject: true, lessonDate: true, startTime: true, endTime: true },
      })
      const replacedAt = new Date()
      const affectedLessonRows = groupLessons.filter((lesson) => {
        // The workbench promises a forward-looking replacement. Leave a
        // past scheduled lesson attached to its original teacher for audit.
        if (lessonStartAt(lesson.lessonDate, lesson.startTime).getTime() <= replacedAt.getTime()) return false
        const lessonSubject = lesson.subject ?? group.course.subject
        const assignedTeacher = findTeacherAssignmentForSubject(
          group.teacherAssignments,
          lessonSubject,
          group.course.subject,
          group.teacherId,
        )?.teacherId
        const effectiveTeacherId = lesson.teacherId || assignedTeacher || group.teacherId
        return effectiveTeacherId === oldTeacherId && (!subject || lessonSubject === subject)
      })
      const affectedLessonIds = affectedLessonRows.map((lesson) => lesson.id)

      if (affectedLessonRows.length) {
        if (newTeacherSubs.length > 0) {
          const distinctLessonSubjects = [...new Set(affectedLessonRows.map((l) => l.subject ?? group.course.subject).filter(Boolean))] as string[]
          const unqualified = distinctLessonSubjects.filter((s) => !newTeacherSubs.includes(s))
          if (unqualified.length > 0) {
            throw Object.assign(new Error(`新老师（${newTeacher.name}）档案中未登记任教 ${unqualified.join('、')}，不能接替该学科排课`), { status: 400 })
          }
        }
        const dayRanges = [...new Set(affectedLessonRows.map((lesson) => localDateKey(lesson.lessonDate)))].map((date) => getLocalDayRange(date))
        const rangeStart = new Date(Math.min(...dayRanges.map((range) => range.start.getTime())))
        const rangeEnd = new Date(Math.max(...dayRanges.map((range) => range.end.getTime())))
        const otherLessons = await tx.classLesson.findMany({
          where: {
            id: { notIn: affectedLessonIds },
            deletedAt: null,
            status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] },
            lessonDate: { gte: rangeStart, lt: rangeEnd },
            OR: [
              { teacherId: newTeacherId },
              { group: { teacherId: newTeacherId } },
              { group: { teacherAssignments: { some: { teacherId: newTeacherId } } } },
            ],
            group: { deletedAt: null },
          },
          select: {
            id: true,
            teacherId: true,
            subject: true,
            lessonDate: true,
            startTime: true,
            endTime: true,
            group: {
              select: {
                name: true,
                teacherId: true,
                teacherAssignments: { select: { teacherId: true, subject: true } },
                course: { select: { subject: true } },
              },
            },
          },
        })
        const targetSlots = affectedLessonRows.map((lesson) => ({
          id: lesson.id,
          date: localDateKey(lesson.lessonDate),
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          groupName: group.name,
        }))
        const candidateSlots = otherLessons.flatMap((lesson) => {
          const lessonSubject = lesson.subject ?? lesson.group.course.subject
          const assignedTeacher = findTeacherAssignmentForSubject(
            lesson.group.teacherAssignments,
            lessonSubject,
            lesson.group.course.subject,
            lesson.group.teacherId,
          )?.teacherId
          const effectiveTeacherId = lesson.teacherId || assignedTeacher || lesson.group.teacherId
          return effectiveTeacherId === newTeacherId ? [{
            id: lesson.id,
            date: localDateKey(lesson.lessonDate),
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            groupName: lesson.group.name,
            teacherId: effectiveTeacherId,
          }] : []
        })
        const replacementConflicts = findTeacherReplacementConflicts(targetSlots, candidateSlots)
        if (replacementConflicts.length) {
          const conflictSummary = replacementConflicts.slice(0, 4).map((conflict) =>
            `${conflict.date} ${conflict.startTime}-${conflict.endTime} 与 ${conflict.otherGroupName} ${conflict.otherStartTime}-${conflict.otherEndTime} 冲突`,
          ).join('；')
          throw Object.assign(new Error(`新老师时间冲突：${conflictSummary}`), { status: 409, conflicts: replacementConflicts })
        }
      }

      // a. 更新未完成课次：按解析后的老师归属和学科过滤
      const affectedLessons = affectedLessonIds.length ? await tx.classLesson.updateMany({
        where: {
          id: { in: affectedLessonIds },
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'POSTPONED'] },
        },
        data: { teacherId: newTeacherId },
      }) : { count: 0 }
      const oldTeacher = await tx.teacher.findUnique({
        where: { id: oldTeacherId },
        select: { name: true },
      })

      // b. 自愈 classGroupTeacher：update 或 create
      const oldAssignments = await tx.classGroupTeacher.findMany({
        where: { groupId: id, teacherId: oldTeacherId },
        select: { id: true, teacherId: true, subject: true },
      })
      const existingAssignment = findTeacherAssignmentForSubject(
        oldAssignments,
        subject,
        group.course.subject,
        oldTeacherId,
      )

      if (existingAssignment) {
        // 检查 newTeacher 同科目是否已存在（唯一约束冲突检测）
        const newTeacherAssignments = await tx.classGroupTeacher.findMany({
          where: { groupId: id, teacherId: newTeacherId },
          select: { id: true, teacherId: true, subject: true },
        })
        const duplicate = findTeacherAssignmentForSubject(
          newTeacherAssignments,
          existingAssignment.subject,
          group.course.subject,
          newTeacherId,
        )
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
        const newTeacherAssignments = await tx.classGroupTeacher.findMany({
          where: { groupId: id, teacherId: newTeacherId },
          select: { id: true, teacherId: true, subject: true },
        })
        const dupCheck = findTeacherAssignmentForSubject(
          newTeacherAssignments,
          subject,
          group.course.subject,
          newTeacherId,
        )
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
          subjects: true,
          student: { select: { mainTeacherId: true } },
        },
      })
      const oldTeacherStillAssignedInGroup = await tx.classGroupTeacher.count({ where: { groupId: id, teacherId: oldTeacherId } })

      for (const enrollment of activeEnrollments) {
        if (enrollment.student.mainTeacherId !== oldTeacherId) continue
        if (subject && !enrollmentIncludesSubject(enrollment.subjects, subject)) continue
        if (oldTeacherStillAssignedInGroup > 0) continue
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

      const rosterRows = affectedLessonIds.length
        ? await tx.classLessonStudent.findMany({
            where: { lessonId: { in: affectedLessonIds } },
            select: { studentId: true },
          })
        : []
      const affectedStudentIds = [...new Set([
        ...rosterRows.map((row) => row.studentId),
        ...activeEnrollments
          .filter((enrollment) => !subject || enrollmentIncludesSubject(enrollment.subjects, subject))
          .map((enrollment) => enrollment.studentId),
      ])]
      let changeEventId: string | null = null
      if (affectedLessons.count > 0) {
        const change = await recordCourseChangeEvent(tx, {
          eventType: 'TEACHER_REPLACED',
          actorUserId: user.id,
          groupId: id,
          lessonIds: affectedLessonIds,
          studentIds: affectedStudentIds,
          title: '课程任课教师已调整',
          summary: `${group.name}的${subjectLabel}教师已由${oldTeacher?.name || oldTeacherId}调整为${newTeacher.name}，请查看最新课表。`,
          notifyParents: group.status === 'ACTIVE',
        })
        changeEventId = change.event.id
      }

      return { success: true, affectedLessons: affectedLessons.count, subject, changeEventId }
    })

    return NextResponse.json(result)
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 500
    return NextResponse.json({
      error: error instanceof Error ? error.message : '更换老师失败',
      conflicts: Array.isArray((error as { conflicts?: unknown }).conflicts) ? (error as { conflicts: unknown[] }).conflicts : undefined,
    }, { status })
  }
})
