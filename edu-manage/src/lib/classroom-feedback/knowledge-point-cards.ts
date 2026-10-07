export type KnowledgePointCard = {
  edition: string
  grade: string
  subject: string
  topic: string
  definition: string
  formulas: string[]
  example?: { question: string; steps: string[]; answer: string }
  /** 易错点与学习建议（2-4 条），帮助家长了解孩子容易踩的坑与课后怎么练 */
  tips?: string[]
  verified: boolean
  source?: string
}

// Only teaching materials checked by staff may be added here with verified: true.
// A model response must never set this flag or claim to quote a textbook.
const VERIFIED_CARDS: KnowledgePointCard[] = []

export function findVerifiedKnowledgeCard(edition: string, grade: string, subject: string, note: string) {
  return VERIFIED_CARDS.find((card) => card.edition === edition && card.grade === grade
    && card.subject === subject && (note.includes(card.topic) || card.topic.includes(note.trim()))) || null
}

const shortText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export function parseGeneratedKnowledgeCard(value: unknown, context: {
  edition: string; grade: string; subject: string
}): KnowledgePointCard | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const topic = shortText(raw.topic, 80)
  const definition = shortText(raw.definition, 600)
  if (!topic || definition.length < 10) return null
  const formulas = Array.isArray(raw.formulas)
    ? raw.formulas.map((item) => shortText(item, 180)).filter(Boolean).slice(0, 5)
    : []
  const rawExample = raw.example && typeof raw.example === 'object' && !Array.isArray(raw.example)
    ? raw.example as Record<string, unknown> : null
  const question = shortText(rawExample?.question, 220)
  const answer = shortText(rawExample?.answer, 180)
  const steps = Array.isArray(rawExample?.steps)
    ? rawExample.steps.map((item) => shortText(item, 180)).filter(Boolean).slice(0, 6)
    : []
  const tips = Array.isArray(raw.tips)
    ? raw.tips.map((item) => shortText(item, 160)).filter(Boolean).slice(0, 5)
    : []
  return {
    ...context,
    topic,
    definition,
    formulas,
    ...(question && answer && steps.length ? { example: { question, steps, answer } } : {}),
    ...(tips.length ? { tips } : {}),
    verified: false,
  }
}

export function parseStoredKnowledgeCard(value: unknown): KnowledgePointCard | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const edition = shortText(raw.edition, 30)
  const grade = shortText(raw.grade, 20)
  const subject = shortText(raw.subject, 30)
  const card = parseGeneratedKnowledgeCard(value, { edition, grade, subject })
  if (!card || !edition || !grade || !subject) return null
  const trusted = VERIFIED_CARDS.find((entry) => entry.edition === edition && entry.grade === grade
    && entry.subject === subject && entry.topic === card.topic
    && entry.definition === card.definition
    && JSON.stringify(entry.formulas) === JSON.stringify(card.formulas)
    && JSON.stringify(entry.example || null) === JSON.stringify(card.example || null))
  return trusted || card
}
