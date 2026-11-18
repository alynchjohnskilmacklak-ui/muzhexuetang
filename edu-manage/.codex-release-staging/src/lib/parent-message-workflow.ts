export type ParentMessageWorkflowReply = {
  role: string
  createdAt: Date | string
  isReadByParent: boolean
  isReadByTeacher: boolean
}

export type ParentMessageWorkflowState = {
  pendingTeacherReply: boolean
  pendingParentRead: boolean
  unreadForTeacher: number
  unreadForParent: number
  latestParentAt: string | null
  latestStaffAt: string | null
  waitingSince: string | null
  waitingMinutes: number
  overdue: boolean
  parentMessageViewedByTeacher: boolean
  staffReplyViewedByParent: boolean
  parentFollowUpCount: number
}

type ParentMessageWorkflowInput = {
  status: string
  replies: ParentMessageWorkflowReply[]
}

function timestamp(value: Date | string) {
  return new Date(value).getTime()
}

export function getParentMessageWorkflowState(
  message: ParentMessageWorkflowInput,
  now: Date | number = Date.now(),
): ParentMessageWorkflowState {
  const parentReplies = message.replies.filter((reply) => reply.role === 'parent')
  const teacherReplies = message.replies.filter((reply) => reply.role === 'teacher')
  const staffReplies = message.replies.filter((reply) => reply.role !== 'parent')

  const latestParentAt = parentReplies.reduce(
    (latest, reply) => Math.max(latest, timestamp(reply.createdAt)),
    0,
  )
  const latestTeacherAt = teacherReplies.reduce(
    (latest, reply) => Math.max(latest, timestamp(reply.createdAt)),
    0,
  )
  const latestStaffAt = staffReplies.reduce(
    (latest, reply) => Math.max(latest, timestamp(reply.createdAt)),
    0,
  )
  const latestParentReply = parentReplies.find(
    (reply) => timestamp(reply.createdAt) === latestParentAt,
  )
  const latestStaffReply = staffReplies.find(
    (reply) => timestamp(reply.createdAt) === latestStaffAt,
  )
  const pendingTeacherReply =
    message.status !== 'CLOSED'
    && latestParentAt > 0
    && latestParentAt > latestTeacherAt
  const nowMs = typeof now === 'number' ? now : now.getTime()
  const waitingMinutes = pendingTeacherReply
    ? Math.max(0, Math.floor((nowMs - latestParentAt) / 60_000))
    : 0

  return {
    pendingTeacherReply,
    pendingParentRead: staffReplies.some((reply) => !reply.isReadByParent),
    unreadForTeacher: parentReplies.filter((reply) => !reply.isReadByTeacher).length,
    unreadForParent: staffReplies.filter((reply) => !reply.isReadByParent).length,
    latestParentAt: latestParentAt ? new Date(latestParentAt).toISOString() : null,
    latestStaffAt: latestStaffAt ? new Date(latestStaffAt).toISOString() : null,
    waitingSince: pendingTeacherReply ? new Date(latestParentAt).toISOString() : null,
    waitingMinutes,
    overdue: waitingMinutes >= 24 * 60,
    parentMessageViewedByTeacher: Boolean(latestParentReply?.isReadByTeacher),
    staffReplyViewedByParent: Boolean(latestStaffReply?.isReadByParent),
    parentFollowUpCount: Math.max(0, parentReplies.length - 1),
  }
}

export function summarizeParentMessageWorkflow(
  messages: ParentMessageWorkflowInput[],
) {
  return messages.reduce(
    (summary, message) => {
      const state = getParentMessageWorkflowState(message)
      if (state.pendingTeacherReply) summary.pendingTeacherReplies += 1
      if (state.overdue) summary.overdueTeacherReplies += 1
      if (state.pendingParentRead) summary.pendingParentReads += 1
      summary.unreadForTeacher += state.unreadForTeacher
      summary.unreadForParent += state.unreadForParent
      return summary
    },
    {
      pendingTeacherReplies: 0,
      pendingParentReads: 0,
      unreadForTeacher: 0,
      unreadForParent: 0,
      overdueTeacherReplies: 0,
    },
  )
}
