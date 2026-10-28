import { describe, expect, it } from 'vitest'
import currentJuniorCatalog from '../../../data/textbooks/current-junior-textbook-catalog-2026.json'
import { getTextbookCatalogSelectOptions, resolveTextbookCatalogSelectionValues, type TextbookCatalogSelection } from './textbook-catalog'
import { getSelectedTextbookKnowledgeReferences } from './textbook-knowledge-references'

describe('selected textbook knowledge references', () => {
  const options = getTextbookCatalogSelectOptions('数学', '初一').flatMap((group) => group.options)

  it('returns the source-backed chapter summaries when the chapter is selected', () => {
    const chapter = options.find((option) => option.value.endsWith('一 有理数'))
    expect(chapter).toBeDefined()

    const selections = resolveTextbookCatalogSelectionValues('数学', '初一', [chapter?.value])
    const references = getSelectedTextbookKnowledgeReferences('数学', '初一', selections)

    expect(references).toHaveLength(13)
    expect(references.map((reference) => reference.chapterTitle)).toContain('6 有理数的减法')
    expect(references.map((reference) => reference.chapterTitle)).not.toContain('第二章 几何图形的初步认识')
    expect(references.filter((reference) => reference.reviewStatus === 'DRAFT_NEEDS_SUBJECT_REVIEW')).toHaveLength(12)
    expect(references.some((reference) => reference.reviewStatus === 'PUBLISHED_QUESTION_BANK_DERIVED')).toBe(true)
  })

  it('keeps a section selection scoped to that exact section', () => {
    const section = options.find((option) => option.value.endsWith('一 有理数 › 6 有理数的减法'))
    expect(section).toBeDefined()

    const selections = resolveTextbookCatalogSelectionValues('数学', '初一', [section?.value])
    const references = getSelectedTextbookKnowledgeReferences('数学', '初一', selections)

    expect(references).toHaveLength(1)
    expect(references[0].chapterTitle).toBe('6 有理数的减法')
    expect(references[0].knowledgePoints.map((point) => point.title)).toContain('减法转化为加法')
  })

  it('does not return a reference under a different subject or grade', () => {
    const section = options.find((option) => option.value.endsWith('一 有理数 › 6 有理数的减法'))
    const selections = resolveTextbookCatalogSelectionValues('数学', '初一', [section?.value])

    expect(getSelectedTextbookKnowledgeReferences('英语', '初一', selections)).toEqual([])
    expect(getSelectedTextbookKnowledgeReferences('数学', '初二', selections)).toEqual([])
  })

  it('provides a knowledge reference for every detailed chapter in the current catalog', () => {
    let terminalChapterCount = 0

    for (const volume of currentJuniorCatalog.volumes) {
      const grade = volume.title.startsWith('七年级') ? '初一' : volume.title.startsWith('八年级') ? '初二' : '初三'
      const entryPath = (entry: (typeof volume.entries)[number]) => entry.path?.length ? entry.path : [entry.title]
      const terminalEntries = volume.entries.filter((entry) => {
        const path = entryPath(entry)
        return !volume.entries.some((other) => {
          const otherPath = entryPath(other)
          return otherPath.length > path.length && path.every((part, index) => part === otherPath[index])
        })
      })
      terminalChapterCount += terminalEntries.length

      const selection: TextbookCatalogSelection = {
        value: volume.title,
        volumeTitle: volume.title,
        entryId: terminalEntries[0]?.id || '',
        entryTitle: terminalEntries[0]?.title || '',
        depth: 0,
        path: [],
        relatedEntryIds: terminalEntries.map((entry) => entry.id),
      }
      const references = getSelectedTextbookKnowledgeReferences(volume.subject, grade, [selection])

      expect(references).toHaveLength(terminalEntries.length)
      expect(references.every((reference) => reference.knowledgePoints.length > 0)).toBe(true)
    }

    expect(terminalChapterCount).toBe(1154)
  })
})
