import { describe, expect, it } from 'vitest'
import {
  getParentMessageWorkflowState,
  summarizeParentMessageWorkflow,
} from './parent-message-workflow'

const at = (minute: number) => new Date(`2026-07-23T08:${String(minute).padStart(2, '0')}:00.000Z`)

describe('parent message workflow', () => {
  it('marks a new parent message as waiting for the teacher', () => {
    const state = getParentMessageWorkflowState({
      status: 'OPEN',
      replies: [{
        role: 'parent',
        createdAt: at(1),
        isReadByParent: true,
        isReadByTeacher: false,
      }],
    }, new Date('2026-07-24T09:01:00.000Z'))

    expect(state.pendingTeacherReply).toBe(true)
    expect(state.unreadForTeacher).toBe(1)
    expect(state.overdue).toBe(true)
    expect(state.parentMessageViewedByTeacher).toBe(false)
  })

  it('keeps an admin-intervened conversation waiting for the teacher', () => {
    const state = getParentMessageWorkflowState({
      status: 'OPEN',
      replies: [
        { role: 'parent', createdAt: at(1), isReadByParent: true, isReadByTeacher: true },
        { role: 'admin', createdAt: at(2), isReadByParent: false, isReadByTeacher: true },
      ],
    })

    expect(state.pendingTeacherReply).toBe(true)
    expect(state.pendingParentRead).toBe(true)
  })

  it('marks a teacher reply as waiting for the parent to read', () => {
    const state = getParentMessageWorkflowState({
      status: 'REPLIED',
      replies: [
        { role: 'parent', createdAt: at(1), isReadByParent: true, isReadByTeacher: true },
        { role: 'teacher', createdAt: at(2), isReadByParent: false, isReadByTeacher: true },
      ],
    })

    expect(state.pendingTeacherReply).toBe(false)
    expect(state.pendingParentRead).toBe(true)
    expect(state.unreadForParent).toBe(1)
    expect(state.staffReplyViewedByParent).toBe(false)
  })

  it('reopens the teacher task when the parent follows up', () => {
    const state = getParentMessageWorkflowState({
      status: 'OPEN',
      replies: [
        { role: 'parent', createdAt: at(1), isReadByParent: true, isReadByTeacher: true },
        { role: 'teacher', createdAt: at(2), isReadByParent: true, isReadByTeacher: true },
        { role: 'parent', createdAt: at(3), isReadByParent: true, isReadByTeacher: false },
      ],
    })

    expect(state.pendingTeacherReply).toBe(true)
    expect(state.parentFollowUpCount).toBe(1)
  })

  it('summarizes conversations rather than counting a conversation twice', () => {
    const summary = summarizeParentMessageWorkflow([
      {
        status: 'OPEN',
        replies: [
          { role: 'parent', createdAt: at(1), isReadByParent: true, isReadByTeacher: false },
          { role: 'parent', createdAt: at(2), isReadByParent: true, isReadByTeacher: false },
        ],
      },
    ])

    expect(summary.pendingTeacherReplies).toBe(1)
    expect(summary.unreadForTeacher).toBe(2)
  })
})
