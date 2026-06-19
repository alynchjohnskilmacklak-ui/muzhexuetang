import { describe, expect, it } from 'vitest'
import {
  calcLessonPay,
  DEFAULT_GROUP_RATE_JUNIOR,
  DEFAULT_GROUP_RATE_SENIOR,
  DEFAULT_ONE_ON_ONE_RATES,
  isPayableFeedback,
  normalizeGrade,
} from './teacher-salary'

describe('teacher salary calculations', () => {
  it('normalizes common grade names', () => {
    expect(normalizeGrade('初中三年级')).toBe('初三')
    expect(normalizeGrade('高二上')).toBe('高二')
  })

  it('calculates group lesson pay by junior or senior rate', () => {
    expect(calcLessonPay({
      courseType: 'GROUP', grade: '初三', lessonMinutes: 60,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })).toBe(22)
    expect(calcLessonPay({
      courseType: 'GROUP', grade: '高一', lessonMinutes: 30,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })).toBe(13)
  })

  it('calculates one-on-one pay by grade rate', () => {
    expect(calcLessonPay({
      courseType: 'ONE_ON_ONE', grade: '高三', lessonMinutes: 90,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })).toBe(75)
  })

  it('only pays feedback bonus for published useful feedback', () => {
    expect(isPayableFeedback({ status: 'PUBLISHED', summary: '课堂完成', knowledgePoints: [], studentIds: ['s1'] })).toBe(true)
    expect(isPayableFeedback({ status: 'DRAFT', summary: '课堂完成', knowledgePoints: [], studentIds: ['s1'] })).toBe(false)
    expect(isPayableFeedback({ status: 'PUBLISHED', summary: '', knowledgePoints: [], studentIds: ['s1'] })).toBe(false)
  })

  it('minute 0 returns 0 pay', () => {
    expect(calcLessonPay({
      courseType: 'GROUP', grade: '初三', lessonMinutes: 0,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })).toBe(0)
  })

  it('one-on-one returns correct pay for 45min', () => {
    const pay = calcLessonPay({
      courseType: 'ONE_ON_ONE', grade: '高三', lessonMinutes: 45,
      groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
      groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
      oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
    })
    expect(pay).toBeGreaterThan(0)
  })
})