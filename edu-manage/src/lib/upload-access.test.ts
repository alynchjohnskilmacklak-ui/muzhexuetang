import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/guards', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 403) {
      super(message)
      this.status = status
    }
  },
  assertCanAccessClassLesson: vi.fn(),
  assertCanAccessFeedback: vi.fn(),
  assertCanAccessStudent: vi.fn(),
}))
vi.mock('@/lib/performance', () => ({ resolveTeacherForUser: vi.fn() }))
vi.mock('@/lib/parent-message-access', () => ({ teacherCanAccessParentMessage: vi.fn() }))

import { assertCanAccessFileAsset, assertCanAccessStoredFileAsset } from './upload-access'
import { assertCanAccessStudent } from '@/lib/auth/guards'
import { teacherCanAccessParentMessage } from '@/lib/parent-message-access'

function actor(role: string, fileAsset: Record<string, unknown>) {
  const prisma = {
    fileAsset: { findFirst: vi.fn(async () => fileAsset) },
  } as unknown as PrismaClient
  return {
    user: {
      id: `${role}-user`,
      role,
      teacherId: role === 'teacher' ? 'teacher-session-id' : null,
      email: `${role}@example.com`,
      name: `${role} test user`,
      division: 'JUNIOR',
      prisma,
    },
    prisma,
  }
}

describe('stored upload visibility', () => {
  it('allows linked parents and teachers to read a message image only through student access', async () => {
    const file = {
      ownerType: 'parent_message',
      visibility: 'MESSAGE_PARTICIPANTS',
      uploadedById: 'admin-user',
      studentId: 'student-1',
      lessonId: null,
      postId: null,
    }
    const parent = actor('parent', file).user
    const teacher = actor('teacher', file).user
    vi.mocked(teacherCanAccessParentMessage).mockResolvedValue(true)

    await assertCanAccessFileAsset(parent, file)
    await assertCanAccessFileAsset(teacher, file)

    expect(assertCanAccessStudent).toHaveBeenNthCalledWith(1, parent, 'student-1')
    expect(teacherCanAccessParentMessage).toHaveBeenCalledWith(teacher.prisma, {
      feedbackId: null,
      studentId: 'student-1',
      teacherId: null,
    }, 'teacher-session-id')
  })

  it('denies a teacher who cannot access the linked parent conversation', async () => {
    const file = {
      ownerType: 'parent_message',
      visibility: 'MESSAGE_PARTICIPANTS',
      uploadedById: 'admin-user',
      studentId: 'student-1',
    }
    const teacher = actor('teacher', file).user
    vi.mocked(teacherCanAccessParentMessage).mockResolvedValue(false)

    await expect(assertCanAccessFileAsset(teacher, file)).rejects.toThrow('无权访问该文件')
  })

  it('does not treat unscoped or differently owned assets as message attachments', async () => {
    const parent = actor('parent', {}).user

    await expect(assertCanAccessFileAsset(parent, {
      ownerType: 'parent_message', visibility: 'MESSAGE_PARTICIPANTS', studentId: null,
    })).rejects.toThrow('无权访问该文件')
    await expect(assertCanAccessFileAsset(parent, {
      ownerType: 'parent_upload', visibility: 'MESSAGE_PARTICIPANTS', studentId: 'student-1',
    })).rejects.toThrow('无权访问该文件')
  })

  it('denies parents access to admin-only files even when using the direct upload URL', async () => {
    const file = {
      ownerType: 'admin_material',
      visibility: 'ADMIN_ONLY',
      uploadedById: 'admin-user',
      studentId: null,
      lessonId: null,
      postId: null,
      feedbackId: null,
    }
    const { user } = actor('parent', file)

    await expect(assertCanAccessStoredFileAsset(user, 'private/plan.pdf'))
      .rejects.toThrow('无权访问该文件')
  })

  it('denies a teacher access to parent-only material', async () => {
    const file = {
      ownerType: 'admin_material',
      visibility: 'PARENT_VISIBLE',
      uploadedById: 'admin-user',
      studentId: null,
      lessonId: null,
      postId: null,
      feedbackId: null,
    }
    const { user } = actor('teacher', file)

    await expect(assertCanAccessStoredFileAsset(user, 'parent-material/worksheet.pdf'))
      .rejects.toThrow('无权访问该文件')
  })

  it('allows the linked parent to read an admin practice-reply image while denying it to teachers', async () => {
    const file = {
      ownerType: 'admin_practice_reply',
      visibility: 'PARENT_VISIBLE',
      uploadedById: 'admin-user',
      studentId: 'student-1',
      lessonId: null,
      postId: null,
      feedbackId: 'feedback-1',
    }
    const parent = actor('parent', file).user
    const teacher = actor('teacher', file).user

    await assertCanAccessFileAsset(parent, file)
    await assertCanAccessStoredFileAsset(parent, 'admin_practice_reply/photo.webp')
    await expect(assertCanAccessFileAsset(teacher, file)).rejects.toThrow('无权访问该文件')
    await expect(assertCanAccessStoredFileAsset(teacher, 'admin_practice_reply/photo.webp')).rejects.toThrow('无权访问该文件')
    expect(assertCanAccessStudent).toHaveBeenCalledWith(parent, 'student-1')
  })
})
