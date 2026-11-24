// 通知类型 → 家长端展示名（未读分组统计与筛选共用）
export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  CLASSROOM_FEEDBACK: '课堂反馈',
  FEEDBACK_REVIEW: '家长教学评价',
  PERFORMANCE_FEEDBACK: '成长反馈',
  PERFORMANCE_UPDATE: '表现更新',
  ATTENDANCE: '考勤',
  leave: '请假',
  STUDY_HALL_HOMEWORK: '作业班',
  PAPER_PUBLISHED: '试卷',
  EXAM_PAPER: '试卷',
  COURSE_CHANGE_EVENT: '课表',
  SCHEDULE_CHANGE: '课表',
  SYSTEM: '系统',
  INFO: '通知',
}

// 将未读按类型分组的记录整理成「名称 计数」的有序摘要（最多 topN 类 + 汇总）
export function summarizeUnreadByType(
  notificationsByType: Record<string, number> | undefined,
  topN = 3,
): { parts: string[]; total: number } {
  if (!notificationsByType || Object.keys(notificationsByType).length === 0) {
    return { parts: [], total: 0 }
  }
  const entries = Object.entries(notificationsByType)
    .map(([key, count]) => ({
      key,
      label: NOTIFICATION_TYPE_LABEL[key] || '其他',
      count,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)

  const parts = entries.slice(0, topN).map((item) => `${item.label}${item.count}`)
  const others = entries.slice(topN).reduce((sum, item) => sum + item.count, 0)
  if (others > 0) parts.push(`其他${others}`)

  return { parts, total: entries.reduce((sum, item) => sum + item.count, 0) }
}
