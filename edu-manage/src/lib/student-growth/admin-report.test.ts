import { describe, expect, it } from 'vitest'
import type { StudentProfile } from '@/lib/student-profile'
import { buildAdminLearningReport, type AdminReportStudent } from './admin-report'
import { getAdminLearningReportSections } from '@/lib/classroom-feedback/parent-pdf'

const student: AdminReportStudent = {
  name: '小明', grade: '初二', school: '新乐中学', gender: 'MALE', status: 'ACTIVE',
  parentName: '张女士', mainTeacher: { name: '李老师' },
  enrollments: [
    { group: { name: '初二数学', course: { name: '初二数学', subject: '数学' } } },
    { group: { name: '数学补课', course: { name: '初二数学', subject: '数学' } } },
  ],
}

const profile = {
  overview: { attendanceRate: 90, totalHours: 30 },
  habits: { homeworkDoneRate: 75 },
  study: {
    mastery: { total: 10, masteredPct: 60, reviewPct: 30, weakPct: 10 },
    weaknesses: [{ topic: '一元一次方程', mistakeCount: 2, suggestion: '复习移项' }],
  },
  record: { trendBySubject: [{ subject: '数学', points: [{ date: new Date('2026-09-20T00:00:00.000Z'), pct: 85, score: 102, fullScore: 120, name: '月考' }] }] },
  profileCase: {
    goals: [{ subject: '数学', goalDesc: '稳定完成应用题', isAchieved: false }],
    teacherSummary: {
      summary: '本阶段进步稳定', suggestions: '继续练习应用题', teacherName: '李老师',
      periodStart: new Date('2026-09-01T00:00:00.000Z'), periodEnd: new Date('2026-09-30T00:00:00.000Z'),
    },
  },
} as StudentProfile

describe('admin learning report', () => {
  it('keeps one student and deduplicates active courses while using full feedback totals', () => {
    const report = buildAdminLearningReport(student, profile, {
      from: '2026-07-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z',
    }, { totalCount: 72, subjectCount: 3 }, [
      { summary: '第一次小结', suggestions: null, periodStart: '2026-07-01', periodEnd: '2026-07-31', teacher: { name: '王老师' } },
      { summary: '第二次小结', suggestions: '继续练习应用题', periodStart: '2026-09-01', periodEnd: '2026-09-30', teacher: { name: '李老师' } },
    ])
    expect(report.student.courses).toEqual(['初二数学'])
    expect(report.overview.feedbackCount).toBe(72)
    expect(report.indicators.attendanceRate).toBe(90)
    expect(report.indicators.totalHours).toBe(30)
    expect(report.indicators.homeworkDoneRate).toBe(75)
    expect(report.grades[0]).toMatchObject({
      subject: '数学', assessment: '月考', score: 102, fullScore: 120, percentage: 85, level: '优秀',
    })
    expect(report.teacherSummaries).toHaveLength(2)
    expect(report.executiveSummary).toContain('小明同学')
    expect(report.homeGuidance).toHaveLength(4)
    expect(report.nextStageRoadmap).toHaveLength(3)

    const sections = getAdminLearningReportSections(report)
    const teacherSection = sections.find((s) => s.title === '本期教师阶段小结')
    expect(teacherSection?.lines).toContain('第一次小结')
    expect(sections.map((section) => section.title)).toEqual([
      '学生信息与课程', '本期学习概况', '本期成绩记录', '当前学习目标与薄弱点', '本期教师阶段小结', '下一阶段提分规划与家校协同方案',
    ])
  })

  it('does not mislabel a previous period summary as this period', () => {
    const report = buildAdminLearningReport(student, profile, {
      from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T00:00:00.000Z',
    }, { totalCount: 0, subjectCount: 0 }, [
      { summary: '上期小结', suggestions: null, periodStart: '2026-09-01', periodEnd: '2026-09-30', teacher: null },
    ])
    expect(report.teacherSummaries).toEqual([])
    const sections = getAdminLearningReportSections(report)
    const teacherSection = sections.find((s) => s.title === '本期教师阶段小结')
    expect(teacherSection?.lines).toEqual(['本期暂无已发布的阶段小结'])
  })
})
