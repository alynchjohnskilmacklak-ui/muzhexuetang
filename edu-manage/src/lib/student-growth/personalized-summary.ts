export type PersonalizedLearningSummary = {
  overview: string
  strengths: string[]
  focusAreas: string[]
  nextSteps: string[]
}

export type PersonalizedLearningEvidence = {
  grade: string
  feedbackCount: number
  assessmentCount: number
  attendanceRate: number | null
  subjects: string[]
  courseTopics: Array<{ label: string; count: number }>
  mastery: { total: number; mastered: number; needsReview: number; needsPractice: number }
  topics: Array<{
    subject: string
    topic: string
    total: number
    mastered: number
    needsReview: number
    needsPractice: number
  }>
  teacherMastery: Array<{ label: string; count: number }>
  observations: Array<{ label: string; count: number }>
  feedbackSamples: Array<{
    subject: string
    lesson: string
    teacherFeedback: string
    topics: string[]
    mastery: string
    homework: string[]
  }>
}

const reportDisclosureOrUnsupported = /\bAI\b|人工智能|大模型|模型生成|证据不足|数据不足|资料不足|样本不足|记录不足|暂无记录|暂无数据|没有记录|暂无明显|未见明显|尚未发现|无法判断|难以判断|没有明显/i

export function parsePersonalizedLearningSummary(value: string): PersonalizedLearningSummary | null {
  const content = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const data = parsed as Record<string, unknown>
  const cleanText = (input: unknown, limit: number) => {
    if (typeof input !== 'string') return ''
    const text = input.replace(/\s+/g, ' ').trim()
    if (!text || reportDisclosureOrUnsupported.test(text) || /\d/.test(text)) return ''
    return text.slice(0, limit)
  }
  const cleanList = (input: unknown) => Array.isArray(input)
    ? [...new Set(input.map((item) => cleanText(item, 100)).filter(Boolean))].slice(0, 4)
    : []
  const overview = cleanText(data.overview, 320)
  if (!overview) return null
  return {
    overview,
    strengths: cleanList(data.strengths),
    focusAreas: cleanList(data.focusAreas),
    nextSteps: cleanList(data.nextSteps),
  }
}

export function buildPersonalizedLearningSummaryFallback(
  evidence: PersonalizedLearningEvidence,
): PersonalizedLearningSummary {
  const subjects = evidence.subjects.slice(0, 3)
  const subjectPhrase = subjects.length ? `，覆盖${subjects.join('、')}等学科` : ''
  const masteryPhrase = evidence.mastery.total
    ? `试卷批改题目中，${evidence.mastery.mastered}题标记为已掌握，${evidence.mastery.needsReview}题建议复习，${evidence.mastery.needsPractice}题需要练习。`
    : ''
  const overview = evidence.feedbackCount || evidence.assessmentCount
    ? `本阶段围绕${evidence.grade}学习安排${subjectPhrase}，已整理${evidence.feedbackCount}条课堂反馈和${evidence.assessmentCount}份测评记录。${masteryPhrase}`
    : `结合${evidence.grade}阶段的学习节奏，建议把课堂回顾、知识点整理和错题订正连成固定的学习习惯。`

  const strengths = evidence.topics
    .filter((topic) => topic.mastered > 0)
    .sort((a, b) => b.mastered - a.mastered || a.topic.localeCompare(b.topic, 'zh-CN'))
    .slice(0, 3)
    .map((topic) => `${topic.subject}「${topic.topic}」的批改题目中，有${topic.mastered}题标记为已掌握。`)

  if (strengths.length < 3) {
    const teacherStrengths = evidence.teacherMastery
      .filter((item) => /掌握扎实|基本掌握/.test(item.label))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3 - strengths.length)
      .map((item) => `课堂反馈中记录了${item.count}次“${item.label}”，建议通过不同题型练习巩固并迁移运用。`)
    strengths.push(...teacherStrengths)
  }

  const focusAreas = evidence.topics
    .filter((topic) => topic.needsPractice > 0 || topic.needsReview > 0)
    .sort((a, b) => (b.needsPractice + b.needsReview) - (a.needsPractice + a.needsReview))
    .slice(0, 3)
    .map((topic) => `${topic.subject}「${topic.topic}」有${topic.needsPractice ? `${topic.needsPractice}题需要练习` : ''}${topic.needsPractice && topic.needsReview ? '，' : ''}${topic.needsReview ? `${topic.needsReview}题建议复习` : ''}。`)

  if (!focusAreas.length) {
    const teacherFocus = evidence.teacherMastery.find((item) => /需|待|不熟|加强|巩固|练习|部分掌握/.test(item.label))
    if (teacherFocus) focusAreas.push(`近期课堂掌握情况记录中出现“${teacherFocus.label}”，可结合对应课程内容安排针对性复习。`)
  }

  const focusTopic = evidence.topics.find((topic) => topic.needsPractice > 0 || topic.needsReview > 0)
  const nextSteps = focusTopic
    ? [`围绕${focusTopic.subject}「${focusTopic.topic}」安排短时练习，完成后复述解题步骤并整理错因。`, '每周回看课堂反馈中的知识点和作业要求，及时完成订正。']
    : subjects.length
      ? [`课后把${subjects.slice(0, 2).join('、')}本阶段知识点整理成清单，再用练习检验理解。`, '每周安排一次错题回顾，把易错方法写成自己的解题步骤。']
      : ['课后用“回忆知识点—完成练习—订正错题”的顺序复盘当天所学。', '把阶段目标拆成每周的小任务，完成后及时回顾和调整。']

  return { overview, strengths, focusAreas, nextSteps }
}
