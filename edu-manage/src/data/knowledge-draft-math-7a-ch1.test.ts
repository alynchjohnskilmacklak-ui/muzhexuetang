import { describe, expect, it } from 'vitest'
import katex from 'katex'
import outline from '../../data/textbooks/user-supplied-junior-outline-2026.json'
import draft from '../../data/textbooks/knowledge-draft-math-7a-ch1.json'

describe('math 7a chapter 1 knowledge draft', () => {
  it('maps every chapter entry exactly once, without inventing a section', () => {
    const volume = outline.volumes.find((item) => item.subject === '数学' && item.title === '七年级上册')
    expect(volume).toBeDefined()
    const chapterEntries = volume!.entries.filter((entry) => entry.path[0] === '第一章 有理数')
    expect(chapterEntries).toHaveLength(12)
    expect(draft.records).toHaveLength(chapterEntries.length)
    expect(new Set(draft.records.map((record) => record.entryId)).size).toBe(draft.records.length)

    for (const [index, record] of draft.records.entries()) {
      const entry = chapterEntries[index]
      expect(record.entryId).toBe(entry.id)
      expect(record.title).toBe(entry.title)
      expect(record.knowledgePoints.length).toBeGreaterThanOrEqual(2)
      for (const point of record.knowledgePoints) {
        expect(point.title.length).toBeGreaterThan(0)
        expect(point.content.length).toBeGreaterThan(20)
        expect((point.content.match(/\$/g) ?? []).length % 2).toBe(0)
        for (const formula of point.content.matchAll(/\$([^$]+)\$/g)) {
          expect(() => katex.renderToString(formula[1], { throwOnError: true })).not.toThrow()
        }
      }
    }
  })
})
