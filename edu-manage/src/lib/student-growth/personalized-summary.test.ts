import { describe, expect, it } from 'vitest'
import {
  buildPersonalizedLearningSummaryFallback,
  parsePersonalizedLearningSummary,
  type PersonalizedLearningEvidence,
} from './personalized-summary'

const evidence: PersonalizedLearningEvidence = {
  grade: '初二',
  feedbackCount: 8,
  assessmentCount: 2,
  attendanceRate: 95,
  subjects: ['数学'],
  courseTopics: [{ label: '一元一次方程', count: 3 }],
  mastery: { total: 4, mastered: 2, needsReview: 1, needsPractice: 1 },
  topics: [{ subject: '数学', topic: '一元一次方程', total: 4, mastered: 2, needsReview: 1, needsPractice: 1 }],
  teacherMastery: [{ label: '基本掌握', count: 2 }],
  observations: [{ label: '课堂投入', count: 3 }],
  feedbackSamples: [],
}

describe('personalized learning summary', () => {
  it('rejects disclosures, unsupported-evidence wording and numeric details from the overview', () => {
    expect(parsePersonalizedLearningSummary(JSON.stringify({ overview: 'AI根据记录生成了本阶段报告', strengths: [], focusAreas: [], nextSteps: [] }))).toBeNull()
    expect(parsePersonalizedLearningSummary(JSON.stringify({ overview: '记录不足，暂时不能判断学习情况', strengths: [], focusAreas: [], nextSteps: [] }))).toBeNull()
    expect(parsePersonalizedLearningSummary(JSON.stringify({ overview: '本阶段围绕数学持续练习并完成订正。', strengths: [], focusAreas: ['数学正确率达到90%'], nextSteps: [] }))).toMatchObject({
      overview: '本阶段围绕数学持续练习并完成订正。',
      focusAreas: [],
    })
  })

  it('creates a usable, individualized fallback without mentioning AI or missing evidence', () => {
    const summary = buildPersonalizedLearningSummaryFallback(evidence)
    const text = JSON.stringify(summary)

    expect(summary.overview).toContain('初二')
    expect(summary.nextSteps.some((step) => step.includes('一元一次方程'))).toBe(true)
    expect(text).not.toMatch(/AI|人工智能|证据不足|数据不足|记录不足/i)
  })
})
