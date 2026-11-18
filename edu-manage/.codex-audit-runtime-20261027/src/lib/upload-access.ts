import 'server-only'

import type { PrismaClient } from '@prisma/client'
import {
  AuthError,
  assertCanAccessClassLesson,
  assertCanAccessFeedback,
  assertCanAccessStudent,
  type SessionUser,
} from '@/lib/auth/guards'
import { resolveTeacherForUser } from '@/lib/performance'
import { teacherCanAccessParentMessage } from '@/lib/parent-message-access'
import { extractUploadStorageKey } from '@/lib/upload-url'
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

  const isMessageAsset = file.ownerType === 'parent_message' || file.visibility === 'MESSAGE_PARTICIPANTS'
  if (isMessageAsset) {
    if (file.ownerType !== 'parent_message' || file.visibility !== 'MESSAGE_PARTICIPANTS' || !file.studentId) {
      throw new AuthError('无权访问该文件')
    }
    if (role === 'parent') {
      await assertCanAccessStudent(actor, file.studentId)
      return
    }
    if (role === 'teacher') {
      const teacherId = actor.teacherId || (await resolveTeacherForUser(actor, actor.prisma))?.id
      if (!teacherId || !(await teacherCanAccessParentMessage(actor.prisma, {
        feedbackId: null,
        studentId: file.studentId,
        teacherId: null,
      }, teacherId))) {
        throw new AuthError('无权访问该文件')
      }
      return
    }
    throw new AuthError('无权访问该文件')
  }

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

  // 菜品图片：所有已登录用户可见（家长/教师都能看到菜单配图）
  if (file.ownerType === 'meal_image') {
    if (role === 'parent' && file.visibility === 'PARENT_VISIBLE') return
    if (role === 'teacher') return
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

/** Resolve an uploaded object back to its FileAsset policy before serving it. */
export async function assertCanAccessStoredFileAsset(actor: UploadActor, value: string) {
  const key = extractUploadStorageKey(value)
  if (!key) throw new AuthError('文件不存在', 404)
  const identifiers = [...new Set([
    value.trim(),
    key,
    `/api/uploads/${encodeURIComponent(key)}`,
    `/uploads/${key}`,
  ].filter(Boolean))]
  const file = await actor.prisma.fileAsset.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { storageKey: { in: identifiers } },
        { url: { in: identifiers } },
        { previewUrl: { in: identifiers } },
        { thumbnailUrl: { in: identifiers } },
      ],
    },
    select: {
      ownerType: true,
      visibility: true,
      uploadedById: true,
      studentId: true,
      lessonId: true,
      postId: true,
      feedbackId: true,
    },
  })
  if (!file) throw new AuthError('文件不存在或无权访问', 404)
  // Feedback assets use the stricter per-student feedback relationship check,
  // including unpublished drafts and the study-hall compatibility path.
  if (file.ownerType.toLowerCase() === 'feedback' || file.feedbackId) {
    throw new AuthError('无权访问该文件')
  }
  await assertCanAccessFileAsset(actor, file)
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
