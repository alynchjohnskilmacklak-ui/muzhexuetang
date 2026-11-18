/**
 * 通知周报纯逻辑（无 DB 依赖，便于单测）：
 * - 上周周界计算（本地时区 周一 00:00 → 本周一 00:00）
 * - 周报正文拼装
 */

export function localWeekRange(now: Date): { weekKey: string; start: Date; end: Date } {
  // 上周一 00:00（本地时区）→ 本周一 00:00（本地时区）
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - 7, 0, 0, 0, 0)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 0, 0, 0, 0)
  const weekKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  return { weekKey, start, end }
}

const TYPE_LABELS: Record<string, string> = {
  CLASSROOM_FEEDBACK: '课堂反馈',
  PERFORMANCE_FEEDBACK: '成长反馈',
  PERFORMANCE_UPDATE: '表现更新',
  ATTENDANCE: '考勤',
  leave: '请假',
  STUDY_HALL_HOMEWORK: '作业班',
  PAPER_PUBLISHED: '试卷',
  EXAM_PAPER: '试卷',
  COURSE_CHANGE_EVENT: '课表变动',
  SCHEDULE_CHANGE: '课表变动',
}

export function buildDigestContent(start: Date, end: Date, counts: Array<{ relatedType: string | null; count: number }>): string | null {
  const parts = counts
    .map((row) => ({ label: TYPE_LABELS[row.relatedType || ''] || '其他', count: row.count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
  if (parts.length === 0) return null
  const total = parts.reduce((sum, item) => sum + item.count, 0)
  return `上周（${start.getMonth() + 1}月${start.getDate()}日-${end.getMonth() + 1}月${end.getDate()}日）共收到 ${total} 条动态：${parts.map((p) => `${p.label}${p.count}`).join('、')}。点击查看详情。`
}
