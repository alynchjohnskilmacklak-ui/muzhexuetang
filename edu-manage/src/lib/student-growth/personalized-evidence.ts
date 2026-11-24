import type { PersonalizedLearningEvidence } from './personalized-summary'

type PersonalizedEvidenceProfile = {
  identity: { name: string; grade: string | null }
  overview: { paperCount: number; attendanceRate: number | null }
  study: {
    mastery: {
      total: number
      masteredCount: number
      needsReviewCount: number
      needsPracticeCount: number
      topics: Array<{
        subject: string
        topic: string
        total: number
        mastered: number
        needsReview: number
        needsPractice: number
      }>
    }
  }
  record: {
    reportFeedbacks: Array<{
      type: string
      teacherSubject?: string
      sub?: string
      detail?: {
        lessonContent?: string
        comment?: string
        summary?: string
        knowledgePoints?: string[]
        studentMastery?: string
        homework?: string[]
        tags?: string[]
      }
    }>
  }
}

function cleanForSummary(value: unknown, studentName: string) {
  if (typeof value !== 'string') return ''
  let text = value.trim()
  if (studentName) text = text.split(studentName).join('学生')
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[联系方式]')
    .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, '[联系方式]')
    .replace(/\b(?:student|parent|teacher)[-_ ]?id\s*[:：]?\s*[A-Za-z0-9_-]+\b/gi, '[编号]')
    .slice(0, 500)
}

export function buildPersonalizedLearningEvidence(
  profile: PersonalizedEvidenceProfile,
): PersonalizedLearningEvidence {
  const feedbacks = profile.record.reportFeedbacks.filter((item) => item.type === 'feedback')
  const name = profile.identity.name
  const topics = profile.study.mastery.topics
    .map((topic) => ({
      ...topic,
      subject: cleanForSummary(topic.subject, name),
      topic: cleanForSummary(topic.topic, name),
    }))
    .filter((topic) => topic.subject && topic.topic)
  const topicNames = new Map<string, number>()
  const teacherMasteryCounts = new Map<string, number>()
  const observations: Array<{ label: string; count: number }> = []
  const signals = new Map<string, number>()
  const subjects = new Set<string>()

  for (const topic of topics) subjects.add(topic.subject)
  for (const item of feedbacks) {
    const subject = cleanForSummary(item.teacherSubject, name)
    if (subject) subjects.add(subject)
    for (const topic of item.detail?.knowledgePoints || []) {
      const label = cleanForSummary(topic, name)
      if (label) topicNames.set(label, (topicNames.get(label) || 0) + 1)
    }
    for (const label of (item.detail?.studentMastery || '').split(/[、,，/]/).map((part) => cleanForSummary(part, name)).filter(Boolean)) {
      teacherMasteryCounts.set(label, (teacherMasteryCounts.get(label) || 0) + 1)
    }

    const text = cleanForSummary([
      item.detail?.lessonContent,
      item.detail?.comment,
      item.detail?.summary,
      ...(item.detail?.tags || []),
    ].filter(Boolean).join('\n'), name)
    const signalWords = ['专注', '认真', '积极', '主动', '完成较好', '理解较快', '掌握较好', '进步', '需复习', '需要加强', '薄弱', '不熟练', '易错']
    for (const word of signalWords) {
      const count = text.split(word).length - 1
      if (count) signals.set(word, (signals.get(word) || 0) + count)
    }
  }

  const observationLabels = new Map<string, string[]>([
    ['课堂投入', ['专注', '认真', '积极', '主动']],
    ['学习进展', ['完成较好', '理解较快', '掌握较好', '进步']],
    ['巩固提醒', ['需复习', '需要加强', '薄弱', '不熟练', '易错']],
  ])
  for (const [label, words] of observationLabels) {
    const count = words.reduce((total, word) => total + (signals.get(word) || 0), 0)
    if (count) observations.push({ label, count })
  }

  const selectedFeedbacks = feedbacks.length <= 36
    ? feedbacks
    : [...feedbacks.slice(0, 8), ...feedbacks.slice(-28)]
  const feedbackSamples = selectedFeedbacks.map((item) => ({
    subject: cleanForSummary(item.teacherSubject || '课堂学习', name),
    lesson: cleanForSummary(item.detail?.lessonContent, name),
    teacherFeedback: cleanForSummary(item.detail?.comment || item.detail?.summary || item.sub, name),
    topics: (item.detail?.knowledgePoints || []).map((topic) => cleanForSummary(topic, name)).filter(Boolean).slice(0, 8),
    mastery: cleanForSummary(item.detail?.studentMastery, name),
    homework: (item.detail?.homework || []).map((task) => cleanForSummary(task, name)).filter(Boolean).slice(0, 5),
  }))

  const mastery = profile.study.mastery
  return {
    grade: cleanForSummary(profile.identity.grade || '当前年级', name),
    feedbackCount: feedbacks.length,
    assessmentCount: profile.overview.paperCount,
    attendanceRate: profile.overview.attendanceRate,
    subjects: [...subjects].filter(Boolean).slice(0, 8),
    courseTopics: [...topicNames.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 24),
    mastery: {
      total: mastery.total,
      mastered: mastery.masteredCount,
      needsReview: mastery.needsReviewCount,
      needsPractice: mastery.needsPracticeCount,
    },
    topics,
    teacherMastery: [...teacherMasteryCounts.entries()].map(([label, count]) => ({ label, count })),
    observations,
    feedbackSamples,
  }
}
