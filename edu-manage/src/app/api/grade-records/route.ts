import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { createManyNotifications, type NotificationInput } from '@/lib/notifications'
import { qywxEnabled } from '@/lib/qywx'

export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const prisma = await getRequestPrisma()

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const assessmentId = typeof body?.assessmentId === 'string' ? body.assessmentId : ''
  const absentStudentIds = Array.isArray(body?.absentStudentIds)
    ? body.absentStudentIds.filter((studentId): studentId is string => typeof studentId === 'string')
    : []
  const hasAbsentStudentIds = Array.isArray(body?.absentStudentIds)
  const replaceRosterState = body?.replaceRosterState === true
  const notifyParents = body?.notifyParents === true
  const records = Array.isArray(body?.records) ? body.records as {
    studentId: string; score: number; comment?: string
    dimensions?: { dimension: string; score: number; maxScore?: number }[]
  }[] : []

  if (!assessmentId || (records.length === 0 && absentStudentIds.length === 0)) {
    return NextResponse.json({ error: '缺少测评ID或成绩数据' }, { status: 400 })
  }
  if (replaceRosterState && !hasAbsentStudentIds) return NextResponse.json({ error: '缺少本次缺考名单' }, { status: 400 })
  if (notifyParents && !hasAbsentStudentIds) return NextResponse.json({ error: '缺少本次缺考名单' }, { status: 400 })
  if (hasAbsentStudentIds && absentStudentIds.length !== (body?.absentStudentIds as unknown[]).length) {
    return NextResponse.json({ error: '缺考名单格式无效' }, { status: 400 })
  }

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      group: { division: user.division, term: { status: 'ACTIVE' } },
    },
    select: {
      name: true,
      fullScore: true,
      absentStudentIds: true,
      notifiedAbsentStudentIds: true,
      group: {
        select: {
          termId: true,
          enrollments: {
            where: { status: 'ACTIVE', deletedAt: null, student: { status: 'ACTIVE', deletedAt: null } },
            select: { studentId: true, student: { select: { name: true, parentId: true, parentUserId: true } } },
          },
        },
      },
    },
  })
  if (!assessment?.group.termId) {
    return NextResponse.json({ error: '测评不属于当前启用批次' }, { status: 409 })
  }
  const enrolledStudentIds = new Set(assessment.group.enrollments.map((item) => item.studentId))
  const submittedStudentIds = new Set<string>()
  if (records.some((record) => {
    if (!record || typeof record.studentId !== 'string' || submittedStudentIds.has(record.studentId)) return true
    submittedStudentIds.add(record.studentId)
    return typeof record.score !== 'number' || !Number.isFinite(record.score) || record.score < 0 || record.score > assessment.fullScore
      || (record.comment !== undefined && typeof record.comment !== 'string')
      || (typeof record.comment === 'string' && record.comment.length > 500)
  })) {
    return NextResponse.json({ error: `成绩格式无效，分数范围为 0 至 ${assessment.fullScore} 分，评语不能超过 500 字` }, { status: 400 })
  }
  if (records.some((record) => !enrolledStudentIds.has(record.studentId))) {
    return NextResponse.json({ error: '成绩中包含不属于该班级当前批次的学员' }, { status: 409 })
  }
  const absentSet = new Set(absentStudentIds)
  if (absentSet.size !== absentStudentIds.length || absentStudentIds.some((studentId) => !enrolledStudentIds.has(studentId))) {
    return NextResponse.json({ error: '缺考名单中有重复学员或不属于当前班级的学员' }, { status: 409 })
  }
  if (absentStudentIds.some((studentId) => submittedStudentIds.has(studentId))) {
    return NextResponse.json({ error: '同一学员不能同时录入成绩和标记缺考' }, { status: 400 })
  }
  if (notifyParents) {
    const coveredIds = new Set([...submittedStudentIds, ...absentSet])
    if (coveredIds.size !== enrolledStudentIds.size || [...enrolledStudentIds].some((studentId) => !coveredIds.has(studentId))) {
      return NextResponse.json({ error: '请先为每名在班学员录入成绩或标记缺考，再通知家长' }, { status: 409 })
    }
  }
  const rosterByStudent = new Map(assessment.group.enrollments.map((enrollment) => [enrollment.studentId, enrollment.student]))
  const parentIds = [...new Set(assessment.group.enrollments.flatMap((enrollment) => {
    if (!notifyParents) return []
    const parentId = enrollment.student.parentId || enrollment.student.parentUserId
    return parentId ? [parentId] : []
  }))]
  const parents = parentIds.length
    ? await prisma.user.findMany({ where: { id: { in: parentIds }, role: 'parent', status: 'active' }, select: { id: true } })
    : []
  const activeParentIds = new Set(parents.map((parent) => parent.id))
  if (notifyParents) {
    const unboundStudents = [...submittedStudentIds, ...absentStudentIds].filter((studentId) => {
      const enrollment = assessment.group.enrollments.find((item) => item.studentId === studentId)
      const parentId = enrollment?.student.parentId || enrollment?.student.parentUserId
      return !parentId || !activeParentIds.has(parentId)
    })
    if (unboundStudents.length) {
      return NextResponse.json({ error: `${unboundStudents.length} 名学员未绑定有效家长账号，请先补全绑定` }, { status: 409 })
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const results = []
    const now = new Date()
    const currentAbsentIds = hasAbsentStudentIds ? absentStudentIds : assessment.absentStudentIds || []
    const previouslyNotifiedAbsent = (assessment.notifiedAbsentStudentIds || []).filter((studentId) => currentAbsentIds.includes(studentId))
    const nextNotifiedAbsent = notifyParents
      ? [...new Set([...previouslyNotifiedAbsent, ...currentAbsentIds])]
      : previouslyNotifiedAbsent

    if (replaceRosterState) {
      await tx.gradeRecord.updateMany({
        where: {
          assessmentId,
          deletedAt: null,
          studentId: { in: [...enrolledStudentIds], notIn: [...submittedStudentIds] },
        },
        data: { deletedAt: now, notifySent: false },
      })
    }
    if (hasAbsentStudentIds && absentStudentIds.length) {
      await tx.gradeRecord.updateMany({
        where: { assessmentId, deletedAt: null, studentId: { in: absentStudentIds } },
        data: { deletedAt: now, notifySent: false },
      })
    }

    if (hasAbsentStudentIds) {
      await tx.assessment.update({
        where: { id: assessmentId },
        data: { absentStudentIds: currentAbsentIds, notifiedAbsentStudentIds: nextNotifiedAbsent },
      })
    }
    const notifications: NotificationInput[] = []
    for (const rec of records) {
      const existing = await tx.gradeRecord.findFirst({
        where: { assessmentId, studentId: rec.studentId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, score: true, comment: true, notifySent: true },
      })
      const changed = !existing || existing.score !== rec.score || (rec.comment !== undefined && existing.comment !== (rec.comment || null))
      const shouldNotify = notifyParents && (!existing || changed || !existing.notifySent)
      const grade = existing
        ? await tx.gradeRecord.update({
            where: { id: existing.id },
            data: {
              score: rec.score,
              ...(rec.comment !== undefined ? { comment: rec.comment || null } : {}),
              notifySent: notifyParents ? true : changed ? false : existing.notifySent,
            },
          })
        : await tx.gradeRecord.create({
            data: {
              termId: assessment.group.termId,
              assessmentId,
              studentId: rec.studentId,
              score: rec.score,
              comment: rec.comment || null,
              notifySent: notifyParents,
            },
          })

      if (rec.dimensions?.length) {
        if (existing) await tx.dimensionScore.deleteMany({ where: { gradeId: grade.id } })
        await tx.dimensionScore.createMany({
          data: rec.dimensions.map((d) => ({
            gradeId: grade.id,
            dimension: d.dimension,
            score: d.score,
            maxScore: d.maxScore || 100,
          })),
        })
      }

      results.push(grade)
      if (shouldNotify) {
        const enrollment = assessment.group.enrollments.find((item) => item.studentId === rec.studentId)!
        const parentId = enrollment.student.parentId || enrollment.student.parentUserId!
        notifications.push({
          userId: parentId,
          studentId: rec.studentId,
          type: 'GRADE_RECORD',
          title: `${enrollment.student.name}的成绩已发布`,
          content: `${assessment.name}：${rec.score} / ${assessment.fullScore} 分。`,
          relatedType: 'GRADE_RECORD',
          relatedId: grade.id,
          href: '/parent/archive',
          pushStatus: qywxEnabled() ? 'queued' : 'none',
        })
      }
    }
    if (notifyParents) {
      for (const studentId of currentAbsentIds.filter((id) => !previouslyNotifiedAbsent.includes(id))) {
        const student = rosterByStudent.get(studentId)!
        const parentId = student.parentId || student.parentUserId!
        notifications.push({
          userId: parentId,
          studentId,
          type: 'GRADE_RECORD',
          title: `${student.name}的测评记录已发布`,
          content: `本次测评标记为缺考，请联系管理人员了解补测安排。`,
          relatedType: 'ASSESSMENT_ABSENCE',
          relatedId: `${assessmentId}:${studentId}`,
          href: '/parent/archive',
          pushStatus: qywxEnabled() ? 'queued' : 'none',
        })
      }
    }
    await createManyNotifications(tx, notifications)
    return results
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: notifyParents ? '录入并推送测评成绩' : '录入成绩', detail: `成绩${records.length}人，缺考${absentStudentIds.length}人` },
  })

  return NextResponse.json(created, { status: 201 })
})
