import type { KnowledgePointCard } from './knowledge-point-cards'
import type { PersonalizedLearningExtension } from './personalized-learning'

export type ParentStudyGuide = {
  ask: string[]
  practice: string[]
  check: string[]
}

type BuildParentStudyGuideInput = {
  topic?: string | null
  knowledgeCard?: KnowledgePointCard | null
  extension?: PersonalizedLearningExtension | null
  homework?: readonly string[]
}

function cleanItems(values: Array<string | null | undefined>, limit = 10) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].slice(0, limit)
}

/** Build practical parent prompts from the saved explanation; never invent an answer or claim. */
export function buildParentStudyGuide(input: BuildParentStudyGuideInput): ParentStudyGuide {
  const card = input.knowledgeCard
  const topic = card?.topic || input.topic?.trim() || '本节知识点'
  const methodPoints = (card?.formulas || [])
    .flatMap((formula) => formula.split(/[；;。\n]+/))
    .map((point) => point.trim())
    .filter((point) => point && !/^圆的定义[：:]/.test(point))
    .slice(0, 6)
  const example = card?.example
  const sourceTips = card?.tips || []
  const mistakeTips = sourceTips
    .filter((tip) => !/^课后练习建议[：:]/.test(tip.trim()))
    .map((tip) => tip.replace(/^易错点[：:]\s*/, '').trim())
    .filter(Boolean)
  const practiceTips = sourceTips
    .filter((tip) => /^课后练习建议[：:]/.test(tip.trim()))
    .map((tip) => tip.replace(/^课后练习建议[：:]\s*/, '').trim())
    .filter(Boolean)

  const ask = card
    ? cleanItems([
      `请孩子先不看讲解，用自己的话说说“${topic}”的含义。`,
      ...(methodPoints.length
        ? methodPoints.map((point) => `请孩子解释“${point}”的意思，并举例说明什么时候用。`)
        : [`请孩子举例说明“${topic}”的关键条件，并说说判断时先看哪里。`]),
      ...mistakeTips.map((tip) => `如果碰到“${tip}”，你会怎样判断并处理？`),
    ], 10)
    : cleanItems([input.extension?.parentPrompt || (input.extension?.focus ? `今天要重点巩固“${input.extension.focus}”，你准备先从哪一步开始？` : null)])

  const practice = card
    ? cleanItems([
      example?.question ? `独立完成讲解中的例题：${example.question}` : null,
      example?.steps?.length ? `遮住讲解步骤，请孩子按顺序重新说出或写出解题过程。` : null,
      ...practiceTips.map((tip) => `按这项练习建议操作：${tip}`),
      ...(input.homework || []).slice(0, 3),
      !example && !practiceTips.length && !input.homework?.length ? input.extension?.practiceTask || null : null,
    ], 8)
    : cleanItems([input.extension?.practiceTask || input.homework?.find(Boolean) || (input.topic ? `围绕“${topic}”独立完成一道课堂同类练习，并说清每一步。` : null)])

  const check = card
    ? cleanItems([
      example?.answer ? `对照讲解中的答案“${example.answer}”，逐步核对关键结果。` : null,
      ...(example?.steps || []).slice(0, 4).map((step, index) => `检查第${index + 1}步：孩子能解释“${step}”为什么这样做。`),
      ...mistakeTips.map((tip) => `易错点核对：${tip}`),
      !example && !mistakeTips.length ? input.extension?.successCheck || null : null,
    ], 10)
    : cleanItems([input.extension?.successCheck || (input.extension?.focus ? `能独立完成并讲清“${input.extension.focus}”的关键步骤。` : null)])

  return { ask, practice, check }
}
