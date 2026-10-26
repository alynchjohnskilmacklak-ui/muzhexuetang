export type KnowledgeTopicMismatch = {
  lessonTopic: string
  generatedTopic: string
}

const GROUP_NARRATIVE = /孩子们|同学们|学生们|有同学|也有同学|还有同学|部分(?:孩子|同学|学生)|有些(?:孩子|同学|学生)|大多数(?:孩子|同学|学生)|个别(?:孩子|同学|学生)|其他(?:孩子|同学|学生)|有的(?:孩子|同学|学生)|也有的(?:孩子|同学|学生)|还有的(?:孩子|同学|学生)|全班|大家|本班|班里|课堂整体|整体情况|整体来看|从整体|总体来看/

function normalizeTopic(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '')
}

/** Drops whole class-level sentences instead of rewriting collective observations as individual facts. */
export function isGroupNarrativeSentence(sentence: string) {
  return GROUP_NARRATIVE.test(sentence)
}

/**
 * Warn only when the lesson text names one unambiguous catalogue topic and the generated topic
 * belongs to a different concept. Parent/child catalogue labels are treated as the same topic family.
 */
export function findKnowledgeTopicMismatch(
  lessonText: string,
  generatedTopic: string,
  knownTopics: string[],
): KnowledgeTopicMismatch | null {
  if (!lessonText.trim() || !generatedTopic.trim() || !knownTopics.length) return null

  const normalizedText = normalizeTopic(lessonText)
  const mentioned = knownTopics
    .map((topic) => topic.trim())
    .filter((topic) => topic.length >= 2 && normalizedText.includes(normalizeTopic(topic)))
  const mostSpecific = mentioned.filter((topic) => {
    const normalized = normalizeTopic(topic)
    return !mentioned.some((other) => {
      const normalizedOther = normalizeTopic(other)
      return normalizedOther.length > normalized.length && normalizedOther.includes(normalized)
    })
  })
  const unique = [...new Map(mostSpecific.map((topic) => [normalizeTopic(topic), topic])).values()]
  if (unique.length !== 1) return null

  const lessonTopic = unique[0]
  const normalizedLessonTopic = normalizeTopic(lessonTopic)
  const normalizedGeneratedTopic = normalizeTopic(generatedTopic)
  if (
    normalizedGeneratedTopic === normalizedLessonTopic
    || normalizedGeneratedTopic.includes(normalizedLessonTopic)
    || normalizedLessonTopic.includes(normalizedGeneratedTopic)
  ) return null

  return { lessonTopic, generatedTopic: generatedTopic.trim() }
}
