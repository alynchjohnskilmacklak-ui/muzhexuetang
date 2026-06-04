export const GRADE_SUBJECTS: Record<string, string[]> = {
  '初一': ['语文', '数学', '英语', '生物', '地理', '历史', '政治'],
  '初二': ['语文', '数学', '英语', '生物', '地理', '历史', '政治', '物理'],
  '初三': ['语文', '数学', '英语', '生物', '地理', '历史', '政治', '物理', '化学'],
}

export const GRADES = ['初一', '初二', '初三'] as const
export const ALL_SUBJECTS = ['语文', '数学', '英语', '生物', '地理', '历史', '政治', '物理', '化学'] as const

export const SUBJECT_COLORS: Record<string, string> = {
  '语文': '#E87545',
  '数学': '#E8784A',
  '英语': '#27a644',
  '物理': '#1890ff',
  '化学': '#722ed1',
  '生物': '#13c2c2',
  '地理': '#fa8c16',
  '历史': '#eb2f96',
  '政治': '#52c41a',
}
