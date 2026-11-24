export const TEACHER_SUPPORT_TAGS = [
  '追问检查理解',
  '分步提示引导',
  '单独讲解难点',
  '例题拆解示范',
  '错题当堂订正',
  '变式练习巩固',
  '口头复述梳理',
  '鼓励表达思路',
] as const

export const STUDENT_TAG_CATEGORIES = [
  { label: '常用', tags: ['专注听讲', '积极发言', '练习完成', '本节有进步', '思路清晰', '主动提问'] },
  { label: '知识掌握', tags: ['概念理解准确', '方法运用到位', '步骤表达完整', '基础掌握扎实', '能举一反三', '知识点需巩固'] },
  { label: '学习习惯', tags: ['审题认真', '书写认真', '计算细致', '主动检查', '订正认真', '独立完成'] },
  { label: '后续关注', tags: ['容易遗漏步骤', '审题还需细致', '计算后再检查', '需要更多思考时间', '表达思路可加强', '易走神', '粗心出错', '需多鼓励'] },
  { label: '课堂辅导', tags: TEACHER_SUPPORT_TAGS },
] as const

export const STUDENT_STATE_TAGS = STUDENT_TAG_CATEGORIES.flatMap(category => category.tags)

export function getMissingStudentTagCategories(selectedTags: readonly string[]) {
  const selected = new Set(selectedTags)
  return STUDENT_TAG_CATEGORIES
    .filter(category => !category.tags.some(tag => selected.has(tag)))
    .map(category => category.label)
}

export function getMissingStudentRatingTagCategories(studentRatings: unknown, studentIds: readonly string[]) {
  const rows = Array.isArray(studentRatings) ? studentRatings : null
  const ratingsByStudent = studentRatings && typeof studentRatings === 'object' && !rows
    ? studentRatings as Record<string, unknown>
    : null
  const directRatingStudentId = typeof ratingsByStudent?.studentId === 'string' ? ratingsByStudent.studentId : null

  return studentIds.flatMap(studentId => {
    const row = rows
      ? rows.find(item => item && typeof item === 'object' && (item as Record<string, unknown>).studentId === studentId)
      : directRatingStudentId
        ? directRatingStudentId === studentId ? ratingsByStudent : undefined
        : ratingsByStudent?.[studentId]
    const rawTags = row && typeof row === 'object' ? (row as Record<string, unknown>).tags : null
    const tags = Array.isArray(rawTags)
      ? rawTags.filter((tag): tag is string => typeof tag === 'string')
      : []
    const missing = getMissingStudentTagCategories(tags)
    return missing.length ? [{ studentId, missing }] : []
  })
}
