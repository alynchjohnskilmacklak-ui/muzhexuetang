import { NextRequest, NextResponse } from 'next/server'
import { requireParentUser, getParentStudentIds } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api-handler'
import { createManyNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const parent = await requireParentUser()
  const studentIds = await getParentStudentIds(parent, parent.prisma)
  if (!studentIds.length) return NextResponse.json({ students: [], assignments: [] })
  const assignments = await parent.prisma.homeworkAssignment.findMany({
    where: { status: 'PUBLISHED', studentIds: { hasSome: studentIds } },
    include: {
      group: { select: { name: true, course: { select: { name: true } } } },
      teacher: { select: { name: true } },
      submissions: { where: { parentUserId: parent.id, studentId: { in: studentIds } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const students = await parent.prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true } })
  return NextResponse.json({ students, assignments })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const parent = await requireParentUser()
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const assignmentId = typeof body?.assignmentId === 'string' ? body.assignmentId : ''
  const studentId = typeof body?.studentId === 'string' ? body.studentId : ''
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const attachmentUrls = Array.isArray(body?.attachmentUrls) ? body.attachmentUrls.filter((url): url is string => typeof url === 'string') : []
  if (!assignmentId || !studentId || (!content && attachmentUrls.length === 0)) return NextResponse.json({ error: '请填写作业内容或上传照片' }, { status: 400 })
  if (content.length > 5000 || attachmentUrls.length > 8) return NextResponse.json({ error: '作业文字最多 5000 字，照片最多 8 张' }, { status: 400 })
  const studentIds = await getParentStudentIds(parent, parent.prisma)
  if (!studentIds.includes(studentId)) return NextResponse.json({ error: '无权为该学员提交作业' }, { status: 403 })
  const assignment = await parent.prisma.homeworkAssignment.findFirst({ where: { id: assignmentId, status: 'PUBLISHED', studentIds: { has: studentId } }, select: { id: true, title: true, teacherId: true, teacher: { select: { user: { select: { id: true } } } } } })
  if (!assignment) return NextResponse.json({ error: '作业不存在或已关闭' }, { status: 404 })
  if (attachmentUrls.length) {
    const assets = await parent.prisma.fileAsset.findMany({ where: { url: { in: attachmentUrls }, studentId, uploadedById: parent.id, ownerType: 'parent_message', visibility: 'MESSAGE_PARTICIPANTS', deletedAt: null }, select: { url: true } })
    if (assets.length !== new Set(attachmentUrls).size) return NextResponse.json({ error: '照片未完成上传或无法用于此学员作业' }, { status: 400 })
  }
  const existing = await parent.prisma.homeworkSubmission.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId } }, select: { status: true } })
  if (existing?.status === 'REVIEWED') return NextResponse.json({ error: '教师已批改，暂不支持重复提交' }, { status: 409 })
  const submission = await parent.prisma.homeworkSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    create: { assignmentId, studentId, parentUserId: parent.id, content: content || null, attachmentUrls },
    update: { parentUserId: parent.id, content: content || null, attachmentUrls, status: 'SUBMITTED', score: null, teacherComment: null, reviewedById: null, reviewedAt: null, submittedAt: new Date() },
  })
  if (assignment.teacher.user?.id) await createManyNotifications(parent.prisma, [{ userId: assignment.teacher.user.id, type: 'HOMEWORK_SUBMITTED', title: `收到作业：${assignment.title}`, content: '有一份新的普通课作业提交待批改。', relatedType: 'HOMEWORK_SUBMISSION', relatedId: submission.id, studentId, href: '/teacher/homework' }])
  return NextResponse.json({ submission }, { status: 201 })
})
