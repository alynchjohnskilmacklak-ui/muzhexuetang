import { describe, expect, it } from 'vitest'
import { enrollmentIncludesSubject, normalizeEnrollmentSubjects, validateEnrollmentSubjects } from './enrollment-subjects'

describe('enrollment subjects', () => {
  it('normalizes duplicate and blank values', () => {
    expect(normalizeEnrollmentSubjects([' 数学 ', '数学', '', null])).toEqual(['数学'])
  })

  it('subjects 为空 = 未报名任何学科（不再兼容放行全部学科，历史数据已 backfill）', () => {
    expect(enrollmentIncludesSubject([], '英语')).toBe(false)
    expect(enrollmentIncludesSubject([], null)).toBe(false)
    expect(enrollmentIncludesSubject([], undefined)).toBe(false)
  })

  it('只有显式报名的学科才匹配', () => {
    expect(enrollmentIncludesSubject(['数学'], '数学')).toBe(true)
    expect(enrollmentIncludesSubject(['数学'], '英语')).toBe(false)
  })

  it('requires an explicit valid selection for edited enrollments', () => {
    expect(validateEnrollmentSubjects([], ['数学'])).toBe(false)
    expect(validateEnrollmentSubjects(['数学'], ['数学', '英语'])).toBe(true)
    expect(validateEnrollmentSubjects(['物理'], ['数学', '英语'])).toBe(false)
  })
})
