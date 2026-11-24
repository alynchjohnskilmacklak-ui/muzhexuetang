export interface AdminDashboardMetrics {
  activeStudents: number
  studentGrowth: number
  monthlyScheduledHours: number
  monthlyDeductedHours: number
  hoursProgress: number
  todayLessons: number
  todayLessonsCompleted: number
  todayLessonsPendingAttendance: number
  pendingTasks: number
  pendingTasksUrgent: number
  activeGroups: number
  waitingGroups: number
  renewalWarnings: number
  pendingMakeups: number
  pendingIntensiveAppointments: number
  pendingIntensiveReviews: number
  unpublishedPapers: number
  unreadParentComments: number
  unreadPerformanceComments: number
  unreadComments: number
  pendingTeacherReplies: number
  pendingParentReads: number
  masteredRate: number
  performancePostsToday: number
}

export interface StudentGrowthData {
  months: string[]
  newStudents: number[]
  totalStudents: number[]
  classHours: number[]
}

export interface TodaySchedule {
  id: string
  source: 'classLesson' | 'schedule'
  time: string
  startTime: string
  endTime: string
  courseName: string
  teacher: string
  room: string
  subject: string
  students: number
  statusLabel: '待上课' | '上课中' | '待考勤' | '已完成'
  /** 年级分组：初一 / 初二 / 初三 / 高一 / 个性化课程 / 其他 */
  grade?: string
}

/** 班级详情（今日课表点击进入） */
export interface ClassDetail {
  id: string
  courseName: string
  time: string
  room: string
  subject: string
  grade: string
  statusLabel: TodaySchedule['statusLabel']
  teacher: { name: string; avatar: string | null; gender?: string; tierLevel?: string; subjects?: string }
  students: Array<{
    id: string
    name: string
    gender?: string | null
    membershipLevel: 'NORMAL' | 'VIP' | 'SVIP'
    attendanceStatus: string | null
    feedbackDone?: boolean
  }>
  attendanceDone: boolean
  feedbackDone: boolean
}

export interface TeacherWorkload {
  name: string
  hours: number
  students: number
}

export interface ActivityLog {
  id: string
  user: string
  action: string
  target: string
  time: string
}

export interface OperatingHighlight {
  label: string
  value: number
  tone: 'orange' | 'red' | 'blue' | 'purple' | 'green'
  href: string
}

export interface IntensiveAppointment {
  id: string
  groupId: string
  groupName: string
  teacher: string
  subject: string
  students: string[]
  lessonDate: string
  time: string
  createdAt: string
  createdTimeAgo: string
  isHistorical: boolean
  teachingType?: string
  teachingTypeLabel?: string
  reviewStatus?: string
}

export interface TeacherCompliance {
  teacherId: string
  name: string
  gender: string | null
  avatar: string | null
  todayLessons: number
  attendanceDone: number
  pendingAttendance: number
  feedbackDone: number
  pendingFeedback: number
}

export interface StudentGradeBreakdown {
  grade: string
  count: number
  percentage: number
}

export interface TeacherRosterSummary {
  teacherId: string
  name: string
  gender: string | null
  avatar: string | null
  tierLevel?: string | null
  subjects?: string | null
  activeStudents: number
  monthlyHours: number
  todayLessons: number
  pendingAttendance: number
  pendingFeedback: number
  pendingReplies: number
}

export interface AdminDashboardData {
  metrics: AdminDashboardMetrics
  growthData: StudentGrowthData
  schedules: TodaySchedule[]
  teacherCompliance: TeacherCompliance[]
  operatingHighlights: OperatingHighlight[]
  workloads: TeacherWorkload[]
  logs: ActivityLog[]
  intensiveAppointments: IntensiveAppointment[]
  studentGrades?: StudentGradeBreakdown[]
  teachersSummary?: TeacherRosterSummary[]
}
