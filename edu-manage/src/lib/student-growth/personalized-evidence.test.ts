import { describe, expect, it } from 'vitest'
import { buildPersonalizedLearningEvidence } from './personalized-evidence'

describe('personalized learning evidence', () => {
  it('removes student identifiers and redacts contact data before summaries are sent', () => {
    const evidence = buildPersonalizedLearningEvidence({
      identity: { name: '马子墨', grade: '初二' },
      overview: { paperCount: 1, attendanceRate: 100 },
      study: {
        mastery: {
          total: 2,
          masteredCount: 1,
          needsReviewCount: 1,
          needsPracticeCount: 0,
          topics: [{ subject: '马子墨数学', topic: '马子墨的一元一次方程', total: 2, mastered: 1, needsReview: 1, needsPractice: 0 }],
        },
      },
      record: {
        reportFeedbacks: [{
          type: 'feedback',
          teacherSubject: '数学',
          detail: {
            lessonContent: '马子墨练习了一元一次方程',
            comment: '马子墨今天专注，联系 13800138000 或 parent@example.com',
            knowledgePoints: ['马子墨的一元一次方程'],
            studentMastery: '基本掌握',
            homework: ['复习马子墨的一元一次方程'],
          },
        }],
      },
    })

    const serialized = JSON.stringify(evidence)
    expect(serialized).not.toContain('马子墨')
    expect(serialized).not.toContain('13800138000')
    expect(serialized).not.toContain('parent@example.com')
    expect(serialized).toContain('[联系方式]')
    expect(evidence.feedbackSamples[0].lesson).toContain('学生')
  })

  it('keeps the complete feedback count while limiting only the AI context samples', () => {
    const reportFeedbacks = Array.from({ length: 40 }, (_, index) => ({
      type: 'feedback',
      teacherSubject: '语文',
      detail: { lessonContent: `第${index + 1}节阅读`, comment: '认真完成课堂练习' },
    }))
    const evidence = buildPersonalizedLearningEvidence({
      identity: { name: '小明', grade: '初一' },
      overview: { paperCount: 0, attendanceRate: null },
      study: { mastery: { total: 0, masteredCount: 0, needsReviewCount: 0, needsPracticeCount: 0, topics: [] } },
      record: { reportFeedbacks },
    })

    expect(evidence.feedbackCount).toBe(40)
    expect(evidence.feedbackSamples).toHaveLength(36)
  })
})
