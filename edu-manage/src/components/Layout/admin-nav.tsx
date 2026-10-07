import type { MobileNavItem } from './MobileLayout'
import {
  AppstoreOutlined, BarChartOutlined, BellOutlined, BookOutlined, CalendarOutlined, CheckSquareOutlined,
  CoffeeOutlined, CommentOutlined, DashboardOutlined, DatabaseOutlined,
  DollarOutlined, ExperimentOutlined, FileTextOutlined, MessageFilled, MessageOutlined,
  ReadOutlined, RestOutlined, SafetyOutlined, SettingOutlined, TeamOutlined, UploadOutlined, UserOutlined,
} from '@ant-design/icons'

export const adminNavItems: MobileNavItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据总览' },
  { key: '/services', icon: <AppstoreOutlined />, label: '业务总览' },
  { key: 'academic-group', icon: <BookOutlined />, label: '学员与课程', children: [
    { key: '/students', icon: <UserOutlined />, label: '学员管理' },
    { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
    { key: '/academic-terms', icon: <CalendarOutlined />, label: '运营批次' },
    { key: '/attendance', icon: <CheckSquareOutlined />, label: '考勤管理' },
    { key: '/feedback-performance', icon: <MessageOutlined />, label: '反馈与表现' },
    { key: '/grades', icon: <FileTextOutlined />, label: '试卷管理' },
    { key: '/study-hall', icon: <ReadOutlined />, label: '作业班管理' },
    { key: '/student-archive', icon: <FileTextOutlined />, label: '学情资料检查' },
  ] },
  { key: 'teacher-group', icon: <TeamOutlined />, label: '教师管理', children: [
    { key: '/teachers', icon: <TeamOutlined />, label: '教师档案' },
    { key: '/teacher-salary', icon: <DollarOutlined />, label: '薪资管理' },
  ] },
  { key: 'schedule-group', icon: <CalendarOutlined />, label: '排课系统', children: [
    { key: '/schedule', icon: <CalendarOutlined />, label: '排课总览' },
    { key: '/schedule/intensive', icon: <CalendarOutlined />, label: '个性化排课' },
  ] },
  { key: 'operations-group', icon: <CommentOutlined />, label: '家校与运营', children: [
    { key: '/fees', icon: <DollarOutlined />, label: '收费管理' },
    { key: '/meals', icon: <CoffeeOutlined />, label: '就餐管理' },
    { key: '/communication-center', icon: <BellOutlined />, label: '沟通中心' },
    { key: '/lesson-previews/bulk', icon: <UploadOutlined />, label: '讲义批量上传' },
    { key: '/parent-access', icon: <SafetyOutlined />, label: '家长激活' },
  ] },
  { key: 'volunteer-group', icon: <ExperimentOutlined />, label: '中考志愿', children: [
    { key: '/volunteer', icon: <CommentOutlined />, label: '志愿咨询' },
    { key: '/volunteer-sim', icon: <BarChartOutlined />, label: '模拟填报' },
    { key: '/volunteer-sim/schools', icon: <DatabaseOutlined />, label: '学校库' },
    { key: '/volunteer-sim/rank-query', icon: <BarChartOutlined />, label: '一分一档' },
    { key: '/volunteer/quota', icon: <UploadOutlined />, label: '名额表' },
  ] },
  { key: 'resource-group', icon: <ReadOutlined />, label: '教学工具', children: [
    { key: '/materials', icon: <ReadOutlined />, label: '学习资料' },
    { key: '/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
    { key: '/ai', icon: <MessageFilled />, label: 'AI 助手' },
  ] },
  { key: 'system-group', icon: <SettingOutlined />, label: '数据与系统', children: [
    { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
    { key: '/data-admin', icon: <DatabaseOutlined />, label: '数据管理' },
    { key: '/trash', icon: <RestOutlined />, label: '回收站' },
    { key: '/login-records', icon: <SafetyOutlined />, label: '登录记录' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  ] },
]
