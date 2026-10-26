import { NextRequest, NextResponse } from 'next/server'
import { AuthError, requireAuthenticatedUser } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api-handler'
import { resolveTeacherForUser } from '@/lib/performance'
import { canAccessFeedbackImage } from '@/lib/classroom-feedback/access'
import { assertCanAccessFileAsset } from '@/lib/upload-access'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const user = await requireAuthenticatedUser()
  const prisma = user.prisma

  try {
    const file = await prisma.fileAsset.findUnique({
      where: { id },
      select: {
        id: true, filename: true, originalName: true, mimeType: true, size: true,
        storageDriver: true, storageKey: true, url: true,
        ownerType: true, studentId: true, lessonId: true, feedbackId: true, postId: true,
        visibility: true, uploadedById: true, createdAt: true,
      },
    })

    if (!file) return NextResponse.json({ error: '文件不存在' }, { status: 404 })

    const f = file as Record<string, unknown>

    const isFeedbackAsset = f.ownerType === 'feedback'
    if (isFeedbackAsset) {
      let teacherId = user.teacherId
      if (String(user.role).toLowerCase() === 'teacher' && !teacherId) {
        teacherId = (await resolveTeacherForUser(user, prisma))?.id || null
      }
      const storageKey = String(f.storageKey || '')
      const access = await canAccessFeedbackImage(
        prisma,
        { id: user.id, role: user.role, teacherId },
        [storageKey],
      )
      if (!access.get(storageKey)?.allowed) {
        return NextResponse.json({ error: '无权访问该反馈图片' }, { status: 403 })
      }
    }

    if (!isFeedbackAsset) {
      await assertCanAccessFileAsset(user, {
        ownerType: String(f.ownerType || ''),
        visibility: String(f.visibility || ''),
        uploadedById: String(f.uploadedById || ''),
        studentId: f.studentId ? String(f.studentId) : null,
        lessonId: f.lessonId ? String(f.lessonId) : null,
        postId: f.postId ? String(f.postId) : null,
      })
    }

    return NextResponse.json({
      id: f.id,
      filename: f.filename,
      originalName: f.originalName,
      mimeType: f.mimeType,
      size: f.size,
      url: f.url,
      storageDriver: f.storageDriver,
      ownerType: f.ownerType,
      createdAt: f.createdAt,
    })
  } catch (error) {
    if (error instanceof AuthError) throw error
    return NextResponse.json({ error: '文件不存在或FileAsset表未就绪' }, { status: 404 })
  }
})
