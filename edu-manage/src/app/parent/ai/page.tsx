'use client'

import { useState } from 'react'
import { AIClientOverview, type AIOverviewAction } from '@/components/AI/AIClientOverview'
import { AIChatPanel } from '@/components/AI/AIChatPanel'
import {
  BookOutlined,
  CalendarOutlined,
  CommentOutlined,
  ReadOutlined,
} from '@ant-design/icons'

const SUGGESTED_GROUPS = [
  {
    title: '孩子学习',
    questions: [
      '请用初中生听得懂的话讲清楚欧姆定律，并给一道同类练习题。',
      '帮孩子安排一份7天复习计划，请先问清年级、目标和每天可用时间。',
      '老师的课堂反馈通常要看哪些内容？请给我一个家长阅读清单。',
      '孩子最近不愿意复习，家长怎样沟通更容易让他愿意开始？',
      '我贴出一段课堂反馈后，请帮我整理成进步、待加强和下一步建议。',
    ],
  },
  {
    title: '了解牧哲学堂',
    questions: [
      '牧哲学堂是什么样的机构？请介绍课程与服务，不确定的信息注明以校区确认为准。',
      '牧哲学堂的校区在哪里、如何联系？没有准确地址时请提示联系管理员核实。',
      '课程、收费和课时怎样了解？请明确标出需要校区确认的内容。',
      '师资资质有哪些官方核实渠道？不确定的内容请明确说明。',
      '家长如何通过系统了解孩子的课程安排和老师反馈？',
      '牧哲学堂和普通补习班有哪些不同？',
    ],
  },
]

const ACTIONS: AIOverviewAction[] = [
  { href: '/parent/schedule', icon: <CalendarOutlined />, label: '课程表', description: '查看近期上课安排' },
  { href: '/parent/class-feedback', icon: <BookOutlined />, label: '课堂反馈', description: '了解老师课后记录' },
  { href: '/parent/study-hall', icon: <ReadOutlined />, label: '晚托作业', description: '查看作业与完成情况' },
  { href: '/parent/messages', icon: <CommentOutlined />, label: '家校沟通', description: '查看留言与老师交流' },
]

export default function ParentAIPage() {
  const [quickAsk, setQuickAsk] = useState<string | null>(null)

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '0 4px' }}>
      <AIClientOverview
        role="parent"
        eyebrow="家长学习陪伴"
        title="看懂孩子的学习进展，知道下一步怎么陪"
        description="小牧可以讲解题目、整理复习思路，也能帮你读懂老师反馈。课程、考勤和正式反馈请从下方系统入口查看，AI 不会替代老师的实际记录。"
        capabilities={['题目讲解', '复习规划', '反馈梳理']}
        actionsTitle="家长常用入口"
        actions={ACTIONS}
        questionGroups={SUGGESTED_GROUPS}
        onAskQuestion={setQuickAsk}
      />
      <AIChatPanel
        aiRole="parent"
        quickAsk={quickAsk}
        onQuickAskHandled={() => setQuickAsk(null)}
      />
    </div>
  )
}
