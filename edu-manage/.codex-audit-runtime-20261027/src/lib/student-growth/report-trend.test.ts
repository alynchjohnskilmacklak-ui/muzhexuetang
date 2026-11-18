import { describe, expect, it } from 'vitest'
import type { StudentGrowthArchive } from './archive'
import { renderStudentGrowthReport } from './report'

function createArchive(comments: string[]): StudentGrowthArchive {
  const items = comments.map((overallComment, index) => ({
    id: `feedback-${index}`,
    date: new Date(Date.UTC(2026, 6, 20 - index)).toISOString(),
    teacher: { id: 'teacher-a', name: '王老师' },
    subject: '数学',
    course: '数学课程',
    className: '初二一班',
    lessonContent: '本节讲解计算方法与课堂例题。',
    overallComment,
    summary: null,
    knowledgePoints: ['计算'],
    homework: [],
    tags: [],
    badge: null,
    studentRating: null,
    parentReply: null,
    replyTime: null,
    teacherReply: null,
    teacherReplyTime: null,
    createdAt: new Date(Date.UTC(2026, 6, 20 - index)).toISOString(),
  }))

  return {
    student: { id: 'student-a', name: '学生A', grade: '初二', className: '初二一班' },
    overview: {
      feedbackCount: comments.length,
      attendanceRate: comments.length ? 90 : null,
      usedHours: 10,
      remainingHours: 20,
      latestFeedbackDate: items[0]?.date || null,
    },
    feedback: {
      summary: {
        totalCount: comments.length,
        subjectCount: comments.length ? 1 : 0,
        teacherCount: comments.length ? 1 : 0,
        firstFeedbackDate: items.at(-1)?.date || null,
        latestFeedbackDate: items[0]?.date || null,
      },
      items,
    },
    attendance: {
      summary: { total: comments.length ? 10 : 0, present: 9, leave: 1, absent: 0, makeup: 0, rate: comments.length ? 90 : null },
      recentRecords: [],
    },
    hours: { totalHours: 30, usedHours: 10, remainingHours: 20, transactions: [] },
    grades: { latest: null, trend: [] },
  }
}

describe('student growth report trend', () => {
  it('returns IMPROVING when positive evidence is more than twice the negative evidence', () => {
    const input = createArchive(Array.from({ length: 4 }, () => (
      '课堂表现：学习积极认真，近期进步明显。\n知识掌握：掌握稳定。\n存在问题：本次未记录明显问题。\n后续建议：继续保持。'
    )))
    expect(renderStudentGrowthReport(input).trend).toEqual({
      type: 'IMPROVING',
      description: '近期课堂反馈显示学习状态持续向好。',
    })
  })

  it('returns NEEDS_ATTENTION when negative evidence exceeds positive evidence', () => {
    const input = createArchive(Array.from({ length: 3 }, () => (
      '课堂表现：课堂状态不足。\n知识掌握：基础薄弱，计算不熟练。\n存在问题：计算错误较多，需要加强。\n后续建议：计算训练需要加强。'
    )))
    const report = renderStudentGrowthReport(input)
    expect(report.trend.type).toBe('NEEDS_ATTENTION')
    expect(report.focusAreas).toContain('计算规范性需要加强')
  })

  it('returns STABLE when there is no feedback', () => {
    const report = renderStudentGrowthReport(createArchive([]))
    expect(report.trend.type).toBe('STABLE')
  })

  it('creates a deterministic stage summary from recorded facts', () => {
    const report = renderStudentGrowthReport(createArchive([
      '课堂表现：学习认真。\n知识掌握：掌握稳定。\n存在问题：计算需要加强。\n后续建议：每天练习计算。',
      '课堂表现：按要求完成。\n知识掌握：基础稳定。\n存在问题：计算规范不足。\n后续建议：继续练习计算。',
    ]))
    expect(report.stageSummary).toContain('学生A同学本阶段共收到2条课堂反馈。')
    expect(report.stageSummary).toContain('阶段出勤率为90%。')
    expect(report.stageSummary).toContain('计算规范性需要加强')
  })

  it('returns the exact empty stage summary without accessing a database', () => {
    const input = createArchive([])
    expect(renderStudentGrowthReport(input).stageSummary).toBe('暂无阶段学习记录。')
  })
})
