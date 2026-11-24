import { TEACHER_SUPPORT_TAGS } from './student-feedback-tags'

export type PersonalizedLearningExtension = {
  insight: string
  focus: string
  practiceTask: string
  parentPrompt: string
  successCheck: string
  nextLessonFollowup: string
}

const FIELD_LIMITS: Record<keyof PersonalizedLearningExtension, number> = {
  insight: 180,
  focus: 140,
  practiceTask: 260,
  parentPrompt: 140,
  successCheck: 140,
  nextLessonFollowup: 180,
}

function cleanPlanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  const text = value.trim().slice(0, maxLength)
  if (/(?:\bAI\b|人工智能|模型)/i.test(text)) return ''
  return text.replace(/S\d+(?:同学)?/g, '孩子').replace(/\s+/g, ' ').trim()
}

export function normalizePersonalizedLearningExtension(value: unknown): PersonalizedLearningExtension | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const normalized = Object.fromEntries(
    (Object.keys(FIELD_LIMITS) as Array<keyof PersonalizedLearningExtension>)
      .map((field) => [field, cleanPlanText(record[field], FIELD_LIMITS[field])]),
  ) as PersonalizedLearningExtension
  return Object.values(normalized).some(Boolean) ? normalized : null
}

export function getTeacherSupportTags(tags: readonly string[]) {
  const allowed = new Set<string>(TEACHER_SUPPORT_TAGS)
  return tags.filter((tag) => allowed.has(tag))
}

type PersonalizedLearningFallbackInput = {
  topic?: string | null
  mastery?: string | null
  tags?: readonly string[]
  overallComment?: string | null
  nextLessonFocus?: string | null
  homework?: readonly string[]
}

/** Legacy feedback can still show a grounded add-on using only facts already present in that feedback. */
export function buildPersonalizedLearningFallback(input: PersonalizedLearningFallbackInput): PersonalizedLearningExtension | null {
  const topic = input.topic?.trim() || ''
  const tags = input.tags || []
  const comment = input.overallComment || ''
  const concern = tags.find((tag) => /需巩固|遗漏步骤|审题还需|计算后|表达思路|易走神|粗心|需要更多思考/.test(tag))
    || (/走神|专注/.test(comment) ? '课堂专注需要持续关注'
      : /粗心|审题|遗漏|计算/.test(comment) ? '做题步骤与检查习惯'
        : /课下练习|练习意愿/.test(comment) ? '课下练习的持续性' : '')
  const nextLessonFocus = input.nextLessonFocus?.trim() || ''
  const anchor = topic ? `「${topic}」` : '本节知识点'
  const focus = concern || (input.mastery ? `继续巩固${anchor}的应用` : '')
  if (!topic && !focus && !nextLessonFocus && !input.homework?.length) return null

  const practiceTask = input.homework?.find(Boolean)?.trim()
    || (focus && /审题|步骤|检查|粗心|遗漏|计算/.test(focus)
      ? `围绕${anchor}做一轮“读清条件、说出步骤、完成后检查”的练习，把注意点落实到解题过程。`
      : topic
        ? `请孩子用自己的话复述${anchor}的关键方法，再独立完成一道对应练习并说清思路。`
        : '请孩子选一道本节练习，先独立完成，再用自己的话讲清解题思路。')
  const parentPrompt = focus && /审题|步骤|检查|粗心|遗漏|计算/.test(focus)
    ? `做这道${anchor}的题时，你先看到了哪些条件，最后检查了哪一步？`
    : `你能用自己的话说说${anchor}最关键的思路吗？`
  const successCheck = focus && /审题|步骤|检查|粗心|遗漏|计算/.test(focus)
    ? '能先说清题目条件，按步骤完成，并指出自己检查了什么。'
    : `能独立说出${anchor}的关键方法，并解释练习中的主要步骤。`
  const nextLessonFollowup = nextLessonFocus
    ? `下次课继续跟进：${nextLessonFocus}`
    : focus
      ? `下次课继续观察“${focus}”对应的学习表现。`
      : `下次课复核${anchor}的应用情况。`

  return normalizePersonalizedLearningExtension({
    insight: [input.mastery ? `老师记录的掌握状态为“${input.mastery}”。` : '', concern ? `本次重点关注“${concern}”。` : ''].filter(Boolean).join(''),
    focus,
    practiceTask,
    parentPrompt,
    successCheck,
    nextLessonFollowup,
  })
}
