import type { PrismaClient } from '@prisma/client'
import { visiblePerformancePostWhere, visibleTeacherWhere } from '@/lib/business-visibility'

export interface ProfileRange { from: Date; to: Date }

export async function getStudentProfile(
  prisma: PrismaClient,
  studentId: string,
  range: ProfileRange,
) {
  const { from, to } = range

  const [student, papers, grades, weaknesses, goals, badges, feedbacks, posts, attendances, stageSummary] =
    await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true, name: true, grade: true, school: true,
          totalHours: true, remainHours: true,
          mainTeacher: { select: { name: true } },
        },
      }),
      prisma.examPaper.findMany({
        where: { studentId, status: 'PUBLISHED', paperDate: { gte: from, lte: to } },
        select: {
          id: true, title: true, subject: true, paperDate: true, teacher: { select: { name: true, subjects: true } },
          questions: { select: { mastery: true, topic: true } },
        },
        orderBy: { paperDate: 'desc' }, take: 50,
      }),
      prisma.gradeRecord.findMany({
        where: { studentId, assessment: { assessDate: { gte: from, lte: to } } },
        select: {
          score: true, comment: true, createdAt: true,
          assessment: { select: { name: true, type: true, assessDate: true, fullScore: true,
            group: { select: { course: { select: { subject: true } } } } } },
          dimensions: { select: { dimension: true, score: true, maxScore: true } },
        },
        orderBy: { assessment: { assessDate: 'asc' } },
      }),
      prisma.weaknessRecord.findMany({
        where: { studentId },
        select: { id: true, topic: true, mistakeCount: true, suggestion: true, createdAt: true },
        orderBy: [{ mistakeCount: 'desc' }, { createdAt: 'desc' }], take: 20,
      }),
      prisma.learningGoal.findMany({
        where: { studentId },
        select: { id: true, subject: true, goalDesc: true, deadline: true, isAchieved: true, achievedAt: true, createdAt: true },
        orderBy: [{ isAchieved: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.achievementBadge.findMany({
        where: { studentId, earnedAt: { gte: from, lte: to } },
        select: { id: true, badgeType: true, description: true, earnedAt: true },
        orderBy: { earnedAt: 'desc' },
      }),
      prisma.classroomFeedback.findMany({
        where: { studentIds: { has: studentId }, status: 'PUBLISHED', createdAt: { gte: from, lte: to } },
        select: { id: true, mood: true, tags: true, knowledgePoints: true, summary: true, overallComment: true,
          homework: true, badge: true,
          homeworkDone: true, inClassRating: true,
          createdAt: true, teacher: { select: { name: true, subjects: true } } },
        orderBy: { createdAt: 'desc' }, take: 50,
      }),
      prisma.performancePost.findMany({
        where: { studentId, ...visiblePerformancePostWhere, teacher: visibleTeacherWhere, createdAt: { gte: from, lte: to } },
        select: { id: true, type: true, content: true, mood: true, tags: true, images: true, createdAt: true, teacher: { select: { name: true, subjects: true } } },
        orderBy: { createdAt: 'desc' }, take: 50,
      }),
      prisma.attendance.findMany({
        where: { studentId, createdAt: { gte: from, lte: to } },
        select: { status: true },
      }),
      prisma.stageSummary.findFirst({
        where: { studentId, status: 'PUBLISHED' },
        orderBy: { periodEnd: 'desc' },
        select: {
          summary: true,
          suggestions: true,
          periodStart: true,
          periodEnd: true,
          publishedAt: true,
          teacher: { select: { name: true, subjects: true } },
        },
      }),
    ])

  if (!student) return null

  // ── 学：知识掌握 ──
  const masteryCount: Record<string, number> = { MASTERED: 0, NEEDS_REVIEW: 0, NEEDS_PRACTICE: 0 }
  for (const p of papers) for (const q of p.questions) masteryCount[q.mastery] = (masteryCount[q.mastery] || 0) + 1
  const masteryTotal = masteryCount.MASTERED + masteryCount.NEEDS_REVIEW + masteryCount.NEEDS_PRACTICE
  const pct = (n: number) => (masteryTotal ? Math.round((n / masteryTotal) * 100) : 0)
  const mastery = {
    total: masteryTotal,
    masteredPct: pct(masteryCount.MASTERED),
    reviewPct: pct(masteryCount.NEEDS_REVIEW),
    weakPct: pct(masteryCount.NEEDS_PRACTICE),
  }
  const latestWithDims = [...grades].reverse().find(g => g.dimensions.length > 0)
  const radar = latestWithDims
    ? latestWithDims.dimensions.map(d => ({ dimension: d.dimension, score: d.score, maxScore: d.maxScore }))
    : []

  // ── 习：出勤 + 作业完成 + 课堂表现 ──
  const attTotal = attendances.length
  const attPresent = attendances.filter(a => a.status === 'PRESENT' || a.status === 'MAKEUP').length
  const attendanceRate = attTotal ? Math.round((attPresent / attTotal) * 100) : null
  const moodTimeline = feedbacks
    .filter(f => f.mood)
    .slice(0, 8)
    .map(f => ({ mood: f.mood, date: f.createdAt }))
    .reverse()

  // 作业完成率 & 课堂表现趋势
  const feedbacksWithHomework = feedbacks.filter(f => f.homeworkDone !== null && f.homeworkDone !== undefined)
  const homeworkDoneRate = feedbacksWithHomework.length
    ? Math.round((feedbacksWithHomework.filter(f => f.homeworkDone).length / feedbacksWithHomework.length) * 100)
    : null
  const inClassRatings = feedbacks
    .filter(f => f.inClassRating !== null && f.inClassRating !== undefined)
    .map(f => ({ rating: f.inClassRating as number, date: f.createdAt }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  const inClassAvg = inClassRatings.length
    ? Math.round((inClassRatings.reduce((s, r) => s + r.rating, 0) / inClassRatings.length) * 10) / 10
    : null

  // ── 成长：按周课堂状态、徽章累计和正向亮点 ──
  const MOOD_SCORE: Record<string, number> = { GREAT: 4, GOOD: 3, OKAY: 2, NEEDS_ATTENTION: 1 }
  const weekStartOf = (date: Date) => {
    const value = new Date(date)
    const day = value.getDay()
    value.setDate(value.getDate() - (day === 0 ? 6 : day - 1))
    value.setHours(0, 0, 0, 0)
    return value.toISOString()
  }
  const growthSignals = [
    ...feedbacks.map(item => ({ mood: item.mood, tags: item.tags || [], createdAt: item.createdAt, teacherName: item.teacher?.name || null, positiveByType: false })),
    ...posts.map(item => ({ mood: item.mood, tags: item.tags || [], createdAt: item.createdAt, teacherName: item.teacher?.name || null, positiveByType: item.type === 'HIGHLIGHT' })),
  ]
  const weekBuckets = new Map<string, number[]>()
  for (const signal of growthSignals) {
    if (!signal.mood || !(signal.mood in MOOD_SCORE)) continue
    const weekStart = weekStartOf(signal.createdAt)
    const scores = weekBuckets.get(weekStart) || []
    scores.push(MOOD_SCORE[signal.mood])
    weekBuckets.set(weekStart, scores)
  }
  const moodWeekly = [...weekBuckets.entries()]
    .map(([weekStart, scores]) => ({
      weekStart,
      avg: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10,
      count: scores.length,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-8)

  const badgeAsc = [...badges].sort((a, b) => a.earnedAt.getTime() - b.earnedAt.getTime())
  let runningBadgeTotal = 0
  const badgeCumulative = badgeAsc.map(badge => ({ date: badge.earnedAt.toISOString(), total: ++runningBadgeTotal }))

  // 与教师端 QUICK_TAGS 对齐，并兼容 AI 生成或手输的自由标签。
  const POSITIVE_TAGS = new Set(['积极发言', '专注听讲', '作业优秀', '进步明显', '思维活跃', '独立解题', '状态好', '阅读理解', '计算训练'])
  const NEGATIVE_TAGS = new Set(['需加强'])
  const POSITIVE_HINTS = ['表扬', '主动', '进步', '认真', '积极', '优秀', '专注', '提问', '帮助', '榜样', '出色', '用心']
  const isPositiveTag = (tag: string) => {
    if (NEGATIVE_TAGS.has(tag)) return false
    if (POSITIVE_TAGS.has(tag)) return true
    return POSITIVE_HINTS.some(hint => tag.includes(hint))
  }
  const tagCounter = new Map<string, number>()
  const praisingTeacherSet = new Set<string>()
  let praiseFeedbackCount = 0
  for (const signal of growthSignals) {
    for (const tag of signal.tags) tagCounter.set(tag, (tagCounter.get(tag) || 0) + 1)
    const hasPositive = signal.positiveByType || signal.tags.some(isPositiveTag)
    if (hasPositive) {
      praiseFeedbackCount += 1
      if (signal.teacherName) praisingTeacherSet.add(signal.teacherName)
    }
  }
  const badgeTypeCounter = new Map<string, number>()
  for (const badge of badges) badgeTypeCounter.set(badge.badgeType, (badgeTypeCounter.get(badge.badgeType) || 0) + 1)
  const highlights = {
    badgeTotal: badges.length,
    badgesByType: [...badgeTypeCounter.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    praiseCount: praiseFeedbackCount + badges.length,
    topTags: [...tagCounter.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    praisingTeachers: [...praisingTeacherSet],
  }

  // ── 档：成绩趋势（按学科，归一化为百分比）+ 统一时间线 ──
  const trendBySubject: Record<string, { date: Date; pct: number; name: string }[]> = {}
  for (const g of grades) {
    const subj = g.assessment.group?.course?.subject || '综合'
    const p = g.assessment.fullScore ? Math.round((g.score / g.assessment.fullScore) * 100) : g.score
    ;(trendBySubject[subj] ||= []).push({ date: g.assessment.assessDate, pct: p, name: g.assessment.name })
  }

  const subjOf = (t?: { subjects?: string | null }) =>
    (t?.subjects || '').split(/[，,、\s]+/).filter(Boolean)[0] || ''

  type TLItem = { type: 'paper' | 'feedback' | 'post' | 'badge' | 'grade' | 'goal'; title: string; sub?: string; date: Date; teacher?: string; teacherSubject?: string; images?: string[]; refType?: 'feedback' | 'paper' | 'post'; refId?: string; detail?: { comment?: string; summary?: string; knowledgePoints?: string[]; homework?: string[]; tags?: string[]; badge?: string | null; mood?: string | null } }
  const timeline: TLItem[] = []
  for (const p of papers) {
    const m = p.questions.filter(q => q.mastery === 'MASTERED').length
    timeline.push({ type: 'paper', title: `${p.title} 已批改`, sub: `掌握 ${m}/${p.questions.length} 题`, date: p.paperDate, teacher: p.teacher?.name, teacherSubject: subjOf(p.teacher), refType: 'paper', refId: p.id })
  }
  for (const f of feedbacks) timeline.push({
    type: 'feedback', title: '课堂反馈',
    sub: f.overallComment || f.summary || (f.tags || []).join(' '),
    date: f.createdAt, teacher: f.teacher?.name, teacherSubject: subjOf(f.teacher),
    refType: 'feedback', refId: f.id,
    detail: {
      comment: f.overallComment || undefined,
      summary: f.summary || undefined,
      knowledgePoints: f.knowledgePoints || [],
      homework: Array.isArray(f.homework) ? (f.homework as any[]).map(h => typeof h === 'string' ? h : h?.content).filter(Boolean) : [],
      tags: f.tags || [],
      badge: f.badge || null,
      mood: f.mood || null,
    },
  })
  for (const po of posts) timeline.push({ type: 'post', title: '成长动态', sub: po.content, date: po.createdAt, teacher: po.teacher?.name, teacherSubject: subjOf(po.teacher), images: (po.images as string[] | undefined) || undefined, refType: 'post', refId: po.id })
  for (const b of badges) timeline.push({ type: 'badge', title: `获得徽章「${b.badgeType}」`, sub: b.description || undefined, date: b.earnedAt })
  for (const g of grades) timeline.push({ type: 'grade', title: `${g.assessment.name}`, sub: `${g.score} 分`, date: g.assessment.assessDate })
  for (const go of goals.filter(x => x.isAchieved && x.achievedAt)) timeline.push({ type: 'goal', title: `达成目标：${go.goalDesc}`, date: go.achievedAt! })
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime())

  return {
    identity: {
      id: student.id, name: student.name, grade: student.grade, school: student.school,
      mainTeacher: student.mainTeacher?.name || null, totalHours: student.totalHours,
    },
    overview: {
      attendanceRate, totalHours: student.totalHours,
      paperCount: papers.length, badgeCount: badges.length,
    },
    study: {
      mastery,
      weaknesses: weaknesses.map(w => ({ topic: w.topic, mistakeCount: w.mistakeCount, suggestion: w.suggestion })),
      radar,
    },
    habits: { attendanceRate, moodTimeline, homeworkDoneRate, inClassAvg, inClassRatings },
    growth: { moodWeekly, badgeCumulative, highlights },
    record: {
      trendBySubject: Object.entries(trendBySubject).map(([subject, points]) => ({ subject, points })),
      timeline: timeline.slice(0, 40),
    },
    profileCase: {
      goals: goals.map(g => ({ subject: g.subject, goalDesc: g.goalDesc, deadline: g.deadline, isAchieved: g.isAchieved })),
      teacherSummary: stageSummary
        ? {
            summary: stageSummary.summary,
            suggestions: stageSummary.suggestions,
            teacherName: stageSummary.teacher?.name || null,
            teacherSubject: subjOf(stageSummary.teacher) || null,
            periodStart: stageSummary.periodStart,
            periodEnd: stageSummary.periodEnd,
            publishedAt: stageSummary.publishedAt,
          }
        : null,
    },
  }
}

export type StudentProfile = NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>
