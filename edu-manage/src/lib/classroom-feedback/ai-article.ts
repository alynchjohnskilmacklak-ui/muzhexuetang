import { findSimilarComments } from './comment-similarity'
import type { KnowledgePointCard } from './knowledge-point-cards'
import { parseGeneratedKnowledgeCard } from './knowledge-point-cards'

export type AiArticleDraft = { studentId: string; studentName: string; article: string }
export const ARTICLE_HEADINGS = ['本节课学习内容', '课堂反馈', '孩子掌握情况'] as const

export function articleSections(value: string) {
  const matches = [...value.matchAll(/(?:^|\n)(本节课学习内容|课堂反馈|孩子掌握情况)[：:]\s*/g)]
  if (matches.length !== 3 || matches.some((item, index) => item[1] !== ARTICLE_HEADINGS[index])) return null
  const sections = matches.map((item, index) => value.slice(
    (item.index || 0) + item[0].length,
    index + 1 < matches.length ? matches[index + 1].index : undefined,
  ).trim())
  return sections.every(Boolean) ? sections : null
}

const forbidden = /孩子同学|该同学|这位同学|小朋友|宝贝|保证提分|全班最强|望再接再厉|表现不错.{0,8}继续加油/

export function parseAiArticleResponse(
  raw: string,
  selected: Array<{ id: string; name: string; observation: string }>,
  context: { edition: string; grade: string; subject: string; verifiedCard?: KnowledgePointCard | null },
) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('豆包未返回可识别的反馈内容，请重试')
  let data: unknown
  try { data = JSON.parse(raw.slice(start, end + 1)) } catch { throw new Error('豆包返回格式不完整，请重试') }
  if (!data || typeof data !== 'object') throw new Error('豆包返回内容为空，请重试')
  const result = data as { topic?: unknown; knowledge?: unknown; intro?: unknown; card?: unknown; articles?: unknown }
  const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
  const card = context.verifiedCard || parseGeneratedKnowledgeCard(result.card, context)
  const topic = card?.topic || clean(result.topic, 80)
  const knowledge = clean(result.intro || result.knowledge, 450)
  const rows = Array.isArray(result.articles) ? result.articles : []
  if (!topic || !card || rows.length !== selected.length) {
    throw new Error('豆包未生成完整的知识卡片或逐人反馈，请补充课堂要点后重试')
  }
  const articles: AiArticleDraft[] = selected.map((student, index) => {
    const key = `S${index + 1}`
    const row = rows.find((entry) => entry && typeof entry === 'object' && (entry as { key?: unknown }).key === key) as { article?: unknown } | undefined
    const body = clean(row?.article, 1400)
    const sections = articleSections(body)
    if (!sections) throw new Error(`第 ${index + 1} 位学生的反馈缺少三段式内容，请重试`)
    if (/S\d+/.test(sections[0])) throw new Error('共同学习内容不应包含学生个人信息，请重试')
    if (forbidden.test(body)) throw new Error('豆包生成了不合适的称呼或承诺，请重试')
    if (selected.some((_, otherIndex) => otherIndex !== index && body.includes(`S${otherIndex + 1}`))) {
      throw new Error('生成内容混入其他学生标记，请重试')
    }
    if (!student.observation && /未记录|没有记录|暂无.*观察|没有.{0,8}观察记录|暂无.{0,8}观察|尚未.{0,6}观察|未提供.{0,4}观察|暂不展开|先不展开|不展开个人表现|个人表现方面.{0,6}描述/.test(sections[1])) {
      throw new Error('AI 生成了“未记录/不展开”等回避性表述，请重试')
    }
    const named = body.replaceAll(`${key}同学`, `${student.name}同学`).replaceAll(key, `${student.name}同学`)
    if (!named.includes(`${student.name}同学`)) throw new Error('反馈缺少学生姓名，请重试')
    return { studentId: student.id, studentName: student.name, article: named }
  })
  const similarityWarnings = findSimilarComments(articles.map((item) => ({
    studentId: item.studentId,
    comment: articleSections(item.article)?.[1] || '',
  })), 0.55)
  return { topic, knowledge, card, articles, similarityWarnings }
}
