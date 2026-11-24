import { articleSections } from './ai-article'

export type ParentFeedbackSection = {
  label: string
  content: string
}

export type ParentFeedbackContentInput = {
  lessonContent?: unknown
  overallComment?: unknown
  summary?: unknown
  knowledgePoints?: unknown
  homework?: unknown
  tags?: unknown
  studentRating?: unknown
  studentName?: unknown
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

/** The first paragraph is the general lesson evaluation shown to families and on share posters. */
export function getOverallEvaluationContent(value: unknown): string {
  return (feedbackValue(value) || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .find(Boolean) || ''
}

function extractStructuredSections(item: ParentFeedbackContentInput) {
  const overallComment = feedbackValue(item.overallComment) || ''
  const article = articleSections(overallComment)
  if (article) return new Map<string, string>([
    ['本节课学习内容', article[0]], ['课堂反馈', article[1]], ['孩子掌握情况', article[2]],
  ])
  const articleLabels = [...overallComment.matchAll(/(?:^|\n)(本节课学习内容|课堂反馈|孩子掌握情况)[：:]\s*/g)]
  if (articleLabels.length) {
    const found = new Map<string, string>()
    articleLabels.forEach((match, index) => {
      const start = (match.index ?? 0) + match[0].length
      const end = articleLabels[index + 1]?.index ?? overallComment.length
      const content = overallComment.slice(start, end).trim()
      if (content) found.set(match[1], content)
    })
    return found
  }
  const source = [overallComment, feedbackValue(item.summary)].filter(Boolean).join('\n')
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

function removeDuplicatedOpeningObservation(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n').trim()
  // Older drafts sometimes put the teacher's short observation before the AI article,
  // separated by a comma or newline. Only remove it when the article later repeats
  // the same observation in expanded wording.
  const openingMatch = normalized.match(/^([^，,。！？；;\n]{1,48})[，,。！？；;\n]+([\s\S]*)$/)
  const opening = openingMatch?.[1]?.trim() || ''
  const remaining = openingMatch?.[2]?.trim() || ''
  if (!opening || remaining.length < 150) return normalized
  if (!/(同学|学生|孩子|该生|上课|课堂|听讲|听课|发言|回答|专注|认真|积极|粗心|练习|配合|注意力)/.test(opening)) return normalized

  const observation = opening
    .replace(/^(?:S\d+|[一-龥·]{1,10})同学/, '')
    .replace(/^(?:孩子|该生|学生)/, '')
    .replace(/^[，,：:\s]+|[，,。！？；;：:\s]+$/g, '')
  const repeatedInAiDraft = [
    { source: /(?:认真听讲|听讲认真|认真听课|专心听讲|上课认真听讲)/, expanded: /(?:听得很专注|听讲专注|专心听讲|全程跟着老师.{0,10}讲解|跟随老师.{0,10}讲解)/ },
    { source: /(?:积极发言|主动发言|积极回答|主动回答)/, expanded: /(?:主动回答|积极参与|积极发言|回答问题|发言比较积极)/ },
    { source: /(?:注意力集中|课堂专注|听课专注|上课专注)/, expanded: /(?:注意力.{0,6}集中|听得很专注|专注听讲|全程跟着老师)/ },
    { source: /(?:计算粗心|计算时粗心|运算粗心)/, expanded: /(?:计算.{0,10}(?:粗心|容易出错|容易算错)|运算.{0,8}(?:粗心|易错))/ },
    { source: /(?:练习完成|按要求完成课堂练习|课堂练习完成)/, expanded: /(?:课堂练习|练习任务).{0,12}(?:完成|按要求)/ },
  ].some(({ source, expanded }) => source.test(observation) && expanded.test(remaining))

  return repeatedInAiDraft ? remaining : normalized
}

export function parentRatingLabel(value: unknown) {
  const rating = feedbackValue(value)
  if (!rating) return null
  return ({ GREAT: '积极', OKAY: '一般', NEEDS_IMPROVEMENT: '需提升' } as Record<string, string>)[rating]
    ?? rating
}

export function getParentFeedbackSections(item: ParentFeedbackContentInput) {
  const structured = extractStructuredSections(item)
  const sections: ParentFeedbackSection[] = []

  if (!structured.has('本节课学习内容')) addSection(sections, '本节课学习内容', item.lessonContent)

  if (structured.has('本节课学习内容')) {
    // Keep the AI article's three promised sections distinct so parents can scan it.
    addSection(sections, '本节课学习内容', structured.get('本节课学习内容'))
    addSection(sections, '课堂反馈', structured.get('课堂反馈'))
    addSection(sections, '孩子掌握情况', structured.get('孩子掌握情况'))
  } else if (structured.size) {
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

  if (!structured.get('知识掌握') && !structured.get('孩子掌握情况')) addSection(sections, '知识点', item.knowledgePoints)
  if (!structured.get('后续建议')) addSection(sections, '课后安排', item.homework)
  addSection(sections, '课堂标签', item.tags)
  if (!structured.get('知识掌握') && !structured.get('孩子掌握情况') && !feedbackValue(item.summary)) {
    addSection(sections, '孩子掌握情况', parentRatingLabel(item.studentRating))
  }
  return sections
}

/** Parent feedback keeps one complete classroom-feedback body; lesson/mastery fields stay internal. */
export function getParentFeedbackDisplaySections(item: ParentFeedbackContentInput) {
  const structured = extractStructuredSections(item)
  const generatedFeedback = structured.get('课堂反馈')
  const legacyFeedback = [
    structured.get('课堂表现'),
    structured.get('存在问题'),
    structured.get('后续建议'),
  ].filter(Boolean).join('\n\n')
  const plainFeedback = !structured.size ? feedbackValue(item.overallComment) : ''
  const content = generatedFeedback || legacyFeedback || plainFeedback
  if (!content) return []

  const studentName = feedbackValue(item.studentName)
  const normalizedContent = removeDuplicatedOpeningObservation(content)
    .replace(/(^|[\n。！？])\s*(?:(?:但是|不过)\s*)?(?:还是\s*)?课下多背背[，,。！？]?/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/S\d+(?:同学)?/g, studentName ? `${studentName}同学` : '孩子')
  return [{ label: '课堂反馈', content: normalizedContent }]
}

/** Returns only the teacher-facing feedback body, excluding the generated lesson and mastery sections. */
export function getParentClassroomFeedbackContent(value: unknown, studentName?: unknown) {
  const source = feedbackValue(value) || ''
  if (!source) return ''

  const structured = extractStructuredSections({ overallComment: source })
  const content = structured.get('课堂反馈') || [
    structured.get('课堂表现'),
    structured.get('存在问题'),
    structured.get('后续建议'),
  ].filter(Boolean).join('\n\n') || (!structured.size ? source : '')
  if (!content) return ''

  const name = feedbackValue(studentName)
  return removeDuplicatedOpeningObservation(content)
    .replace(/(^|[\n。！？])\s*(?:(?:但是|不过)\s*)?(?:还是\s*)?课下多背背[，,。！？]?/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/S\d+(?:同学)?/g, name ? `${name}同学` : '孩子')
}
