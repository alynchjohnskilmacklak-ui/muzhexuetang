export interface DashboardMetrics {
  activeStudents: number
  studentGrowth: number
  monthlyHours: number
  hoursProgress: number
  monthlyRevenue: number
  revenueTrend: number[]
  pendingTasks: number
  pendingTasksUrgent: number
  activeGroups: number
  waitingGroups: number
  renewalWarnings: number
  pendingMakeups: number
  monthlyHoursDeducted: number
  unpublishedPapers: number
  unreadParentComments: number
  unreadPerformanceComments: number
  unreadComments: number
  masteredRate: number
  performancePostsToday: number
  debtStudents: number
}

export interface StudentGrowthData {
  months: string[]
  newStudents: number[]
  totalStudents: number[]
  classHours: number[]
}

export interface TodaySchedule {
  time: string
  startTime: string
  endTime: string
  courseName: string
  teacher: string
  room: string
  subject: string
  students: number
}

export interface PaymentRecord {
  id: string
  student: string
  amount: number
  type: string
  date: string
  status: string
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

export function getDashboardMetrics(): DashboardMetrics {
  return {
    activeStudents: 186,
    studentGrowth: 12.5,
    monthlyHours: 842,
    hoursProgress: 78,
    monthlyRevenue: 156800,
    revenueTrend: [98000, 112000, 125000, 138000, 145000, 156800],
    pendingTasks: 8,
    pendingTasksUrgent: 3,
    activeGroups: 12,
    waitingGroups: 3,
    renewalWarnings: 5,
    pendingMakeups: 2,
    monthlyHoursDeducted: 742,
    unpublishedPapers: 3,
    unreadParentComments: 5,
    unreadPerformanceComments: 4,
    unreadComments: 7,
    masteredRate: 71,
    performancePostsToday: 8,
    debtStudents: 4,
  }
}

export function getStudentGrowthData(): StudentGrowthData {
  return {
    months: ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04'],
    newStudents: [8, 12, 15, 10, 18, 14],
    totalStudents: [145, 152, 160, 165, 178, 186],
    classHours: [650, 720, 780, 750, 810, 842],
  }
}

export function getTodaySchedules(): TodaySchedule[] {
  return [
    { time: '08:30-10:00', startTime: new Date().toISOString(), endTime: new Date().toISOString(), courseName: '钢琴基础班', teacher: '王老师', room: '琴房A', subject: '音乐', students: 8 },
    { time: '10:15-11:45', startTime: new Date().toISOString(), endTime: new Date().toISOString(), courseName: '数学提高班', teacher: '李老师', room: '教室201', subject: '数学', students: 15 },
    { time: '13:30-15:00', startTime: new Date().toISOString(), endTime: new Date().toISOString(), courseName: '英语口语班', teacher: '张老师', room: '教室302', subject: '英语', students: 12 },
    { time: '15:15-16:45', startTime: new Date().toISOString(), endTime: new Date().toISOString(), courseName: '编程Scratch', teacher: '赵老师', room: '机房B', subject: '编程', students: 10 },
    { time: '19:00-20:30', startTime: new Date().toISOString(), endTime: new Date().toISOString(), courseName: '美术素描', teacher: '陈老师', room: '画室', subject: '美术', students: 6 },
  ]
}

export function getPaymentRecords(): PaymentRecord[] {
  return [
    { id: '1', student: '张三', amount: 3800, type: '课时费', date: '2026-05-14', status: '已付' },
    { id: '2', student: '李四', amount: 2800, type: '课时费', date: '2026-05-13', status: '已付' },
    { id: '3', student: '王五', amount: 4800, type: '教材费', date: '2026-05-12', status: '待付' },
    { id: '4', student: '赵六', amount: 3200, type: '课时费', date: '2026-05-11', status: '已付' },
  ]
}

export function getTeacherWorkloads(): TeacherWorkload[] {
  return [
    { name: '王老师', hours: 48, students: 32 },
    { name: '李老师', hours: 42, students: 28 },
    { name: '张老师', hours: 38, students: 25 },
    { name: '赵老师', hours: 35, students: 22 },
    { name: '陈老师', hours: 28, students: 18 },
    { name: '刘老师', hours: 24, students: 16 },
    { name: '吴老师', hours: 20, students: 14 },
  ]
}

export function getActivityLogs(): ActivityLog[] {
  return [
    { id: '1', user: '王老师', action: '创建了课程', target: '钢琴进阶班', time: '10分钟前' },
    { id: '2', user: '管理员', action: '审批了缴费', target: '张三 - ¥3800', time: '25分钟前' },
    { id: '3', user: '李老师', action: '提交了考勤', target: '数学提高班', time: '1小时前' },
    { id: '4', user: '张老师', action: '修改了排课', target: '英语口语班', time: '2小时前' },
    { id: '5', user: '管理员', action: '添加了新学员', target: '孙七', time: '3小时前' },
    { id: '6', user: '赵老师', action: '录入了成绩', target: '编程Scratch', time: '4小时前' },
  ]
}
