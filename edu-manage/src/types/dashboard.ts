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

export interface AdminDashboardData {
  metrics: AdminDashboardMetrics
  growthData: StudentGrowthData
  schedules: TodaySchedule[]
  operatingHighlights: OperatingHighlight[]
  workloads: TeacherWorkload[]
  logs: ActivityLog[]
  intensiveAppointments: IntensiveAppointment[]
}
