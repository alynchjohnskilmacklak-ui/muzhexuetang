import type { VocabExpansion, VocabMode } from '@/lib/vocab-bank'

export type { VocabMode }

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

export type VocabStatusKey = 'MASTERED' | 'LEARNING' | 'WRONG'

export interface VocabUnitSummary {
  unit: string
  count: number
  sections: string[]
  stats: Record<VocabStatusKey, number>
}

export interface VocabProgressItem {
  status: VocabStatusKey
  correctCount: number
  wrongCount: number
  lastResult: string | null
}

export interface RecentVocabSession {
  id: string
  grade: string
  volume: string
  unit: string | null
  total: number
  correct: number
  wrongIds: string[]
  finishedAt: string
}

export interface AvailableBookOption {
  grade: string
  volume: string
  count: number
}

export interface VocabCatalog {
  grade: string
  volume: string
  availableBooks?: AvailableBookOption[]
  units: VocabUnitSummary[]
  progress: Record<string, VocabProgressItem>
  stats: { total: number; mastered: number; learning: number; wrong: number }
  recentSessions: RecentVocabSession[]
}

export interface VocabSubmissionResult {
  wordId: string
  mode: VocabMode
  selected: string
}
