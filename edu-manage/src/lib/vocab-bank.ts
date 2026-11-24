import { VOCAB_BANKS, type VocabEntry } from '@/data/vocab-sets'
import { getCommonPhonetic } from '@/lib/vocab-phonetic-map'

export type { VocabEntry } from '@/data/vocab-sets'

/** 初中年级顺序：高一年级可回看更低年级词表，初一只做初一。 */
export const VOCAB_GRADE_ORDER = ['初一', '初二', '初三']

export function gradeRank(grade: string): number {
  const rank = VOCAB_GRADE_ORDER.indexOf(grade)
  return rank === -1 ? 99 : rank
}

export type VocabMode = 'en-to-cn' | 'cn-to-en'
export type VocabStatus = 'LEARNING' | 'MASTERED' | 'WRONG'

export interface VocabExpansion {
  examTags: string[]
  grammar: string
  collocations: string
  commonMistake: string
  example: { english: string; chinese: string }
  application: { prompt: string; solution: string }
  sources: { label: string; url: string }[]
}

/** 连续答对达到该次数即转为「已掌握」；错题再次答对后回到学习/掌握流程。 */
export const MASTERED_THRESHOLD = 2

export interface VocabQuestion {
  wordId: string
  mode: VocabMode
  headword: string
  phonetic?: string
  pos: string
  note?: string
  meanings: string[]
  prompt: string
  options: string[]
  answerIndex: number
  expansion?: VocabExpansion
}

export interface VocabProgressSnapshot {
  correctCount: number
  wrongCount: number
  lastResult: 'CORRECT' | 'WRONG' | null
}

export function allVocab(): VocabEntry[] {
  return VOCAB_BANKS.flat()
}

export function filterVocab(filter?: { grade?: string; volume?: string; unit?: string }): VocabEntry[] {
  return filterVocabEntries(allVocab(), filter)
}

export function filterVocabEntries(
  entries: VocabEntry[],
  filter?: { grade?: string; volume?: string; unit?: string },
): VocabEntry[] {
  return entries.filter((entry) => {
    if (filter?.grade && entry.grade !== filter.grade) return false
    if (filter?.volume && entry.volume !== filter.volume) return false
    if (filter?.unit && entry.unit !== filter.unit) return false
    return true
  })
}

/** 按年级累计取词：初二可背初一+初二，初三可背初一+初二+初三，初一只做初一。 */
export function filterVocabCumulative(
  targetGrade: string,
  filter?: { volume?: string; unit?: string },
  entries: VocabEntry[] = allVocab(),
): VocabEntry[] {
  const targetRank = gradeRank(targetGrade)
  return entries.filter((entry) => {
    if (gradeRank(entry.grade) > targetRank) return false
    if (filter?.volume && entry.volume !== filter.volume) return false
    if (filter?.unit && entry.unit !== filter.unit) return false
    return true
  })
}

export interface VocabUnitSummary {
  unit: string
  count: number
  sections: string[]
}

export function unitOrderRank(unitName: string): number {
  const starterMatch = unitName.match(/Starter\s+Unit\s+(\d+)/i)
  if (starterMatch) return 10 + Number(starterMatch[1])
  const regularMatch = unitName.match(/^Unit\s+(\d+)/i)
  if (regularMatch) return 100 + Number(regularMatch[1])
  if (unitName.startsWith('参考词表')) return 1000
  return 500
}

export function listVocabUnits(entries: VocabEntry[]): VocabUnitSummary[] {
  const byUnit = new Map<string, VocabUnitSummary>()
  for (const entry of entries) {
    const summary = byUnit.get(entry.unit) ?? { unit: entry.unit, count: 0, sections: [] }
    summary.count += 1
    if (entry.section && !summary.sections.includes(entry.section)) summary.sections.push(entry.section)
    byUnit.set(entry.unit, summary)
  }
  return [...byUnit.values()].sort((a, b) => {
    const rankDiff = unitOrderRank(a.unit) - unitOrderRank(b.unit)
    if (rankDiff !== 0) return rankDiff
    return a.unit.localeCompare(b.unit, 'zh-CN')
  })
}

export function meaningsText(entry: VocabEntry): string {
  return entry.meanings.join('；')
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  }
  return hash >>> 0
}

function hashOrder(seed: string, wordId: string, index: number): number {
  return stableHash(`${seed}\u001f${wordId}\u001f${index}`)
}

function pickDistractors(
  candidates: string[],
  answer: string,
  count: number,
  seed: string,
  wordId: string,
): string[] {
  const unique = [...new Set(candidates.filter((label) => label && label !== answer))]
  const ordered = unique
    .map((label, index) => ({ label, rank: hashOrder(seed, wordId, index) }))
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
  return ordered.slice(0, count).map((item) => item.label)
}

/** 服务端依据词表判分，避免前端自报对错。 */
export function gradeVocabAnswer(entry: VocabEntry, mode: VocabMode, selectedLabel: string): boolean {
  const selected = selectedLabel.trim()
  if (mode === 'en-to-cn') return selected === meaningsText(entry)
  return selected.trim().toLowerCase() === entry.headword.trim().toLowerCase()
}

export function deriveStatus(progress: VocabProgressSnapshot): VocabStatus {
  if (progress.lastResult === 'WRONG') return 'WRONG'
  if (progress.correctCount >= MASTERED_THRESHOLD && progress.lastResult === 'CORRECT') return 'MASTERED'
  return 'LEARNING'
}

export function applyVocabResult(
  previous: VocabProgressSnapshot | null,
  correct: boolean,
): VocabProgressSnapshot & { status: VocabStatus } {
  const next: VocabProgressSnapshot = {
    correctCount: (previous?.correctCount ?? 0) + (correct ? 1 : 0),
    wrongCount: (previous?.wrongCount ?? 0) + (correct ? 0 : 1),
    lastResult: correct ? 'CORRECT' : 'WRONG',
  }
  return { ...next, status: deriveStatus(next) }
}

/**
 * 组装一次练习的题目：英选中 / 中选英按词表哈希交替出现；选项位置按种子确定性洗牌，
 * 同一批题目在服务端与重放时保持一致。
 */
export function buildVocabDeck(entries: VocabEntry[], seed: string): VocabQuestion[] {
  return entries.map((entry) => {
    const mode: VocabMode = stableHash(`${seed}\u001f${entry.id}\u001fmode`) % 2 === 0 ? 'en-to-cn' : 'cn-to-en'
    const answer = mode === 'en-to-cn' ? meaningsText(entry) : entry.headword
    const prompt = mode === 'en-to-cn' ? entry.headword : meaningsText(entry)
    const pool = entries.filter((other) => other.id !== entry.id)
    const distractorLabels = mode === 'en-to-cn'
      ? pickDistractors(pool.map(meaningsText), answer, 3, seed, entry.id)
      : pickDistractors(pool.map((other) => other.headword), answer, 3, seed, entry.id)

    const options = [...distractorLabels]
    const answerSlot = hashOrder(seed, entry.id, 99) % Math.max(2, options.length + 1)
    options.splice(answerSlot, 0, answer)

    const phonetic = entry.phonetic || getCommonPhonetic(entry.headword)
    return {
      wordId: entry.id,
      mode,
      headword: entry.headword,
      ...(phonetic ? { phonetic } : {}),
      pos: entry.pos,
      ...(entry.note ? { note: entry.note } : {}),
      meanings: entry.meanings,
      prompt,
      options,
      answerIndex: options.indexOf(answer),
    }
  })
}
