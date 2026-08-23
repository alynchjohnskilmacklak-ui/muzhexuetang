import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireParentUser } from '@/lib/auth/guards'
import { parentLinkedStudentWhere, visibleNotificationWhere } from '@/lib/business-visibility'
import { protectedUploadFallback } from '@/lib/upload-url'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const parent = await requireParentUser()
  const studentWhere = parentLinkedStudentWhere(parent.id)
  const [students, memberships, entries] = await Promise.all([
    parent.prisma.student.findMany({ where: studentWhere, select: { id: true, name: true, grade: true }, orderBy: { name: 'asc' } }),
    parent.prisma.studyHallClassStudent.findMany({
      where: { student: studentWhere },
      include: {
        student: { select: { id: true, name: true, grade: true } },
        studyClass: {
          include: {
            term: { select: { id: true, name: true, status: true } },
            teachers: { where: { active: true }, include: { teacher: { select: { id: true, name: true } } } },
            sessions: { where: { active: true }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    }),
    parent.prisma.studyHallHomeworkEntry.findMany({
      where: { student: studentWhere },
      include: {
        session: { select: { id: true, label: true, startTime: true, endTime: true } },
        classRecord: {
          include: {
            studyClass: { select: { id: true, name: true, scheduleType: true } },
            recordedBy: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { classRecord: { studyDate: 'desc' } },
      take: 180,
    }),
  ])
  const visibleEntries = entries.map((entry) => ({
    ...entry,
    beforeImageUrls: entry.beforeImageUrls.map(protectedUploadFallback).filter(Boolean),
    afterImageUrls: entry.afterImageUrls.map(protectedUploadFallback).filter(Boolean),
    lessonImageUrls: entry.lessonImageUrls.map(protectedUploadFallback).filter(Boolean),
    imageUrls: entry.imageUrls.map(protectedUploadFallback).filter(Boolean),
  }))
  return NextResponse.json({ students, memberships, entries: visibleEntries })
})

export const PATCH = apiHandler(async (request: NextRequest) => {
  const parent = await requireParentUser()
  const body = await request.json() as { entryId?: unknown }
  const entryId = typeof body.entryId === 'string' ? body.entryId : ''
  if (!entryId) return NextResponse.json({ error: '缺少作业记录编号' }, { status: 400 })
  const entry = await parent.prisma.studyHallHomeworkEntry.findFirst({
    where: { id: entryId, student: parentLinkedStudentWhere(parent.id) },
    select: { id: true },
  })
  if (!entry) return NextResponse.json({ error: '记录不存在或无权查看' }, { status: 404 })
  await parent.prisma.notification.updateMany({
    where: { userId: parent.id, relatedType: 'STUDY_HALL_HOMEWORK', relatedId: entryId, ...visibleNotificationWhere },
    data: { read: true, readAt: new Date() },
  })
  return NextResponse.json({ ok: true })
})
