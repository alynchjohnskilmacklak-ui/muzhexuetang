import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { createParentFeedbackMessage } from '@/lib/feedback-conversation'
import { teacherCanAccessParentMessage } from '@/lib/parent-message-access'

function createConversationHarness(options?: { ownsStudent?: boolean }) {
  const state = {
    messageInput: null as Record<string, unknown> | null,
    legacyFeedbackInput: null as Record<string, unknown> | null,
    notifications: [] as Array<Record<string, unknown>>,
  }
  const conversation = {
    id: 'message-1',
    feedbackId: 'feedback-1',
    parentId: 'parent-1',
    teacherId: 'teacher-from-feedback',
    replies: [{ id: 'reply-1', role: 'parent', content: '孩子回家后会继续复习' }],
  }
  const tx = {
    parentMessage: {
      upsert: vi.fn(async (input: { create: Record<string, unknown> }) => {
        state.messageInput = input.create
        return conversation
      }),
    },
    classroomFeedback: {
      update: vi.fn(async (input: { data: Record<string, unknown> }) => {
        state.legacyFeedbackInput = input.data
        return input.data
      }),
    },
    user: { findFirst: vi.fn(async () => ({ id: 'teacher-user-1', status: 'active' })) },
    notification: {
      create: vi.fn(async (input: { data: Record<string, unknown> }) => {
        state.notifications.push(input.data)
        return input.data
      }),
    },
  }
  const prisma = {
    classroomFeedback: {
      findFirst: vi.fn(async () => ({
        id: 'feedback-1',
        teacherId: 'teacher-from-feedback',
        studentIds: ['student-1'],
        classLesson: { subject: '数学', group: { course: { subject: '数学' } } },
      })),
    },
    student: {
      findFirst: vi.fn(async () => options?.ownsStudent === false ? null : ({ id: 'student-1', name: '张三' })),
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  } as unknown as PrismaClient
  return { prisma, state, tx }
}

describe('feedback parent-message conversation', () => {
  it('derives the teacher from ClassroomFeedback and preserves the legacy reply field', async () => {
    const { prisma, state } = createConversationHarness()
    const result = await createParentFeedbackMessage({
      prisma,
      feedbackId: 'feedback-1',
      parentId: 'parent-1',
      parentName: '张三家长',
      content: '孩子回家后会继续复习',
    })

    expect(result).toMatchObject({ id: 'message-1', teacherId: 'teacher-from-feedback' })
    expect(state.messageInput).toMatchObject({
      feedbackId: 'feedback-1',
      parentId: 'parent-1',
      studentId: 'student-1',
      teacherId: 'teacher-from-feedback',
    })
    expect(state.legacyFeedbackInput).toMatchObject({ parentReply: '孩子回家后会继续复习' })
    expect(state.notifications[0]).toMatchObject({
      userId: 'teacher-user-1',
      relatedType: 'PARENT_MESSAGE',
      relatedId: 'message-1',
    })
  })

  it('rejects a parent who does not own a student in the feedback', async () => {
    const { prisma, tx } = createConversationHarness({ ownsStudent: false })
    await expect(createParentFeedbackMessage({
      prisma,
      feedbackId: 'feedback-1',
      parentId: 'other-parent',
      parentName: '其他家长',
      content: '不应写入',
    })).rejects.toThrow('FEEDBACK_PARENT_FORBIDDEN')
    expect(tx.parentMessage.upsert).not.toHaveBeenCalled()
  })

  it('authorizes feedback conversations by feedback teacher without Enrollment', async () => {
    const prisma = {
      classroomFeedback: { count: vi.fn(async ({ where }: { where: { teacherId: string } }) => where.teacherId === 'teacher-1' ? 1 : 0) },
      enrollment: { count: vi.fn(async () => { throw new Error('Enrollment must not be queried') }) },
    }
    const message = { feedbackId: 'feedback-1', studentId: 'student-1', teacherId: 'teacher-1' }
    await expect(teacherCanAccessParentMessage(prisma as never, message, 'teacher-1')).resolves.toBe(true)
    await expect(teacherCanAccessParentMessage(prisma as never, message, 'teacher-2')).resolves.toBe(false)
    expect(prisma.enrollment.count).not.toHaveBeenCalled()
  })

  it('keeps legacy ParentMessage access on the existing Enrollment rule', async () => {
    const prisma = {
      classroomFeedback: { count: vi.fn() },
      enrollment: { count: vi.fn(async () => 1) },
    }
    const message = { feedbackId: null, studentId: 'student-1', teacherId: 'teacher-1' }
    await expect(teacherCanAccessParentMessage(prisma as never, message, 'teacher-1')).resolves.toBe(true)
    expect(prisma.classroomFeedback.count).not.toHaveBeenCalled()
  })

  it('backfills only unambiguous legacy parents and never deletes old feedback fields', () => {
    const migration = readFileSync(
      new URL('../../prisma/migrations/20260719193000_link_feedback_parent_messages/migration.sql', import.meta.url),
      'utf8',
    )
    expect(migration).toContain('HAVING COUNT(DISTINCT "parentId") = 1')
    expect(migration).toContain('RAISE NOTICE')
    expect(migration).not.toMatch(/\bDELETE\s+FROM\s+"ClassroomFeedback"/i)
    expect(migration).not.toMatch(/\bDROP\s+(?:TABLE|COLUMN)\b/i)
  })
})
