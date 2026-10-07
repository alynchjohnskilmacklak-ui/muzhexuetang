const fallbackLabel = <T extends Record<string, string>>(labels: T, value: string) => (
  labels[value] ?? value
)

export const STUDENT_STATUS_LABELS = {
  LEAD: '潜客咨询',
  TRIAL: '预约试听',
  ACTIVE: '报名缴费',
  INACTIVE: '暂停',
  GRADUATED: '毕业/离校',
} as const

export const PAPER_MASTERY_LABELS = {
  MASTERED: '已掌握',
  NEEDS_REVIEW: '待复习',
  NEEDS_PRACTICE: '需练习',
} as const

export const GUIDE_ACTION_LABELS = {
  VIEW_GUIDE: '查看指南',
  VIEW_STEPS: '浏览步骤',
  DOWNLOAD: '下载文件',
  SEARCH_SCHOOL: '搜学校',
  VIEW_QUOTA: '查名额',
} as const

export function getStudentStatusLabel(status: string) {
  return fallbackLabel(STUDENT_STATUS_LABELS, status)
}

export function getPaperMasteryLabel(mastery: string) {
  return fallbackLabel(PAPER_MASTERY_LABELS, mastery)
}

export function getGuideActionLabel(action: string) {
  return fallbackLabel(GUIDE_ACTION_LABELS, action)
}
