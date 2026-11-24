import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireAdminUser, AuthError } from '@/lib/auth/guards'
import { createNotification } from '@/lib/notifications'
import { getFeedbackArchiveDetail, FeedbackArchiveAccessError } from '@/lib/classroom-feedback/archive'
import { extractUploadStorageKey } from '@/lib/upload-url'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }
const MAX_REPLY_LENGTH = 1000
const MAX_REPLY_IMAGES = 6

export const POST = apiHandler(async (request: NextRequest, context: RouteContext) => {
  try {
    const actor = await requireAdminUser()
    const { id: feedbackId } = await context.params
    const body = await request.json().catch(() => null) as { studentId?: unknown; content?: unknown; imageUrls?: unknown } | null
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : ''
    const content = typeof body?.content === 'string' ? body.content.trim() : ''
    if (!studentId) return NextResponse.json({ error: '请选择学员' }, { status: 400 })
    if (typeof body?.content !== 'string' || content.length > MAX_REPLY_LENGTH) {
      return NextResponse.json({ error: `批示内容不能超过 ${MAX_REPLY_LENGTH} 个字` }, { status: 400 })
    }
    const rawImageUrls = body?.imageUrls
    if (rawImageUrls !== undefined && !Array.isArray(rawImageUrls)) {
      return NextResponse.json({ error: '图片列表格式不正确' }, { status: 400 })
    }
    if (Array.isArray(rawImageUrls) && rawImageUrls.some((value) => typeof value !== 'string' || value.length > 512)) {
      return NextResponse.json({ error: '图片地址格式不正确' }, { status: 400 })
    }
    const submittedUrls = Array.isArray(rawImageUrls)
      ? [...new Set(rawImageUrls.map((value) => value.trim()).filter(Boolean))]
      : []
    if (submittedUrls.length > MAX_REPLY_IMAGES) {
      return NextResponse.json({ error: `最多添加 ${MAX_REPLY_IMAGES} 张图片` }, { status: 400 })
    }
    if (!content && submittedUrls.length === 0) {
      return NextResponse.json({ error: '请输入批示内容或添加图片' }, { status: 400 })
    }

    const detail = await getFeedbackArchiveDetail(actor.prisma, actor, feedbackId)
    if (detail.status !== 'PUBLISHED') return NextResponse.json({ error: '课堂反馈发布后才能发送管理批示' }, { status: 409 })
    const studentDetail = detail.students.find((student) => student.id === studentId)
    if (!studentDetail) return NextResponse.json({ error: '该学员不属于此课堂反馈' }, { status: 403 })
    if (!studentDetail.learningSnapshot.practiceCheckin) {
      return NextResponse.json({ error: '家长提交练习回传后才能进行批示' }, { status: 409 })
    }
    const activeFeedback = await actor.prisma.classroomFeedback.findFirst({
      where: { id: feedbackId, status: 'PUBLISHED', deletedAt: null, studentIds: { has: studentId } },
      select: { id: true },
    })
    if (!activeFeedback) return NextResponse.json({ error: '课堂反馈不存在或已撤销' }, { status: 404 })

    const student = await actor.prisma.student.findFirst({
      where: { id: studentId, division: actor.division, deletedAt: null },
      select: { id: true, name: true, parentId: true, parentUserId: true },
    })
    if (!student) return NextResponse.json({ error: '学员不存在或无权查看' }, { status: 404 })

    if (submittedUrls.some((url) => !url.startsWith('/api/uploads/') && !url.startsWith('/uploads/'))) {
      return NextResponse.json({ error: '图片地址无效，请重新上传' }, { status: 400 })
    }
    const storageKeys = submittedUrls.map((url) => extractUploadStorageKey(url))
    if (storageKeys.some((key) => !key || key.includes('..'))) {
      return NextResponse.json({ error: '图片地址无效，请重新上传' }, { status: 400 })
    }
    const assets = storageKeys.length ? await actor.prisma.fileAsset.findMany({
      where: {
        storageKey: { in: storageKeys },
        ownerType: 'admin_practice_reply',
        visibility: 'PARENT_VISIBLE',
        uploadedById: actor.id,
        feedbackId,
        studentId,
        deletedAt: null,
      },
      select: { storageKey: true },
    }) : []
    if (assets.length !== storageKeys.length) {
      return NextResponse.json({ error: '图片未通过学员和反馈关联校验，请重新上传' }, { status: 400 })
    }
    const imageUrls = assets.map((asset) => `/api/uploads/${encodeURIComponent(asset.storageKey)}`)

    const parentUserIds = [...new Set([student.parentId, student.parentUserId].filter((id): id is string => Boolean(id)))]
    const result = await actor.prisma.$transaction(async (tx) => {
      const created = await tx.classroomFeedbackPracticeReply.create({
        data: {
          feedbackId,
          studentId,
          adminUserId: actor.id,
          content,
          imageUrls,
        },
        select: { id: true, content: true, imageUrls: true, createdAt: true },
      })
      const activeParents = parentUserIds.length ? await tx.user.findMany({
        where: { id: { in: parentUserIds }, role: 'parent', status: 'active' },
        select: { id: true },
      }) : []
      let notifiedParent = false
      for (const parent of activeParents) {
        await createNotification(tx, {
          userId: parent.id,
          type: 'CLASSROOM_FEEDBACK',
          title: '牧哲学堂管理团队回复了家庭练习回传',
          content: `${student.name}的课堂练习回传有了管理团队回复`,
          relatedType: 'CLASSROOM_FEEDBACK',
          relatedId: feedbackId,
          studentId,
          href: `/parent/class-feedback/${feedbackId}`,
          pushStatus: 'none',
        })
        notifiedParent = true
      }
      return { reply: created, notifiedParent }
    })

    return NextResponse.json({
      ok: true,
      reply: { ...result.reply, createdAt: result.reply.createdAt.toISOString() },
      notifiedParent: result.notifiedParent,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError || error instanceof FeedbackArchiveAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
})
