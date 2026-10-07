import { describe, expect, it } from 'vitest'
import { enrollmentIncludesSubject, normalizeEnrollmentSubjects, validateEnrollmentSubjects } from './enrollment-subjects'

describe('enrollment subjects', () => {
  it('normalizes duplicate and blank values', () => {
    expect(normalizeEnrollmentSubjects([' 数学 ', '数学', '', null])).toEqual(['数学'])
  })

  it('keeps legacy empty arrays compatible with all subjects', () => {
    expect(enrollmentIncludesSubject([], '英语')).toBe(true)
    expect(enrollmentIncludesSubject(['数学'], '英语')).toBe(false)
  })

  it('requires an explicit valid selection for edited enrollments', () => {
    expect(validateEnrollmentSubjects([], ['数学'])).toBe(false)
    expect(validateEnrollmentSubjects(['数学'], ['数学', '英语'])).toBe(true)
    expect(validateEnrollmentSubjects(['物理'], ['数学', '英语'])).toBe(false)
  })
})
