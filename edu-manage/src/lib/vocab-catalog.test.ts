import { describe, expect, it } from 'vitest'
import { mergeVocabCatalog, normalizeVocabHeadword, vocabDatabaseData, vocabEntryFromDatabase } from './vocab-catalog'
import type { VocabEntry } from '@/data/vocab-sets'

const legacy: VocabEntry = {
  id: 'g7a-001',
  grade: '初一',
  volume: '上册',
  unit: 'Unit 1 You and Me',
  section: '',
  headword: 'friend',
  pos: 'n.',
  meanings: ['朋友'],
}

describe('mergeVocabCatalog', () => {
  it('合并同单元同词头的义项，保留旧 ID 和教材页码', () => {
    const textbook: VocabEntry = {
      ...legacy,
      id: 'textbook-friend',
      pos: 'n. & v.',
      meanings: ['朋友', '友人'],
      bookPage: 19,
      note: '复数 friends',
    }

    const merged = mergeVocabCatalog([legacy, textbook])

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      id: 'g7a-001',
      pos: 'n. & v.',
      meanings: ['朋友', '友人'],
      bookPage: 19,
      note: '复数 friends',
    })
  })

  it('相同词头位于不同单元时分别保留', () => {
    const secondUnit: VocabEntry = { ...legacy, id: 'other-unit-friend', unit: 'Unit 2 We’re Family!' }
    expect(mergeVocabCatalog([legacy, secondUnit])).toHaveLength(2)
  })

  it('数据库大小写唯一键规范化，数据库记录往返保留教材页码和词形说明', () => {
    const entry: VocabEntry = {
      ...legacy,
      headword: 'O’Clock',
      note: '表示整点',
      bookPage: 60,
      sourcePage: 124,
    }
    const databaseRecord = vocabDatabaseData(entry)
    expect(normalizeVocabHeadword('O’Clock')).toBe("o'clock")
    expect(databaseRecord.normalizedHeadword).toBe("o'clock")
    expect(vocabEntryFromDatabase(databaseRecord)).toMatchObject(entry)
  })
})
