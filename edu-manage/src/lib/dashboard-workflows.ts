export type WorkflowStepState = 'done' | 'active' | 'pending'

export interface TeacherWorkflowLesson {
  id: string
  startTime?: string
  endTime?: string
  attendanceSubmittedAt?: string | Date | null
  hasFeedback: boolean
  lessonId?: string
  feedbackId?: string | null
}

export interface TeacherLessonWorkflow {
  steps: Array<{
    key: 'lesson' | 'attendance' | 'feedback'
    label: string
    state: WorkflowStepState
  }>
  action: {
    label: string
    href: string
  }
  completed: boolean
}

function minutesFromTime(value?: string) {
  const match = value?.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function deriveTeacherLessonWorkflow(
  lesson: TeacherWorkflowLesson,
  now = new Date(),
): TeacherLessonWorkflow {
  const attendanceDone = Boolean(lesson.attendanceSubmittedAt)
  const feedbackDone = lesson.hasFeedback
  const endMinutes = minutesFromTime(lesson.endTime)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const lessonFinished = endMinutes !== null && nowMinutes >= endMinutes

  if (feedbackDone) {
    return {
      completed: true,
      steps: [
        { key: 'lesson', label: '课堂', state: 'done' },
        { key: 'attendance', label: '考勤', state: 'done' },
        { key: 'feedback', label: '反馈', state: 'done' },
      ],
      action: {
        label: '查看反馈',
        href: lesson.feedbackId
          ? `/teacher/feedback?viewId=${lesson.feedbackId}`
          : '/teacher/feedback',
      },
    }
  }

  if (attendanceDone) {
    return {
      completed: false,
      steps: [
        { key: 'lesson', label: '课堂', state: 'done' },
        { key: 'attendance', label: '考勤', state: 'done' },
        { key: 'feedback', label: '反馈', state: 'active' },
      ],
      action: {
        label: '填写反馈',
        href: lesson.lessonId
          ? `/teacher/feedback?lessonId=${lesson.lessonId}`
          : '/teacher/feedback',
      },
    }
  }

  if (lessonFinished) {
    return {
      completed: false,
      steps: [
        { key: 'lesson', label: '课堂', state: 'done' },
        { key: 'attendance', label: '考勤', state: 'active' },
        { key: 'feedback', label: '反馈', state: 'pending' },
      ],
      action: { label: '提交考勤', href: '/teacher/attendance' },
    }
  }

  return {
    completed: false,
    steps: [
      { key: 'lesson', label: '课堂', state: 'active' },
      { key: 'attendance', label: '考勤', state: 'pending' },
      { key: 'feedback', label: '反馈', state: 'pending' },
    ],
    action: { label: '查看课程', href: '/teacher/schedule' },
  }
}

export type ParentTimelineEvent = {
  id: string
  type: 'lesson' | 'feedback' | 'message'
  timestamp: string
  timeLabel: string
  title: string
  detail: string
  status?: string
  href: string
}

type ParentTimelineLesson = {
  id: string
  title: string
  startTime?: string
  startTimeRaw?: string | null
  teacherName?: string | null
  roomName?: string | null
  attendanceSubmittedAt?: string | null
}

type ParentTimelineFeedback = {
  id: string
  createdAt: string
  teacherName?: string | null
  subject?: string | null
  summary?: string | null
}

type ParentTimelineNotification = {
  id: string
  createdAt: string
  title?: string | null
  content?: string | null
  relatedType?: string | null
  href?: string | null
}

function timeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',    minute: '2-digit',
    hour12: false,
  })
}

/** 班型标识（GROUP/ONE_ON_ONE/SMALL_GROUP）不是学科，不得展示给家长 */
const FEEDBACK_COURSE_TYPE_MARKERS = new Set(['GROUP', 'ONE_ON_ONE', 'SMALL_GROUP'])

/** 反馈通知标题：老师 学科 · 课堂反馈请点击查看（班型标识不是学科，不得展示给家长） */
export function feedbackTimelineTitle(feedback: { subject?: string | null; teacherName?: string | null }) {
  const subject = feedback.subject?.trim()
  const teacher = feedback.teacherName?.trim()
  const subjectLabel = subject && !FEEDBACK_COURSE_TYPE_MARKERS.has(subject) ? subject : ''
  const teacherLabel = teacher ? (teacher.endsWith('老师') ? teacher : `${teacher}老师`) : ''
  const tail = '课堂反馈请点击查看'
  if (teacherLabel && subjectLabel) return `${teacherLabel} ${subjectLabel} · ${tail}`
  if (subjectLabel) return `${subjectLabel} · ${tail}`
  if (teacherLabel) return `${teacherLabel} · ${tail}`
  return tail
}

export function buildParentTodayTimeline(input: {
  lessons: ParentTimelineLesson[]
  feedbacks: ParentTimelineFeedback[]
  notifications: ParentTimelineNotification[]
  now?: Date
}): ParentTimelineEvent[] {
  const now = input.now ?? new Date()
  const todayKey = now.toLocaleDateString('sv-SE')
  const events: ParentTimelineEvent[] = []

  for (const lesson of input.lessons) {
    const timestamp = lesson.startTimeRaw || `${todayKey}T${lesson.startTime || '00:00'}:00`
    events.push({
      id: `lesson-${lesson.id}`,
      type: 'lesson',
      timestamp,
      timeLabel: lesson.startTime || timeLabel(timestamp),
      title: lesson.title,
      detail: [
        lesson.teacherName ? `${lesson.teacherName}老师` : '',
        lesson.roomName || '',
      ].filter(Boolean).join(' · ') || '课程安排',
      status: lesson.attendanceSubmittedAt ? '已完成' : '今日课程',
      href: '/parent/schedule',
    })
  }

  for (const feedback of input.feedbacks) {
    events.push({
      id: `feedback-${feedback.id}`,
      type: 'feedback',
      timestamp: feedback.createdAt,
      timeLabel: timeLabel(feedback.createdAt),
      title: feedbackTimelineTitle(feedback),
      detail: '',
      status: '新反馈',
      href: `/parent/class-feedback/${feedback.id}`,
    })
  }

  for (const notification of input.notifications) {
    const createdAt = new Date(notification.createdAt)
    if (createdAt.toLocaleDateString('sv-SE') !== todayKey) continue
    if (!['PARENT_MESSAGE', 'PARENT_MESSAGE_REPLY'].includes(notification.relatedType || '')) continue
    events.push({
      id: `message-${notification.id}`,
      type: 'message',
      timestamp: notification.createdAt,
      timeLabel: timeLabel(notification.createdAt),
      title: notification.title || '家校沟通有新消息',
      detail: notification.content || '点击查看最新回复',
      status: '新消息',
      href: notification.href || '/parent/messages',
    })
  }

  return events.sort((a, b) => (
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  ))
}

export interface AdminExceptionMetrics {
  pendingTeacherReplies: number
  pendingParentReads: number
  todayLessonsPendingAttendance: number
  renewalWarnings: number
  pendingMakeups: number
  pendingIntensiveAppointments?: number
  pendingIntensiveReviews: number
  unpublishedPapers: number
}

export type AdminExceptionItem = {
  key: string
  label: string
  description: string
  count: number
  priority: 'urgent' | 'attention' | 'info'
  href: string
}

export function buildAdminExceptions(
  metrics: AdminExceptionMetrics,
): AdminExceptionItem[] {
  const items: AdminExceptionItem[] = [
    {
      key: 'teacher-replies',
      label: '待教师回复家长',
      description: '家长已留言，等待对应教师跟进',
      count: metrics.pendingTeacherReplies,
      priority: 'urgent',
      href: '/parent-messages?filter=PENDING_TEACHER',
    },
    {
      key: 'intensive-appointments',
      label: '教师新约个性化课程',
      description: '教师已完成约课，等待上课并提交考勤',
      count: metrics.pendingIntensiveAppointments || 0,
      priority: 'attention',
      href: '/schedule/intensive?section=appointments',
    },
    {
      key: 'intensive-reviews',
      label: '待审核个性化课次',
      description: '教师已提交考勤，等待核对授课时间和结算',
      count: metrics.pendingIntensiveReviews,
      priority: 'urgent',
      href: '/schedule/intensive?review=pending',
    },
    {
      key: 'attendance',
      label: '今日待提交考勤',
      description: '课程已结束，但考勤尚未确认',
      count: metrics.todayLessonsPendingAttendance,
      priority: 'urgent',
      href: '/attendance',
    },
    {
      key: 'renewal',
      label: '课时不足学员',
      description: '剩余课时较低，建议及时联系家长',
      count: metrics.renewalWarnings,
      priority: 'attention',
      href: '/students?filter=lowHours',
    },
    {
      key: 'makeups',
      label: '待安排个性化补课',
      description: '个性化课程请假或缺勤后生成，等待重新安排',
      count: metrics.pendingMakeups,
      priority: 'attention',
      href: '/attendance',
    },
    {
      key: 'papers',
      label: '未推送试卷',
      description: '已创建但尚未发布给家长',
      count: metrics.unpublishedPapers,
      priority: 'info',
      href: '/grades',
    },
    {
      key: 'parent-reads',
      label: '家长待查看回复',
      description: '教师或管理端回复尚未被家长查看',
      count: metrics.pendingParentReads,
      priority: 'info',
      href: '/parent-messages?filter=PENDING_PARENT',
    },
  ]
  return items.filter((item) => item.count > 0)
}
