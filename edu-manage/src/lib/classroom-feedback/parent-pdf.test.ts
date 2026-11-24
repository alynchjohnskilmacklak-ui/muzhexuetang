import { describe, expect, it } from 'vitest'
import type { FeedbackArchiveItem } from './archive'
import { getParentFeedbackSections } from './parent-feedback-content'
import {
  getAdminLearningReportSections,
  getParentPdfDetailSections,
  getParentPdfImageRequests,
  groupFeedbackForParentPdf,
  normalizeAcademicFormulaText,
  resolveTeacherSubjectList,
  SERIF_FONT_FAMILY,
} from './parent-pdf'

function item(
  id: string,
  date: string,
  subject: string,
  teacher = '王老师',
): FeedbackArchiveItem {
  return {
    id,
    date,
    teacher: { id: `teacher-${id}`, name: teacher },
    subject,
    course: null,
    className: null,
    lessonContent: '本节讲解一元二次方程的解法与典型例题。',
    overallComment: '课堂表现：听课认真\n知识掌握：基础知识掌握稳定',
    summary: null,
    knowledgePoints: [],
    homework: [],
    tags: [],
    badge: null,
    studentRating: null,
    images: [],
    parentReply: null,
    replyTime: null,
    teacherReply: null,
    teacherReplyTime: null,
    createdAt: date,
  }
}

describe('parent feedback PDF layout data', () => {
  it('groups newest dates first', () => {
    const groups = groupFeedbackForParentPdf([
      item('old', '2026-07-20T10:00:00.000Z', '数学'),
      item('new', '2026-07-22T10:00:00.000Z', '数学'),
    ])
    expect(groups.map((group) => group.date)).toEqual(['2026-07-22', '2026-07-20'])
  })

  it('uses a stable subject order within each day', () => {
    const groups = groupFeedbackForParentPdf([
      item('physics', '2026-07-22T12:00:00.000Z', '物理'),
      item('english', '2026-07-22T11:00:00.000Z', '英语'),
      item('math', '2026-07-22T10:00:00.000Z', '数学'),
      item('chinese', '2026-07-22T09:00:00.000Z', '语文'),
    ])
    expect(groups[0].items.map((entry) => entry.subject)).toEqual(['数学', '语文', '英语', '物理'])
  })

  it('keeps only teacher fields that contain real content', () => {
    const feedback = item('one', '2026-07-22T10:00:00.000Z', '数学')
    const sections = getParentFeedbackSections(feedback)
    expect(sections).toEqual([
      { label: '本节课学习内容', content: '本节讲解一元二次方程的解法与典型例题。' },
      { label: '课堂表现', content: '听课认真' },
      { label: '孩子掌握情况', content: '基础知识掌握稳定' },
    ])
    expect(sections.some((section) => section.content === '未填写')).toBe(false)
  })

  it('focuses detail sections purely on teacher classroom feedback and interaction questions', () => {
    const feedback = {
      ...item('one', '2026-07-22T10:00:00.000Z', '数学'),
      tags: ['认真'],
      studentRating: 'GREAT',
      parentReply: '孩子反馈对这一部分概念理解清楚了，谢谢老师！',
      replyTime: '2026-07-22T20:00:00.000Z',
      teacherReply: '孩子表现很好，继续保持！',
      teacherReplyTime: '2026-07-22T20:30:00.000Z',
    }
    const sections = getParentPdfDetailSections(feedback)
    expect(sections.map((section) => section.label)).toEqual([
      '教师课堂反馈',
      '家长提问与互动留言 · 2026-07-22 20:00',
      '教师答疑与课后回复 · 2026-07-22 20:30',
    ])
  })

  it('includes legacy feedback images with resolved URLs', () => {
    const feedback = {
      ...item('one', '2026-07-22T10:00:00.000Z', '数学'),
      images: [
        {
          assetId: null,
          thumbnailUrl: '/api/files/legacy-thumbnail',
          previewUrl: '/api/files/legacy-preview',
        },
        {
          assetId: 'asset-2',
          thumbnailUrl: '/api/files/thumbnail?id=asset-2',
          previewUrl: '/api/files/preview?id=asset-2',
        },
      ],
    }
    expect(getParentPdfImageRequests(feedback)).toEqual([
      { feedbackId: 'one', imageIndex: 0, assetId: null, previewUrl: '/api/files/legacy-preview', thumbnailUrl: '/api/files/legacy-thumbnail' },
      { feedbackId: 'one', imageIndex: 1, assetId: 'asset-2', previewUrl: '/api/files/preview?id=asset-2', thumbnailUrl: '/api/files/thumbnail?id=asset-2' },
    ])
  })

  it('formats admin learning report sections with 6-part framework including roadmap and guidance', () => {
    const mockReport = {
      student: { name: '张小华', grade: '初一', school: '实验中学', gender: 'FEMALE', status: 'ACTIVE', parentName: '张父', mainTeacher: '胡老师', courses: ['初一数学'] },
      period: { from: '2026-09-01', to: '2026-11-01' },
      overview: { attendanceRate: 98, totalHours: 24, feedbackCount: 16, subjectCount: 1, homeworkDoneRate: 95 },
      indicators: { attendanceRate: 98, totalHours: 24, homeworkDoneRate: 95, masteryRate: 88, feedbackCount: 16 },
      executiveSummary: '张小华同学在学习周期内表现优异，基础扎实。',
      mastery: { masteredPct: 88, reviewPct: 8, weakPct: 4, total: 25 },
      knowledgeMatrix: {
        mastered: ['有理数加减', '一元一次方程'],
        reviewing: ['绝对值化简'],
        weak: [{ topic: '动点问题', mistakeCount: 3, suggestion: '加强分类讨论思维' }],
      },
      grades: [{ subject: '数学', assessment: '期中诊断', score: 112, fullScore: 120, percentage: 93, date: '2026-10-25', level: '优秀' as const }],
      weaknesses: [{ topic: '动点问题', mistakeCount: 3, suggestion: '加强分类讨论思维' }],
      goals: [{ subject: '数学', text: '期末冲刺115分以上', achieved: false }],
      teacherSummaries: [{ text: '课堂状态极其投入', suggestions: '注意解题书写规范', teacher: '胡老师', period: '2026-09-01 至 2026-10-31' }],
      homeGuidance: [{ title: '错题闭环复习法', desc: '每周抽查错题本' }],
      nextStageRoadmap: [{ step: '阶段一 · 基础固本', target: '核心考点清零', action: '变式过关' }],
    }
    const sections = getAdminLearningReportSections(mockReport)
    expect(sections).toHaveLength(6)
    expect(sections.map((s: any) => s.title)).toEqual([
      '学生信息与课程', '本期学习概况', '本期成绩记录', '当前学习目标与薄弱点', '本期教师阶段小结', '下一阶段提分规划与家校协同方案',
    ])
    const gradeSection = sections.find((s: any) => s.title === '本期成绩记录')
    expect(gradeSection?.records?.[0]?.value).toContain('【优秀】')
    const roadmapSection = sections.find((s: any) => s.title === '下一阶段提分规划与家校协同方案')
    expect(roadmapSection?.lines).toContain('【学堂下一阶段提分路线】')
    expect(roadmapSection?.lines).toContain('【家校共育 · 家庭辅导实操指引】')
  })

  it('declares academic typography font stack prioritizing Times New Roman and falling back to SimSun', () => {
    expect(SERIF_FONT_FAMILY).toContain('Times New Roman')
    expect(SERIF_FONT_FAMILY).toContain('SimSun')
    const timesIndex = SERIF_FONT_FAMILY.indexOf('Times New Roman')
    const simsunIndex = SERIF_FONT_FAMILY.indexOf('SimSun')
    expect(timesIndex).toBeLessThan(simsunIndex)
  })

  it('normalizes academic formulas with exponents, superscripts, Greek letters and spacing', () => {
    // 1. 幂次与上标：10^7 -> 10⁷, m^2 -> m²
    expect(normalizeAcademicFormulaText('汽油热值为4.6×10^7 J/kg')).toBe('汽油热值为4.6 × 10⁷ J/kg')
    expect(normalizeAcademicFormulaText('某汽油机对外做有用功2.76×10^7 J')).toBe('某汽油机对外做有用功2.76 × 10⁷ J')
    expect(normalizeAcademicFormulaText('底面积为50m^2，密度为1.0x10^3 kg/m^3')).toBe('底面积为50m²，密度为1.0 × 10³ kg/m³')

    // 2. 物理公式与等号间距
    expect(normalizeAcademicFormulaText('Q放=mq（或Q放=Vq，气体燃料）')).toBe('Q放 = mq（或Q放 = Vq，气体燃料）')
    expect(normalizeAcademicFormulaText('热机效率：η=W有用/Q放×100%')).toBe('热机效率：η = W有用 / Q放 × 100%')
    expect(normalizeAcademicFormulaText('热机能量流向：Q放=W有用+Q损失（废气、散热、摩擦等）')).toBe('热机能量流向：Q放 = W有用 + Q损失（废气、散热、摩擦等）')
  })

  it('resolves teacher and subject pairs accurately for student academic profile', () => {
    // 1. 单老师随堂反馈：胡思同 + 数学
    const single = resolveTeacherSubjectList(
      [item('1', '2026-10-05T10:00:00.000Z', '数学', '胡思同')],
      '胡思同',
      '牧哲学堂初三周六冲刺班',
    )
    expect(single.label).toBe('主教老师')
    expect(single.display).toBe('胡思同（数学）')

    // 2. 多老师多学科：胡思同（数学）、朱梦（物理）、范芳菲（英语）
    const multi = resolveTeacherSubjectList(
      [
        item('1', '2026-10-05T10:00:00.000Z', '数学', '胡思同'),
        item('2', '2026-10-06T10:00:00.000Z', '物理', '朱梦'),
        item('3', '2026-10-07T10:00:00.000Z', '英语', '范芳菲'),
      ],
      '胡思同',
    )
    expect(multi.label).toBe('授课教师')
    expect(multi.display).toBe('胡思同（数学）、朱梦（物理）、范芳菲（英语）')

    // 3. 只有主教师姓名但无反馈记录，通过课程名推断学科
    const fromCourse = resolveTeacherSubjectList([], '胡思同', '牧哲学堂初三数学培优班')
    expect(fromCourse.display).toBe('胡思同（数学）')

    // 4. 主教师与反馈中教师带有"老师"后缀时智能去重并保留学科
    const withSuffix = resolveTeacherSubjectList(
      [item('1', '2026-10-05T10:00:00.000Z', '数学', '胡思同老师')],
      '胡思同',
      '牧哲学堂初三周六冲刺班',
    )
    expect(withSuffix.display).toBe('胡思同（数学）')

    // 5. 课程未包含学科名且无反馈记录时，兜底显示学科标签而非裸姓名
    const fallbackCourse = resolveTeacherSubjectList([], '胡思同', '牧哲学堂初三周六冲刺班')
    expect(fallbackCourse.display).toBe('胡思同（综合培优）')

    // 6. 主教老师在档案中已登记学科（如英语），当期反馈仅有其他老师的数学课时，正确保留主教老师自身学科，绝不被篡改为数学
    const teacherWithKnownSubject = resolveTeacherSubjectList(
      [
        item('1', '2026-10-05T10:00:00.000Z', '数学', '胡思同'),
        item('2', '2026-10-12T10:00:00.000Z', '物理', '胡思同'),
      ],
      { name: '范芳菲', subjects: ['英语'] },
      '牧哲学堂初三周六冲刺班',
    )
    expect(teacherWithKnownSubject.display).toBe('胡思同（数学/物理）、范芳菲（英语）')

    // 7. 当期仅有其他老师的反馈，主教老师未登记学科且课程无学科时，使用规范兜底标签，绝不强套其他老师学科
    const teacherWithoutSubject = resolveTeacherSubjectList(
      [item('1', '2026-10-05T10:00:00.000Z', '数学', '胡思同')],
      '范芳菲',
      '牧哲学堂初三周六冲刺班',
    )
    expect(teacherWithoutSubject.display).toBe('胡思同（数学）、范芳菲（综合培优）')

    // 8. 针对生物老师被显示为化学老师的问题：支持数据库返回的逗号分隔字符串（如 "生物"），并在历史反馈出现非任教学科（化学）时自动矫正为生物
    const biologyTeacherWithStringSubjects = resolveTeacherSubjectList(
      [
        // 历史反馈记录由于排课错配或兜底被写成了化学
        item('1', '2026-10-05T10:00:00.000Z', '化学', '韩双双'),
      ],
      { name: '韩双双', subjects: '生物' as any },
      '牧哲学堂初三理化冲刺班',
    )
    expect(biologyTeacherWithStringSubjects.display).toBe('韩双双（生物）')
  })
})
