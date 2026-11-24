'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/components/Layout/PageLayout'

// 沟通中心：家长留言 / 通知发送 / 家校公告 三合一（动态加载，避免首屏打包体积）
const ParentMessagesTab = dynamic(() => import('../parent-messages/client').then((module) => module.AdminMessagesClient), { ssr: false })
const NotificationsTab = dynamic(() => import('@/components/CommunicationCenter/NotificationsTab').then((module) => module.NotificationsTab), { ssr: false })
const CommunicationsTab = dynamic(() => import('@/components/CommunicationCenter/CommunicationsTab').then((module) => module.CommunicationsTab), { ssr: false })

export default function CommunicationCenterPage() {
  const [tab, setTab] = useState('messages')

  return (
    <PageLayout
      title="沟通中心"
      subtitle="家长私信 · 通知发送 · 课堂与档案评论"
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        destroyOnHidden={false}
        items={[
          { key: 'messages', label: '家长留言', children: <ParentMessagesTab embedded /> },
          { key: 'notifications', label: '通知发送', children: <NotificationsTab embedded /> },
          { key: 'communications', label: '课堂与档案评论', children: <CommunicationsTab embedded /> },
        ]}
      />
    </PageLayout>
  )
}
