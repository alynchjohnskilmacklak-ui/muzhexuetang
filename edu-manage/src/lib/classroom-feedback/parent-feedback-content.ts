import type { FeedbackArchiveItem } from './archive'

export type ParentFeedbackSection = {
  label: string
  content: string
}

export function feedbackValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const entries = value.map(feedbackValue).filter((entry): entry is string => Boolean(entry))
    return entries.length ? entries.join('、') : null
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return feedbackValue(record.content ?? record.text ?? record.title ?? record.name)
  }
  return String(value).trim() || null
}

function extractStructuredSections(item: FeedbackArchiveItem) {
  const source = [item.overallComment, item.summary].filter(Boolean).join('\n')
  const labels = ['课堂表现', '知识掌握', '存在问题', '后续建议'] as const
  const found = new Map<string, string>()

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index]
    const nextLabels = labels.slice(index + 1).join('|')
    const pattern = new RegExp(
      `${label}[：:]?\\s*([\\s\\S]*?)${nextLabels ? `(?=(?:${nextLabels})[：:]?|$)` : '$'}`,
    )
    const match = source.match(pattern)
    if (match?.[1]?.trim()) found.set(label, match[1].trim())
  }
  return found
}

function addSection(sections: ParentFeedbackSection[], label: string, value: unknown) {
  const content = feedbackValue(value)
  if (content) sections.push({ label, content })
}

export function parentRatingLabel(value: unknown) {
  const rating = feedbackValue(value)
  if (!rating) return null
  return ({ GREAT: '积极', OKAY: '一般', NEEDS_IMPROVEMENT: '需提升' } as Record<string, string>)[rating]
    ?? rating
}

export function getParentFeedbackSections(item: FeedbackArchiveItem) {
  const structured = extractStructuredSections(item)
  const sections: ParentFeedbackSection[] = []

  addSection(sections, '本节课学习内容', item.lessonContent)

  if (structured.size) {
    addSection(sections, '课堂表现', structured.get('课堂表现'))
    addSection(sections, '孩子掌握情况', structured.get('知识掌握'))
    addSection(sections, '存在问题', structured.get('存在问题'))
    addSection(sections, '后续建议', structured.get('后续建议'))
  } else {
    addSection(sections, '课堂反馈', item.overallComment)
    if (feedbackValue(item.summary) !== feedbackValue(item.overallComment)) {
      addSection(sections, '孩子掌握情况', item.summary)
    }
  }

  if (!structured.get('知识掌握')) addSection(sections, '知识点', item.knowledgePoints)
  if (!structured.get('后续建议')) addSection(sections, '课后安排', item.homework)
  addSection(sections, '课堂标签', item.tags)
  if (!structured.get('知识掌握') && !feedbackValue(item.summary)) {
    addSection(sections, '孩子掌握情况', parentRatingLabel(item.studentRating))
  }
  return sections
}
