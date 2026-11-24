import { describe, expect, it } from 'vitest'
import { distinctChoiceLabels } from './distinct-choice-labels'

describe('distinct choice labels', () => {
  it('keeps useful grade details without appending IDs to unique labels', () => {
    const labels = distinctChoiceLabels([
      { id: 'student-a-j62i', name: '马子墨', grade: '初一' },
      { id: 'student-b-hctt', name: '马紫晨', grade: '初三' },
    ], (student) => `${student.name} · ${student.grade}`)

    expect(labels.get('student-a-j62i')).toBe('马子墨 · 初一')
    expect(labels.get('student-b-hctt')).toBe('马紫晨 · 初三')
    expect([...labels.values()].some((label) => /j62i|hctt/i.test(label))).toBe(false)
  })

  it('numbers only choices with identical visible details', () => {
    const labels = distinctChoiceLabels([
      { id: 'student-a-j62i', name: '马子墨', grade: '初一' },
      { id: 'student-b-hctt', name: '马子墨', grade: '初一' },
      { id: 'student-c', name: '马子墨', grade: '初二' },
    ], (student) => `${student.name} · ${student.grade}`)

    expect(labels.get('student-a-j62i')).toBe('马子墨 · 初一 · 同名学员 1')
    expect(labels.get('student-b-hctt')).toBe('马子墨 · 初一 · 同名学员 2')
    expect(labels.get('student-c')).toBe('马子墨 · 初二')
  })
})
