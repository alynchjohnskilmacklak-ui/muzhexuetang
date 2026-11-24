'use client'

import { useState } from 'react'
import { AIClientOverview, type AIOverviewAction } from '@/components/AI/AIClientOverview'
import { AIChatPanel } from '@/components/AI/AIChatPanel'
import useSWR from 'swr'
import {
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  CommentOutlined,
  ExperimentOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { resolveTier, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const SUGGESTED = [
  '设计一节45分钟的初二物理“光的折射与透镜”探究课，写出教学目标、探究环节和课堂提问。',
  '围绕一次函数与实际问题设计基础题、变式题各两道，并附详细解析与易错辨析。',
  '针对九年级学生期中复习，整理一份“化学方程式配平与计算”思维导图提纲。',
  '如何把“课堂注意力易分散、几何辅助线缺乏思路”写成专业且具鼓励性的家长学情反馈？',
  '分析二次函数求解析式与最值综合题的常见误区，并梳理课堂变式讲解步骤。',
  '制定一份中考英语读写综合复习计划，按考点模块和课时分配展开。',
]

const QUESTION_GROUPS = [
  { title: '精准备课', questions: SUGGESTED.slice(0, 3) },
  { title: '学情反馈', questions: SUGGESTED.slice(3, 6) },
]

const ACTIONS: AIOverviewAction[] = [
  { href: '/teacher/schedule', icon: <CalendarOutlined />, label: '今日课表', description: '确认课堂时段与学员' },
  { href: '/teacher/materials', icon: <BookOutlined />, label: '教学资料库', description: '调取讲义与备课课件' },
  { href: '/teacher/phet', icon: <ExperimentOutlined />, label: '仿真实验室', description: '数理化实验课堂演示' },
  { href: '/teacher/feedback', icon: <FileTextOutlined />, label: '课堂反馈', description: '生成评语草稿并核对' },
  { href: '/teacher/messages', icon: <CommentOutlined />, label: '家校沟通', description: '跟进家长留言与叮嘱' },
  { href: '/teacher/attendance', icon: <CheckSquareOutlined />, label: '考勤录入', description: '课后即时出勤勾选' },
]

export default function TeacherAIPage() {
  const [quickAsk, setQuickAsk] = useState<string | null>(null)
  const { data: dashData } = useSWR('/api/teacher/dashboard', fetcher)
  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const theme = TIER_THEME[currentTier]

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        ['--role-accent' as any]: theme.primary,
        ['--role-tint' as any]: `${theme.primary}12`,
        ['--color-role-teacher' as any]: theme.primary,
      }}
    >
      <AIClientOverview
        role="teacher"
        eyebrow={`AI 助教 · ${theme.roleTag || theme.name}`}
        title="备课更聚焦，分层更精准，反馈更具温度"
        description="从分层探究教案、考点题型推导到学生课后观察反馈，小牧助教为您整理思路、提供专业草稿建议。考勤与课后反馈请在对应系统页面核对后正式提交。"
        capabilities={['启发式探究教案', '分层变式练习', '多维评语草稿', '考点易错剖析']}
        actionsTitle="教师工作台直达"
        actions={ACTIONS}
        questionGroups={QUESTION_GROUPS}
        onAskQuestion={setQuickAsk}
      />
      <AIChatPanel
        aiRole="teacher"
        quickAsk={quickAsk}
        onQuickAskHandled={() => setQuickAsk(null)}
      />
    </div>
  )
}
