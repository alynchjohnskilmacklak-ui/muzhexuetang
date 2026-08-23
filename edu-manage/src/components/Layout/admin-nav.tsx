import type { MobileNavItem } from './MobileLayout'
import {
  AppstoreOutlined, BarChartOutlined, BellOutlined, BookOutlined, CalendarOutlined, CheckSquareOutlined,
  ClockCircleOutlined, CoffeeOutlined, CommentOutlined, DashboardOutlined, DatabaseOutlined,
  DollarOutlined, ExperimentOutlined, FileTextOutlined, MessageFilled, MessageOutlined,
  ReadOutlined, SafetyOutlined, SettingOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons'

export const adminNavItems: MobileNavItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据总览' },
  { key: '/services', icon: <AppstoreOutlined />, label: '业务总览' },
  { key: '/students', icon: <UserOutlined />, label: '学员管理' },
  { key: 'teacher-group', icon: <TeamOutlined />, label: '教师管理', children: [
    { key: '/teachers', icon: <TeamOutlined />, label: '教师档案' },
    { key: '/teacher-logs', icon: <ClockCircleOutlined />, label: '行为日志' },
    { key: '/teacher-salary', icon: <DollarOutlined />, label: '薪资管理' },
  ] },
  { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
  { key: '/academic-terms', icon: <CalendarOutlined />, label: '运营批次' },
  { key: 'schedule-group', icon: <CalendarOutlined />, label: '排课系统', children: [
    { key: '/schedule', icon: <CalendarOutlined />, label: '教室矩阵（精品班课）' },
    { key: '/schedule/intensive', icon: <CalendarOutlined />, label: '突击全能班（1对1/2/3）' },
    { key: '/schedule?view=teacher-week', icon: <CalendarOutlined />, label: '教师课表' },
    { key: '/schedule?view=week-heatmap', icon: <CalendarOutlined />, label: '周总览' },
  ] },
  { key: '/attendance', icon: <CheckSquareOutlined />, label: '考勤管理' },
  { key: '/classroom-feedback', icon: <MessageOutlined />, label: '课堂成长反馈' },
  { key: '/study-hall', icon: <ReadOutlined />, label: '作业班管理' },
  { key: 'finance-group', icon: <DollarOutlined />, label: '财务后勤', children: [
    { key: '/fees', icon: <DollarOutlined />, label: '收费管理' },
    { key: '/meals', icon: <CoffeeOutlined />, label: '就餐管理' },
  ] },
  { key: '/student-archive', icon: <FileTextOutlined />, label: '学习档案' },
  { key: 'comm-group', icon: <CommentOutlined />, label: '沟通中心', children: [
    { key: '/parent-messages', icon: <MessageOutlined />, label: '家长留言' },
    { key: '/notifications', icon: <BellOutlined />, label: '消息通知' },
  ] },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
  { key: '/data-admin', icon: <DatabaseOutlined />, label: '数据管理' },
  { key: '/login-records', icon: <SafetyOutlined />, label: '登录记录' },
  { key: '/parent-access', icon: <SafetyOutlined />, label: '家长激活' },
  { key: 'volunteer-group', icon: <ExperimentOutlined />, label: '中考志愿', children: [
    { key: '/volunteer', icon: <ReadOutlined />, label: '志愿咨询' },
    { key: '/volunteer-sim', icon: <ExperimentOutlined />, label: '中考模拟测算' },
    { key: '/volunteer-sim/schools', icon: <ReadOutlined />, label: '高中学校库' },
    { key: '/volunteer-sim/rank-query', icon: <BarChartOutlined />, label: '一分一档位次' },
  ] },
  { key: 'resource-group', icon: <ReadOutlined />, label: '教学资源', children: [
    { key: '/materials', icon: <ReadOutlined />, label: '学习资料' },
    { key: '/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
    { key: '/ai', icon: <MessageFilled />, label: 'AI 助手' },
  ] },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]
