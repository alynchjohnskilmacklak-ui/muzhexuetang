import { describe, expect, it } from 'vitest'
import {
  getTextbookCatalogSelectOptions,
  resolveTextbookCatalogSelectionValues,
  validateTextbookCatalogSelectionValues,
} from './textbook-catalog'

describe('textbook catalog chapter validation', () => {
  it('accepts only exact chapter options from the selected grade and subject', () => {
    const values = getTextbookCatalogSelectOptions('数学', '初一').flatMap((group) => group.options.map((option) => option.value))
    const upper = values.find((value) => value.startsWith('七年级上册 ·'))
    const lower = values.find((value) => value.startsWith('七年级下册 ·'))

    expect(upper).toBeDefined()
    expect(lower).toBeDefined()
    expect(validateTextbookCatalogSelectionValues('数学', '初一', [upper, upper, lower, '七年级下册 · 不存在的章节']))
      .toEqual([upper, lower])
    expect(validateTextbookCatalogSelectionValues('数学', '初二', [upper])).toEqual([])
  })

  it('expands a selected chapter to its own descendants but keeps a selected section exact', () => {
    const values = getTextbookCatalogSelectOptions('数学', '初一').flatMap((group) => group.options.map((option) => option.value))
    const chapter = values.find((value) => value.endsWith('一 有理数'))
    const section = values.find((value) => value.endsWith('一 有理数 › 2 数轴'))
    expect(chapter).toBeDefined()
    expect(section).toBeDefined()

    const [resolvedChapter] = resolveTextbookCatalogSelectionValues('数学', '初一', [chapter])
    const [resolvedSection] = resolveTextbookCatalogSelectionValues('数学', '初一', [section])

    expect(resolvedChapter.relatedEntryIds).toContain('数学-七年级上册-2024-directory-3')
    expect(resolvedSection.relatedEntryIds).toEqual(['数学-七年级上册-2024-directory-3'])
  })
})
