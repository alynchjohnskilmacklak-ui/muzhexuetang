const JUNIOR_EDITIONS: Record<string, string> = {
  数学: '冀教版', 语文: '人教版', 英语: '人教版', 生物: '冀少版',
  物理: '人教版', 化学: '人教版', 政治: '人教版', 道德与法治: '人教版',
  历史: '人教版', 地理: '人教版',
}

const SENIOR_SUBJECTS = new Set([
  '数学', '语文', '英语', '物理', '化学', '生物', '政治', '思想政治', '历史', '地理',
])

export function normalizeTextbookGrade(value: string | null | undefined) {
  const grade = (value || '').trim()
  const aliases: Record<string, string> = {
    七年级: '初一', 八年级: '初二', 九年级: '初三',
    高中一年级: '高一', 高中二年级: '高二', 高中三年级: '高三',
  }
  if (aliases[grade]) return aliases[grade]
  for (const [label, normalized] of Object.entries({
    初一: '初一', 七年级: '初一', 初二: '初二', 八年级: '初二', 初三: '初三', 九年级: '初三',
    高一: '高一', 高二: '高二', 高三: '高三',
  })) {
    if (grade.startsWith(label)) return normalized
  }
  return grade
}

export function textbookEdition(gradeValue: string | null | undefined, subjectValue: string | null | undefined) {
  const grade = normalizeTextbookGrade(gradeValue)
  const subject = (subjectValue || '').trim()
  if (['初一', '初二', '初三'].includes(grade)) return JUNIOR_EDITIONS[subject] || null
  if (['高一', '高二', '高三'].includes(grade) && SENIOR_SUBJECTS.has(subject)) return '人教版'
  return null
}
