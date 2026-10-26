'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/components/Layout/PageLayout'

// 沟通中心：家长留言 / 通知发送 / 家校公告 三合一（动态加载，避免首屏打包体积）
const ParentMessagesTab = dynamic(() => import('../parent-messages/page'), { ssr: false })
const NotificationsTab = dynamic(() => import('../notifications/page'), { ssr: false })
const CommunicationsTab = dynamic(() => import('../communications/page'), { ssr: false })

export default function CommunicationCenterPage() {
  const [tab, setTab] = useState('messages')

  return (
    <PageLayout
      title="沟通中心"
      subtitle="家长留言 · 通知发送 · 家校公告统一管理"
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        destroyInactiveTabPane
        items={[
          { key: 'messages', label: '家长留言', children: <ParentMessagesTab /> },
          { key: 'notifications', label: '通知发送', children: <NotificationsTab /> },
          { key: 'communications', label: '家校公告', children: <CommunicationsTab /> },
        ]}
      />
    </PageLayout>
  )
}
