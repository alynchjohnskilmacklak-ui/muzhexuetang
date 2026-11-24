import { GRADE7A_VOCAB, type VocabEntry } from './grade7a'
import { GRADE7A_TEXTBOOK_VOCAB } from './grade7a-textbook'
import { GRADE7B_TEXTBOOK_VOCAB } from './grade7b-textbook'
import { GRADE8A_TEXTBOOK_VOCAB } from './grade8a-textbook'
import { GRADE8B_TEXTBOOK_VOCAB } from './grade8b-textbook'
import { GRADE9A_TEXTBOOK_VOCAB } from './grade9a-textbook'
import { GRADE9B_TEXTBOOK_VOCAB } from './grade9b-textbook'
import { mergeVocabCatalog } from '@/lib/vocab-catalog'

/** 各年级词表注册表；不同册次使用独立词条 ID，学习进度不会串册。 */
export const GRADE7A_COMPLETE_VOCAB = mergeVocabCatalog([...GRADE7A_VOCAB, ...GRADE7A_TEXTBOOK_VOCAB])
export const GRADE7B_COMPLETE_VOCAB = mergeVocabCatalog(GRADE7B_TEXTBOOK_VOCAB)
export const GRADE8A_COMPLETE_VOCAB = mergeVocabCatalog(GRADE8A_TEXTBOOK_VOCAB)
export const GRADE8B_COMPLETE_VOCAB = mergeVocabCatalog(GRADE8B_TEXTBOOK_VOCAB)
export const GRADE9A_COMPLETE_VOCAB = mergeVocabCatalog(GRADE9A_TEXTBOOK_VOCAB)
export const GRADE9B_COMPLETE_VOCAB = mergeVocabCatalog(GRADE9B_TEXTBOOK_VOCAB)
export const VOCAB_BANKS: VocabEntry[][] = [
  GRADE7A_COMPLETE_VOCAB,
  GRADE7B_COMPLETE_VOCAB,
  GRADE8A_COMPLETE_VOCAB,
  GRADE8B_COMPLETE_VOCAB,
  GRADE9A_COMPLETE_VOCAB,
  GRADE9B_COMPLETE_VOCAB,
]

export { GRADE7A_VOCAB } from './grade7a'
export { GRADE7A_TEXTBOOK_VOCAB } from './grade7a-textbook'
export { GRADE7B_TEXTBOOK_VOCAB } from './grade7b-textbook'
export { GRADE8A_TEXTBOOK_VOCAB } from './grade8a-textbook'
export { GRADE8B_TEXTBOOK_VOCAB } from './grade8b-textbook'
export { GRADE9A_TEXTBOOK_VOCAB } from './grade9a-textbook'
export { GRADE9B_TEXTBOOK_VOCAB } from './grade9b-textbook'
export type { VocabEntry } from './grade7a'
