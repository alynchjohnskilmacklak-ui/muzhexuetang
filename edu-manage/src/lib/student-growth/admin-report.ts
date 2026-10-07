import type { StudentProfile } from '@/lib/student-profile'

export type AdminReportStudent = {
  name: string
  grade: string | null
  school: string | null
  gender: string | null
  status: string | null
  parentName: string | null
  mainTeacher: { name: string } | null
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
    mainTeacher: string | null
    courses: string[]
  }
  period: { from: string; to: string }
  overview: {
    attendanceRate: number | null
    totalHours: number
    feedbackCount: number
    subjectCount: number
    homeworkDoneRate: number | null
  }
  mastery: { masteredPct: number; reviewPct: number; weakPct: number; total: number }
  grades: Array<{ subject: string; assessment: string; score: number; fullScore: number; percentage: number; date: string }>
  weaknesses: Array<{ topic: string; mistakeCount: number; suggestion: string | null }>
  goals: Array<{ subject: string; text: string; achieved: boolean }>
  teacherSummaries: Array<{ text: string; suggestions: string | null; teacher: string | null; period: string }>
}

function dateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10)
}

export function buildAdminLearningReport(
  student: AdminReportStudent,
  profile: StudentProfile,
  range: { from: Date | string; to: Date | string },
  feedbackSummary: { totalCount: number; subjectCount: number },
  stageSummaries: AdminReportStageSummary[],
): AdminLearningReport {
  const from = dateKey(range.from)
  const to = dateKey(range.to)
  return {
    student: {
      name: student.name,
      grade: student.grade,
      school: student.school,
      gender: student.gender,
      status: student.status,
      parentName: student.parentName,
      mainTeacher: student.mainTeacher?.name || null,
      courses: [...new Set(student.enrollments.map((row) => row.group.course.name))],
    },
    period: { from, to },
    overview: {
      attendanceRate: profile.overview.attendanceRate,
      totalHours: profile.overview.totalHours,
      feedbackCount: feedbackSummary.totalCount,
      subjectCount: feedbackSummary.subjectCount,
      homeworkDoneRate: profile.habits.homeworkDoneRate,
    },
    mastery: profile.study.mastery,
    grades: profile.record.trendBySubject.flatMap((entry) => entry.points.map((point) => ({
      subject: entry.subject,
      assessment: point.name,
      score: point.score,
      fullScore: point.fullScore,
      percentage: point.pct,
      date: dateKey(point.date),
    }))).sort((left, right) => right.date.localeCompare(left.date)),
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
    teacherSummaries: stageSummaries
      .filter((summary) => {
        const end = dateKey(summary.periodEnd)
        return end >= from && end <= to
      })
      .map((summary) => ({
        text: summary.summary,
        suggestions: summary.suggestions,
        teacher: summary.teacher?.name || null,
        period: `${dateKey(summary.periodStart)} 至 ${dateKey(summary.periodEnd)}`,
      })),
  }
}
