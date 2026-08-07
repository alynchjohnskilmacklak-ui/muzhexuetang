export type StructuredClassroomRecord = {
  lessonContent: string
  mastery: string
  feedback: string
}

type SectionKey = keyof StructuredClassroomRecord

const SECTION_ALIASES: Array<{ key: SectionKey; labels: string[] }> = [
  {
    key: 'lessonContent',
    labels: ['本节课学习内容', '本节学习内容', '本节授课内容', '授课内容', '学习内容', '课堂内容', '上课内容'],
  },
  {
    key: 'mastery',
    labels: ['自家孩子掌握情况', '孩子掌握情况', '学生掌握情况', '知识掌握', '掌握情况'],
  },
  {
    key: 'feedback',
    labels: ['课堂反馈', '老师反馈', '教师反馈', '课堂表现', '总体评价', '评语'],
  },
]

const LABEL_TO_KEY = new Map(
  SECTION_ALIASES.flatMap(({ key, labels }) => labels.map((label) => [label, key] as const)),
)
const HEADING_PATTERN = new RegExp(
  `(${SECTION_ALIASES.flatMap(({ labels }) => labels).sort((a, b) => b.length - a.length).join('|')})\\s*[：:]`,
  'g',
)

const LEARNING_WORDS = ['章节', '知识点', '讲解', '学习', '复习', '例题', '练习', '课程内容', '授课', '本节课', '今天讲', '今天学', '讲授']
const MASTERY_WORDS = ['掌握', '理解', '熟练', '会做', '正确率', '准确率', '薄弱', '不熟练', '不会', '错误', '完成习题', '完成练习', '能够完成', '可以完成', '需要巩固', '还需提高']
const FEEDBACK_WORDS = ['听讲', '课堂状态', '课堂表现', '上课', '表现', '积极', '认真', '专注', '回答', '参与', '注意力', '配合', '作业态度']

const CUE_PATTERN = /(?:今天(?:学习|学|讲)(?:的|了|的是|内容是)?|本节(?:课)?(?:学习|讲解|讲授|复习)(?:内容)?|讲授(?:的)?是|授课内容|学习内容|上课内容|[一-龥·]{2,8}(?:同学)?上课|孩子(?:对本节内容)?|学生(?:对本节内容)?|能够|可以|已经|基本|目前|课堂表现|课堂反馈)/g

function clean(value: string) {
  return value.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function appendUnique(target: string[], value: string) {
  const next = clean(value)
  if (next && !target.includes(next)) target.push(next)
}

function splitAtSemanticCues(value: string) {
  const source = clean(value)
  const matches = Array.from(source.matchAll(CUE_PATTERN))
  if (matches.length <= 1) return [source]

  const parts: string[] = []
  let start = 0
  for (const match of matches) {
    const index = match.index ?? 0
    if (index <= start) continue
    appendUnique(parts, source.slice(start, index))
    start = index
  }
  appendUnique(parts, source.slice(start))
  return parts
}

function sentenceParts(value: string) {
  const coarseParts = clean(value).match(/[^。！？；，,\n]+[。！？；，,]?/g)?.map(clean).filter(Boolean) ?? []
  return coarseParts.flatMap(splitAtSemanticCues).map(clean).filter(Boolean)
}

function score(value: string, words: string[]) {
  return words.reduce((total, word) => total + (value.includes(word) ? 1 : 0), 0)
}

/**
 * 将教师一次粘贴的原文整理为三个家长可读栏目。
 * 明确栏目名永远优先；无栏目名时只做保守拆分，页面仍允许教师人工校正。
 */
export function parseCombinedFeedbackInput(value: unknown): StructuredClassroomRecord {
  const source = clean(typeof value === 'string' ? value : '')
  if (!source) return { lessonContent: '', mastery: '', feedback: '' }

  const buckets: Record<SectionKey, string[]> = { lessonContent: [], mastery: [], feedback: [] }
  const matches = Array.from(source.matchAll(HEADING_PATTERN))

  if (matches.length) {
    const prefix = source.slice(0, matches[0].index).trim()
    if (prefix) appendUnique(buckets.feedback, prefix)
    matches.forEach((match, index) => {
      const key = LABEL_TO_KEY.get(match[1])
      if (!key) return
      const start = (match.index ?? 0) + match[0].length
      const end = matches[index + 1]?.index ?? source.length
      appendUnique(buckets[key], source.slice(start, end))
    })
  } else {
    const parts = sentenceParts(source)
    parts.forEach((part, index) => {
      const learning = score(part, LEARNING_WORDS)
      const mastery = score(part, MASTERY_WORDS)
      const feedback = score(part, FEEDBACK_WORDS)

      const explicitLessonCue = /今天(?:学习|学|讲)|本节(?:课)?(?:学习|讲解|讲授|复习)|讲授(?:的)?是|授课内容|学习内容|上课内容/.test(part)
      const explicitMasteryCue = /掌握|理解|熟练|会做|能够|可以|完成(?:习题|练习|作业)|正确率|准确率|薄弱|需要(?:加强|巩固)|还需提高/.test(part)
      const explicitFeedbackCue = /(?:同学)?上课|课堂(?:表现|反馈|状态)|听讲|发言|注意力|参与|配合/.test(part)

      if (explicitMasteryCue && !explicitLessonCue) {
        appendUnique(buckets.mastery, part)
      } else if (explicitFeedbackCue && !explicitLessonCue) {
        appendUnique(buckets.feedback, part)
      } else if (explicitLessonCue || (learning > 0 && learning >= mastery && learning >= feedback)) {
        appendUnique(buckets.lessonContent, part)
      } else if (mastery > 0 && mastery > learning && mastery >= feedback) {
        appendUnique(buckets.mastery, part)
      } else if (feedback > 0 && feedback > learning && feedback > mastery) {
        appendUnique(buckets.feedback, part)
      } else if (index === 0) {
        // 旧反馈习惯通常先写授课内容；仅把首句作为授课内容，不复制整段。
        appendUnique(buckets.lessonContent, part)
      } else {
        appendUnique(buckets.feedback, part)
      }
    })
  }

  return {
    lessonContent: buckets.lessonContent.join('\n'),
    mastery: buckets.mastery.join('\n'),
    feedback: buckets.feedback.join('\n'),
  }
}
