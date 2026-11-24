import type { MobileNavItem } from './MobileLayout'
import {
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  CoffeeOutlined,
  CommentOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  MessageFilled,
  MessageOutlined,
  ReadOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'

export const adminNavItems: MobileNavItem[] = [
  // ── 每日值班中枢 ──────────────────────────────────────────────
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '数据总览',
    sectionLabel: '每日值班中枢',
  },
  { key: '/daily-class', icon: <AuditOutlined />, label: '今日课堂' },
  { key: '/closed-loop', icon: <CheckSquareOutlined />, label: '闭环管理' },

  // ── 四大核心一体化管理中心 ──────────────────────────────────────
  // 1. 教务与排课：排课中枢、课程班级、考勤消课、晚托作业班 (精炼至 4 项高频核心入口)
  {
    key: 'academic-group',
    icon: <CalendarOutlined />,
    label: '教务与排课',
    sectionLabel: '核心业务中心',
    children: [
      { key: '/schedule', icon: <CalendarOutlined />, label: '排课调度中枢' },
      { key: '/courses', icon: <BookOutlined />, label: '课程与班级' },
      { key: '/attendance', icon: <CheckSquareOutlined />, label: '考勤与消课' },
      { key: '/study-hall', icon: <ReadOutlined />, label: '晚托作业班' },
    ],
  },

  // 2. 学员成长全景：在读全景、学情测评、课堂反馈、结课归档 (精炼至 4 项高频核心入口)
  {
    key: 'student-group',
    icon: <UserOutlined />,
    label: '学员成长全景',
    children: [
      { key: '/students', icon: <UserOutlined />, label: '在读学员全景' },
      { key: '/gradebook', icon: <FileDoneOutlined />, label: '学情与测评档案' },
      { key: '/feedback-performance', icon: <MessageOutlined />, label: '课堂教学反馈' },
      { key: '/student-archive', icon: <FileTextOutlined />, label: '毕业与结课档案' },
    ],
  },

  // 3. 师资督导管理：名册档案、提问督导、课酬结算、行为日志 (精炼至 4 项高频核心入口)
  {
    key: 'teacher-group',
    icon: <TeamOutlined />,
    label: '师资督导管理',
    children: [
      { key: '/teachers', icon: <TeamOutlined />, label: '教师名册与档案' },
      { key: '/teacher-interactions', icon: <MessageOutlined />, label: '随堂提问与督导' },
      { key: '/teacher-salary', icon: <DollarOutlined />, label: '薪资课酬管理' },
      { key: '/teacher-logs', icon: <AuditOutlined />, label: '教师行为日志' },
    ],
  },

  // 4. 家校与经营：沟通中心、教学评价、家长激活、就餐管理 (精炼至 4 项高频核心入口)
  {
    key: 'operations-group',
    icon: <CommentOutlined />,
    label: '家校与经营',
    children: [
      { key: '/communication-center', icon: <BellOutlined />, label: '家校沟通中心' },
      { key: '/parent-feedback-reviews', icon: <MessageOutlined />, label: '家长评价与服务' },
      { key: '/parent-access', icon: <SafetyOutlined />, label: '家长账号激活' },
      { key: '/meals', icon: <CoffeeOutlined />, label: '学员就餐管理' },
    ],
  },

  // ── 辅助工具与系统底座 ──────────────────────────────────────────
  // 5. 升学智库：初中部专属中考升学咨询与模拟填报工具
  {
    key: 'volunteer-group',
    icon: <ExperimentOutlined />,
    label: '升学智库',
    sectionLabel: '辅助与系统底座',
    children: [
      { key: '/volunteer', icon: <CommentOutlined />, label: '志愿咨询' },
      { key: '/volunteer-sim', icon: <BarChartOutlined />, label: '模拟填报' },
      { key: '/volunteer-sim/schools', icon: <DatabaseOutlined />, label: '学校库' },
      { key: '/volunteer-sim/rank-query', icon: <BarChartOutlined />, label: '一分一档' },
      { key: '/volunteer/quota', icon: <UploadOutlined />, label: '名额表' },
    ],
  },

  // 6. 系统与资源：教学资源、AI助手、经营报表、系统设置 (精炼至 4 项高频核心入口)
  {
    key: 'resource-group',
    icon: <SettingOutlined />,
    label: '系统与资源',
    children: [
      { key: '/materials', icon: <ReadOutlined />, label: '教学与仿真资源' },
      { key: '/ai', icon: <MessageFilled />, label: 'AI 助手' },
      { key: '/reports', icon: <BarChartOutlined />, label: '经营数据报表' },
      { key: '/settings', icon: <SettingOutlined />, label: '系统与安全设置' },
    ],
  },
]
