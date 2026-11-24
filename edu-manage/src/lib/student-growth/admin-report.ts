import type { StudentProfile } from '@/lib/student-profile'

export type AdminReportStudent = {
  name: string
  grade: string | null
  school: string | null
  gender: string | null
  status: string | null
  parentName: string | null
  mainTeacher: { name: string; subjects?: string[] } | null
  enrollments: Array<{ group: { name: string | null; course: { name: string; subject: string } } }>
}

export type AdminReportStageSummary = {
  summary: string
  suggestions: string | null
  periodStart: Date | string
  periodEnd: Date | string
  teacher: { name: string } | null
}

export type AdminLearningReport = {
  student: {
    name: string
    grade: string | null
    school: string | null
    gender: string | null
    status: string | null
    parentName: string | null
    mainTeacher: string | { name: string; subjects?: string[] } | null
    courses: string[]
  }
  period: { from: string; to: string }
  overview: {
    attendanceRate: number | null
    totalHours: number
    feedbackCount: number
    subjectCount: number
    homeworkDoneRate: number | null
    focusScore?: number | null
  }
  indicators: {
    attendanceRate: number | null
    totalHours: number
    homeworkDoneRate: number | null
    masteryRate: number
    feedbackCount: number
  }
  executiveSummary: string
  mastery: {
    masteredPct: number
    reviewPct: number
    weakPct: number
    total: number
    topics?: Array<{ subject: string; topic: string; total: number; mastered: number; needsReview: number; needsPractice: number }>
  }
  knowledgeMatrix: {
    mastered: string[]
    reviewing: string[]
    weak: Array<{ topic: string; mistakeCount: number; suggestion: string | null; subject?: string }>
  }
  grades: Array<{
    subject: string
    assessment: string
    score: number
    fullScore: number
    percentage: number
    date: string
    level: '优秀' | '良好' | '达标' | '待加强'
  }>
  weaknesses: Array<{ topic: string; mistakeCount: number; suggestion: string | null }>
  goals: Array<{ subject: string; text: string; achieved: boolean }>
  teacherSummaries: Array<{ text: string; suggestions: string | null; teacher: string | null; period: string }>
  homeGuidance: Array<{ title: string; desc: string }>
  nextStageRoadmap: Array<{ step: string; target: string; action: string }>
}

function dateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10)
}

function evaluateScoreLevel(pct: number): '优秀' | '良好' | '达标' | '待加强' {
  if (pct >= 85) return '优秀'
  if (pct >= 75) return '良好'
  if (pct >= 60) return '达标'
  return '待加强'
}

function buildExecutiveSummary(
  studentName: string,
  totalHours: number,
  feedbackCount: number,
  attendanceRate: number | null,
  homeworkDoneRate: number | null,
  masteryPct: number,
  weakCount: number,
): string {
  const parts: string[] = []
  const hoursStr = totalHours > 0 ? `${totalHours.toFixed(1)} 课时` : '阶段课时'
  parts.push(`本统计周期内，${studentName}同学累计在学堂学习 ${hoursStr}，教学团队共沉淀课堂反馈 ${feedbackCount} 节。`)

  if (attendanceRate !== null) {
    if (attendanceRate >= 95) parts.push(`上课出勤表现极其优越（出勤率 ${attendanceRate}%），课堂纪律与听讲习惯优异。`)
    else if (attendanceRate >= 80) parts.push(`上课出勤稳定良好（出勤率 ${attendanceRate}%），能较好保持连续学习状态。`)
    else parts.push(`出勤率为 ${attendanceRate}%，建议保障规律连贯的到校节奏，避免课程间隔过长导致考点遗忘。`)
  }

  if (homeworkDoneRate !== null) {
    if (homeworkDoneRate >= 85) parts.push(`课后作业落实严谨到位（完成率 ${homeworkDoneRate}%），自主学习意识强。`)
    else if (homeworkDoneRate >= 60) parts.push(`作业完成率达到 ${homeworkDoneRate}%，课后复习基本落实，仍需注意及时订正。`)
    else parts.push(`课后作业完成率为 ${homeworkDoneRate}%，需进一步抓实课后演练与订正闭环。`)
  }

  if (masteryPct > 0) {
    if (masteryPct >= 75) parts.push(`核心考点掌握率达 ${masteryPct}%，学科基础扎实，逻辑推理与公式应用较成熟。`)
    else if (masteryPct >= 50) parts.push(`考点掌握率为 ${masteryPct}%，常规基础题掌握平稳，中档综合题仍需巩固突破。`)
    else parts.push(`考点掌握率为 ${masteryPct}%，存在较多核心概念待攻坚过关。`)
  }

  if (weakCount > 0) {
    parts.push(`诊断发现 ${weakCount} 处需重点关注的薄弱考点，后阶段教学将聚焦专项剖析与同类变式过关。`)
  } else {
    parts.push(`各模块掌握较为均衡，建议后续挑战综合迁移大题，进一步拓宽解题视野。`)
  }

  return parts.join('')
}

const DEFAULT_HOME_GUIDANCE = [
  {
    title: '错题闭环复习法',
    desc: '建议每周抽查错题本，引导孩子充当“小老师”口述解题逻辑与易错坑点，真正做到一题通一类。',
  },
  {
    title: '专注节律与时间管理',
    desc: '课后练习采用“番茄钟”（25分钟高专注+5分钟休息），避免边写边走神，培养考场答题速度与临场感。',
  },
  {
    title: '过程导向与正向激励',
    desc: '多肯定孩子在审题、画图推导和验算过程中的认真态度，攻克难题时给予即时肯定，保护探索自信心。',
  },
  {
    title: '家校协同即时联动',
    desc: '关注学堂随堂反馈和课后作业批注，遇有疑难知识点及时在端内留言，与任课教师同步互通配合。',
  },
]

const DEFAULT_STAGE_ROADMAP = [
  {
    step: '阶段一 · 基础固本',
    target: '核心考点清零',
    action: '全面梳理诊断出的易错考点，开展公式法则复核与基础变式过关练习。',
  },
  {
    step: '阶段二 · 专题突破',
    target: '中档综合题攻坚',
    action: '聚焦中档综合题与典型题型模型拆解，强化多考点交叉解题思维训练。',
  },
  {
    step: '阶段三 · 提速规范',
    target: '全卷得分率优化',
    action: '强化答题书写规范、草稿步骤验算与限时答题策略，杜绝非智力失分。',
  },
]

export function buildAdminLearningReport(
  student: AdminReportStudent,
  profile: StudentProfile,
  range: { from: Date | string; to: Date | string },
  feedbackSummary: { totalCount: number; subjectCount: number },
  stageSummaries: AdminReportStageSummary[],
): AdminLearningReport {
  const from = dateKey(range.from)
  const to = dateKey(range.to)

  const activeCourses = student.enrollments && student.enrollments.length > 0
    ? [...new Set(student.enrollments.map((row) => row.group.course.name))]
    : [...new Set(profile.record.trendBySubject.map((t) => t.subject))]

  const totalHours = Number((profile.overview.totalHours || 0).toFixed(1))
  const attendanceRate = profile.overview.attendanceRate ?? profile.habits.attendanceRate ?? null
  const homeworkDoneRate = profile.habits.homeworkDoneRate ?? null
  const masteryRate = profile.study.mastery.masteredPct ?? 0

  const grades = profile.record.trendBySubject.flatMap((entry) => entry.points.map((point) => {
    const percentage = point.pct
    return {
      subject: entry.subject,
      assessment: point.name,
      score: point.score,
      fullScore: point.fullScore,
      percentage,
      date: dateKey(point.date),
      level: evaluateScoreLevel(percentage),
    }
  })).sort((left, right) => right.date.localeCompare(left.date))

  const topics = profile.study.mastery.topics || []
  const masteredTopics = topics
    .filter((t) => t.mastered > 0 && t.needsPractice === 0 && t.needsReview === 0)
    .map((t) => t.topic)
  const reviewTopics = topics
    .filter((t) => t.needsReview > 0)
    .map((t) => t.topic)
  const weakFromTopics = topics
    .filter((t) => t.needsPractice > 0)
    .map((t) => ({
      topic: t.topic,
      mistakeCount: t.needsPractice,
      suggestion: `加强${t.topic}的专题辨析与变式练习`,
      subject: t.subject,
    }))

  const weaknessMap = new Map<string, { topic: string; mistakeCount: number; suggestion: string | null; subject?: string }>()
  for (const w of profile.study.weaknesses || []) {
    weaknessMap.set(w.topic, {
      topic: w.topic,
      mistakeCount: w.mistakeCount,
      suggestion: w.suggestion,
    })
  }
  for (const w of weakFromTopics) {
    const existing = weaknessMap.get(w.topic)
    if (existing) {
      existing.mistakeCount = Math.max(existing.mistakeCount, w.mistakeCount)
      if (!existing.suggestion && w.suggestion) existing.suggestion = w.suggestion
    } else {
      weaknessMap.set(w.topic, w)
    }
  }
  const combinedWeaknesses = [...weaknessMap.values()]

  const executiveSummary = buildExecutiveSummary(
    student.name,
    totalHours,
    feedbackSummary.totalCount,
    attendanceRate,
    homeworkDoneRate,
    masteryRate,
    combinedWeaknesses.length,
  )

  const relevantStageSummaries = stageSummaries
    .filter((summary) => {
      const end = dateKey(summary.periodEnd)
      return end >= from && end <= to
    })
    .map((summary) => ({
      text: summary.summary,
      suggestions: summary.suggestions,
      teacher: summary.teacher?.name || null,
      period: `${dateKey(summary.periodStart)} 至 ${dateKey(summary.periodEnd)}`,
    }))

  return {
    student: {
      name: student.name,
      grade: student.grade,
      school: student.school,
      gender: student.gender,
      status: student.status,
      parentName: student.parentName,
      mainTeacher: student.mainTeacher ? { name: student.mainTeacher.name, subjects: student.mainTeacher.subjects } : null,
      courses: activeCourses,
    },
    period: { from, to },
    overview: {
      attendanceRate,
      totalHours,
      feedbackCount: feedbackSummary.totalCount,
      subjectCount: feedbackSummary.subjectCount,
      homeworkDoneRate,
      focusScore: profile.habits.inClassAvg ?? null,
    },
    indicators: {
      attendanceRate,
      totalHours,
      homeworkDoneRate,
      masteryRate,
      feedbackCount: feedbackSummary.totalCount,
    },
    executiveSummary,
    mastery: profile.study.mastery,
    knowledgeMatrix: {
      mastered: masteredTopics,
      reviewing: reviewTopics,
      weak: combinedWeaknesses,
    },
    grades,
    weaknesses: profile.study.weaknesses.map((item) => ({
      topic: item.topic,
      mistakeCount: item.mistakeCount,
      suggestion: item.suggestion,
    })),
    goals: profile.profileCase.goals.map((goal) => ({
      subject: goal.subject,
      text: goal.goalDesc,
      achieved: goal.isAchieved,
    })),
    teacherSummaries: relevantStageSummaries,
    homeGuidance: DEFAULT_HOME_GUIDANCE,
    nextStageRoadmap: DEFAULT_STAGE_ROADMAP,
  }
}
