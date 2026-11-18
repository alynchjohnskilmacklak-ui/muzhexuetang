import { describe, expect, it } from 'vitest'
import outline from '../../data/textbooks/user-supplied-junior-outline-2026.json'

describe('user-supplied textbook outline transcription', () => {
  it('keeps every identified directory line and its source location', () => {
    expect(outline.volumes).toHaveLength(43)
    expect(new Set(outline.volumes.map((volume) => volume.subject)).size).toBe(9)
    const entries = outline.volumes.flatMap((volume) => volume.entries)
    expect(entries).toHaveLength(1171)
    expect(new Set(entries.map((entry) => entry.sourceLine)).size).toBe(entries.length)
    for (const volume of outline.volumes) {
      expect(volume.directoryHeadingLine).toBeGreaterThan(volume.sourceHeadingLine)
      expect(volume.entries.length).toBeGreaterThan(0)
      for (const entry of volume.entries) {
        expect(entry.path).toHaveLength(entry.depth + 1)
        expect(entry.path.at(-1)).toBe(entry.title)
        expect(entry.sourceLine).toBeGreaterThan(volume.directoryHeadingLine!)
        expect(entry.knowledgeStatus).toBe('PENDING_REVIEW')
      }
    }
  })
})
