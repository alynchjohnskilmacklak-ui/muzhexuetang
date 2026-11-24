export const KNOWLEDGE_MASTERY_LEVELS = [
  { value: '需巩固', rank: 1, label: '需巩固' },
  { value: '部分掌握', rank: 2, label: '部分掌握' },
  { value: '基本掌握', rank: 3, label: '基本掌握' },
  { value: '掌握扎实', rank: 4, label: '掌握扎实' },
] as const

export type KnowledgeMasteryLevel = typeof KNOWLEDGE_MASTERY_LEVELS[number]['value']

export type KnowledgeProgressEntry = {
  feedbackId: string
  date: string
  topic: string
  masteryLevel: KnowledgeMasteryLevel
}

export type KnowledgeTopicTrend = {
  topic: string
  latestLevel: KnowledgeMasteryLevel
  latestDate: string
  trend: 'improving' | 'steady' | 'needs_review' | 'recording'
  trendLabel: string
  recordCount: number
  points: KnowledgeProgressEntry[]
}

export function normalizeKnowledgeMasteryLevel(value: unknown): KnowledgeMasteryLevel | null {
  return KNOWLEDGE_MASTERY_LEVELS.find((level) => level.value === value)?.value ?? null
}

export function buildKnowledgeTopicTrends(entries: KnowledgeProgressEntry[]): KnowledgeTopicTrend[] {
  const byTopic = new Map<string, KnowledgeProgressEntry[]>()
  for (const entry of entries) {
    const topic = entry.topic.trim()
    const masteryLevel = normalizeKnowledgeMasteryLevel(entry.masteryLevel)
    if (!topic || !masteryLevel) continue
    const key = topic.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('zh-CN')
    const history = byTopic.get(key) || []
    history.push({ ...entry, topic, masteryLevel })
    byTopic.set(key, history)
  }

  const rankByLevel = new Map(KNOWLEDGE_MASTERY_LEVELS.map((level) => [level.value, level.rank]))
  return [...byTopic.values()]
    .map((history) => {
      const ordered = history.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
      const latest = ordered[ordered.length - 1]
      const previous = ordered[ordered.length - 2]
      const rankDelta = previous
        ? (rankByLevel.get(latest.masteryLevel) || 0) - (rankByLevel.get(previous.masteryLevel) || 0)
        : 0
      const trend: KnowledgeTopicTrend['trend'] = !previous
        ? 'recording'
        : rankDelta > 0
          ? 'improving'
          : rankDelta < 0
            ? 'needs_review'
            : 'steady'
      const trendLabel = trend === 'improving'
        ? '较上次有所提升'
        : trend === 'steady'
          ? '与上次保持稳定'
          : trend === 'needs_review'
            ? '本次建议继续巩固'
            : '正在建立连续记录'
      return {
        topic: latest.topic,
        latestLevel: latest.masteryLevel,
        latestDate: latest.date,
        trend,
        trendLabel,
        recordCount: ordered.length,
        points: ordered.slice(-4),
      }
    })
    .sort((a, b) => Date.parse(b.latestDate) - Date.parse(a.latestDate))
    .slice(0, 4)
}
