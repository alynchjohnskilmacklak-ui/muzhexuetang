import 'server-only'

import type { PrismaClient } from '@prisma/client'
import {
  AuthError,
  assertCanAccessClassLesson,
  assertCanAccessFeedback,
  assertCanAccessStudent,
  type SessionUser,
} from '@/lib/auth/guards'
export {
  canUseUploadType,
  normalizeUploadType,
  ownerTypeForUpload,
  uploadAllowsDocument,
  uploadRequiresImage,
} from '@/lib/upload-policy'

type UploadActor = SessionUser & { prisma: PrismaClient }


async function assertCanAccessPerformancePost(actor: UploadActor, postId: string) {
  const role = String(actor.role || '').toLowerCase()
  const post = await actor.prisma.performancePost.findFirst({
    where: { id: postId, deletedAt: null },
    select: {
      teacherId: true,
      student: { select: { parentUserId: true, parentId: true } },
    },
  })
  if (!post) throw new AuthError('成长动态不存在', 404)
  if (role === 'admin') return
  if (role === 'teacher' && actor.teacherId && post.teacherId === actor.teacherId) return
  if (role === 'parent' && (post.student.parentUserId === actor.id || post.student.parentId === actor.id)) return
  throw new AuthError('无权关联该成长动态')
}

export async function assertCanAccessFileAsset(
  actor: UploadActor,
  file: {
    ownerType?: string | null
    visibility?: string | null
    uploadedById?: string | null
    studentId?: string | null
    lessonId?: string | null
    postId?: string | null
  },
) {
  const role = String(actor.role || '').toLowerCase()
  if (role === 'admin' || file.visibility === 'PUBLIC' || file.uploadedById === actor.id) return

  if (role === 'parent' && file.visibility !== 'PARENT_VISIBLE') {
    throw new AuthError('无权访问该文件')
  }
  if (role === 'teacher' && file.visibility !== 'TEACHER_VISIBLE') {
    throw new AuthError('无权访问该文件')
  }

  if (file.ownerType === 'admin_material') {
    if (role === 'teacher' && file.visibility === 'TEACHER_VISIBLE') return
    if (role === 'parent' && file.visibility === 'PARENT_VISIBLE') return
  }

  if (file.studentId) {
    await assertCanAccessStudent(actor, file.studentId)
    return
  }
  if (file.lessonId) {
    await assertCanAccessClassLesson(actor, file.lessonId)
    return
  }
  if (file.postId) {
    await assertCanAccessPerformancePost(actor, file.postId)
    return
  }

  throw new AuthError('无权访问该文件')
}

/**
 * Validate every optional resource id supplied by the browser. Empty ids are
 * intentionally allowed because feedback images are uploaded before the
 * feedback row is created and are linked later through imageUrls.
 */
export async function validateUploadAssociations(
  actor: UploadActor,
  input: { studentId?: string | null; lessonId?: string | null; feedbackId?: string | null; postId?: string | null },
) {
  if (input.studentId) await assertCanAccessStudent(actor, input.studentId)
  if (input.lessonId) await assertCanAccessClassLesson(actor, input.lessonId)
  if (input.feedbackId) await assertCanAccessFeedback(actor, input.feedbackId)
  if (input.postId) await assertCanAccessPerformancePost(actor, input.postId)

  if (input.feedbackId && (input.studentId || input.lessonId)) {
    const feedback = await actor.prisma.classroomFeedback.findUnique({
      where: { id: input.feedbackId },
      select: { studentIds: true, classLessonId: true },
    })
    if (!feedback) throw new AuthError('课堂反馈不存在', 404)
    if (input.studentId && !feedback.studentIds.includes(input.studentId)) {
      throw new AuthError('学生与课堂反馈不匹配')
    }
    if (input.lessonId && feedback.classLessonId !== input.lessonId) {
      throw new AuthError('课次与课堂反馈不匹配')
    }
  }

  if (input.postId && input.studentId) {
    const post = await actor.prisma.performancePost.findUnique({
      where: { id: input.postId },
      select: { studentId: true },
    })
    if (!post) throw new AuthError('成长动态不存在', 404)
    if (post.studentId !== input.studentId) throw new AuthError('学生与成长动态不匹配')
  }
}
