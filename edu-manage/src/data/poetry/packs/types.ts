export type FootnoteNoteItem = {
  term: string
  pinyin?: string
  type?: string
  meaning: string
}

export type SentenceTranslationPair = {
  original: string
  translation: string
  notes?: string
}

export type DeepAppreciationPack = {
  authorInfo: string
  background: string
  artisticFeature: string
  mainTheme: string
  examStrategy: string
}

export type PoetryLearningItemPack = {
  vernacularFull: string
  sentencePairs: SentenceTranslationPair[]
  detailedNotes: FootnoteNoteItem[]
  appreciation: DeepAppreciationPack
  gameDecoyChars: string[]
}
