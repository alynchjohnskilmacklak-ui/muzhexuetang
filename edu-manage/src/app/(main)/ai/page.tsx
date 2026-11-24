'use client'

import { useState } from 'react'
import { AIClientOverview, type AIOverviewAction } from '@/components/AI/AIClientOverview'
import { AIChatPanel } from '@/components/AI/AIChatPanel'
import {
  BellOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'

const SUGGESTED = [
  '请给我一份校务周会复盘框架，覆盖招生、出勤、教学反馈、家校沟通和续费。',
  '设计一套教师课堂反馈质量检查清单，要求具体、便于执行。',
  '向家长解释一统线与二统线时，怎样说明年份、招生范围和官方来源？',
  '遇到家长集中反映课程安排问题时，如何先核实事实、再制定沟通方案？',
  '帮我把一个运营目标拆解成负责人、步骤、时间节点和复盘指标。',
  '如何建立教师反馈、考勤和家校沟通的日常协作流程？',
]

const QUESTION_GROUPS = [{ title: '校务运营', questions: SUGGESTED }]

const ACTIONS: AIOverviewAction[] = [
  { href: '/students', icon: <UserOutlined />, label: '学员管理', description: '维护学员与报名信息' },
  { href: '/teachers', icon: <TeamOutlined />, label: '教师档案', description: '查看教师资料与状态' },
  { href: '/attendance', icon: <CheckSquareOutlined />, label: '考勤管理', description: '核对课堂考勤数据' },
  { href: '/communication-center', icon: <BellOutlined />, label: '沟通中心', description: '跟进家校消息与通知' },
]

export default function AdminAIPage() {
  const [quickAsk, setQuickAsk] = useState<string | null>(null)

  return (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <AIClientOverview
        role="admin"
        eyebrow="校务运营参谋"
        title="把校务问题梳理清楚，再落到可执行动作"
        description="小牧适合整理运营方案、政策要点、教师协作清单与家长沟通话术。请以系统管理页面的实时记录为准，AI 提供的建议需要结合校情核对。"
        capabilities={['运营复盘', '政策梳理', '流程优化', '家长沟通']}
        actionsTitle="管理端常用入口"
        actions={ACTIONS}
        questionGroups={QUESTION_GROUPS}
        onAskQuestion={setQuickAsk}
      />
      <AIChatPanel
        aiRole="admin"
        quickAsk={quickAsk}
        onQuickAskHandled={() => setQuickAsk(null)}
      />
    </div>
  )
}
