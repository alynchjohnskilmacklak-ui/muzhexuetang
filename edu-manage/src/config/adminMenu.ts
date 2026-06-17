import { createElement, type ReactNode } from 'react'
import {
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  CommentOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  MessageFilled,
  MessageOutlined,
  ReadOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'

export type AdminMenuLeaf = {
  key: string
  icon?: ReactNode
  label: string
  juniorOnly?: boolean
}

export type AdminMenuNode = AdminMenuLeaf | {
  key: string
  icon?: ReactNode
  label: string
  juniorOnly?: boolean
  children: AdminMenuLeaf[]
}

export const ADMIN_MENU: AdminMenuNode[] = [
  { key: '/dashboard', icon: createElement(DashboardOutlined), label: '数据总览' },
  { key: '/students', icon: createElement(UserOutlined), label: '学员管理' },
  {
    key: 'teacher-group',
    icon: createElement(TeamOutlined),
    label: '教师管理',
    children: [
      { key: '/teachers', label: '教师档案' },
      { key: '/teacher-logs', icon: createElement(ClockCircleOutlined), label: '行为日志' },
      { key: '/teacher-salary', icon: createElement(DollarOutlined), label: '薪资管理' },
    ],
  },
  { key: '/courses', icon: createElement(BookOutlined), label: '课程管理' },
  {
    key: 'schedule-group',
    icon: createElement(CalendarOutlined),
    label: '排课系统',
    children: [
      { key: '/schedule', label: '教室矩阵（精品班课）' },
      { key: '/schedule/intensive', label: '突击全能班（1对1/2/3）' },
      { key: '/schedule?view=teacher-week', label: '教师课表' },
      { key: '/schedule?view=week-heatmap', label: '周总览' },
    ],
  },
  { key: '/attendance', icon: createElement(CheckSquareOutlined), label: '考勤管理' },
  { key: '/classroom-feedback', icon: createElement(MessageOutlined), label: '成长反馈' },
  {
    key: 'finance-group',
    icon: createElement(DollarOutlined),
    label: '财务后勤',
    children: [
      { key: '/fees', label: '收费管理' },
      { key: '/meals', icon: createElement(CoffeeOutlined), label: '就餐管理' },
    ],
  },
  { key: '/grades', icon: createElement(FileTextOutlined), label: '学习档案' },
  {
    key: 'comm-group',
    icon: createElement(CommentOutlined),
    label: '沟通中心',
    children: [
      { key: '/parent-messages', label: '家长留言' },
      { key: '/notifications', icon: createElement(BellOutlined), label: '消息通知' },
    ],
  },
  {
    key: 'volunteer-group',
    icon: createElement(ExperimentOutlined),
    label: '中考志愿',
    juniorOnly: true,
    children: [
      { key: '/volunteer', label: '志愿咨询' },
      { key: '/volunteer-sim', label: '中考模拟测算' },
      { key: '/volunteer-sim/schools', label: '高中学校库' },
    ],
  },
  { key: '/reports', icon: createElement(BarChartOutlined), label: '数据报表' },
  { key: '/data-admin', icon: createElement(DatabaseOutlined), label: '数据管理' },
  { key: '/login-records', icon: createElement(SafetyOutlined), label: '登录记录' },
  {
    key: 'resource-group',
    icon: createElement(ReadOutlined),
    label: '教学资源',
    children: [
      { key: '/materials', label: '学习资料' },
      { key: '/phet', icon: createElement(ExperimentOutlined), label: '仿真教学' },
      { key: '/ai', icon: createElement(MessageFilled), label: 'AI 助手' },
    ],
  },
  { key: '/settings', icon: createElement(SettingOutlined), label: '系统设置' },
]

function isGroup(item: AdminMenuNode): item is AdminMenuNode & { children: AdminMenuLeaf[] } {
  return 'children' in item
}

function isVisibleForDivision(item: { juniorOnly?: boolean }, isSenior: boolean) {
  return !(isSenior && item.juniorOnly)
}

export function getAdminMenuTree(isSenior: boolean): AdminMenuNode[] {
  return ADMIN_MENU
    .filter((item) => isVisibleForDivision(item, isSenior))
    .map((item) => {
      if (!isGroup(item)) return item
      return {
        ...item,
        children: item.children.filter((child) => isVisibleForDivision(child, isSenior)),
      }
    })
}

export function getAdminMenuFlat(isSenior: boolean): AdminMenuLeaf[] {
  return getAdminMenuTree(isSenior).flatMap((item) => {
    if (!isGroup(item)) {
      return item.key.startsWith('/') && !item.key.includes('?') ? [item] : []
    }

    return item.children
      .filter((child) => child.key.startsWith('/') && !child.key.includes('?'))
      .map((child) => ({
        ...child,
        icon: child.icon ?? item.icon,
      }))
  })
}
