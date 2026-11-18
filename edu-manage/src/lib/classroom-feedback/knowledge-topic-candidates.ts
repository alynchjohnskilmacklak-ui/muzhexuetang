import { getKnowledgePointOptions } from './subject-knowledge-points'

const GENERIC_KNOWLEDGE_LABELS = new Set([
  '作图', '作图与实验探究', '作图与实验探究探究', '分析简答题', '填空', '简答', '简答题',
  '简答与作图', '简答与实验探究', '常考题型', '探究与作图', '易错点辨析',
  '素养提升', '综合应用', '综合应用与实验探究', '综合应用题', '综合题', '考点考向',
  '选择', '错题强化', '题型', '题目', '内容', '主体',
])

function normalizeKnowledgePointText(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

function isKnowledgePointCandidate(value: string) {
  const topic = value.trim()
  if (topic.length < 2 || topic.length > 40 || GENERIC_KNOWLEDGE_LABELS.has(topic)) return false
  if (/[?？]/.test(topic)) return false
  if (/(?:你认为|作者|文中|课文中|这则|哪些方面|哪些内容|为什么|怎么|如何|请结合|示例|例题|第\d+题)/.test(topic)) return false
  return true
}

function longestSharedPhraseLength(left: string, right: string) {
  let previous = new Uint16Array(right.length + 1)
  let longest = 0
  for (let i = 1; i <= left.length; i += 1) {
    const current = new Uint16Array(right.length + 1)
    for (let j = 1; j <= right.length; j += 1) {
      if (left[i - 1] !== right[j - 1]) continue
      current[j] = previous[j - 1] + 1
      longest = Math.max(longest, current[j])
    }
    previous = current
  }
  return longest
}

/**
 * The imported directory contains exercise stems and generic question types as well as topics.
 * Only send items that overlap with the lesson note or teacher-selected textbook chapter,
 * instead of the first N rows in the catalog.
 */
export function selectRelevantKnowledgePointCandidates(
  candidates: string[],
  lessonNote: string,
  limit = 12,
) {
  const normalizedNote = normalizeKnowledgePointText(lessonNote)
  if (!normalizedNote) return []

  const ranked = candidates
    .filter(isKnowledgePointCandidate)
    .map((topic) => {
      const normalizedTopic = normalizeKnowledgePointText(topic)
      if (!normalizedTopic) return null
      const exact = normalizedNote.includes(normalizedTopic)
      const shared = exact ? normalizedTopic.length : longestSharedPhraseLength(normalizedNote, normalizedTopic)
      if (shared < 3) return null
      return { topic: topic.trim(), normalizedTopic, score: (exact ? 10_000 : 0) + shared * 100 + Math.min(normalizedTopic.length, 40) }
    })
    .filter((item): item is { topic: string; normalizedTopic: string; score: number } => item !== null)
    .sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic, 'zh-CN'))

  const selected: Array<{ topic: string; normalizedTopic: string }> = []
  for (const item of ranked) {
    if (selected.some((existing) => existing.normalizedTopic.includes(item.normalizedTopic))) continue
    selected.push(item)
    if (selected.length >= limit) break
  }
  return selected.map((item) => item.topic)
}

export function getRelevantKnowledgePointCandidates(
  subject: string,
  grade: string,
  lessonNote: string,
  additionalContext: string[] = [],
) {
  const matchingContext = [lessonNote, ...additionalContext].filter(Boolean).join('\n')
  return selectRelevantKnowledgePointCandidates(getKnowledgePointOptions(subject, grade), matchingContext)
}
