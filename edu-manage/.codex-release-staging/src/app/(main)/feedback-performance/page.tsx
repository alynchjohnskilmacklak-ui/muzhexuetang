'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/components/Layout/PageLayout'

// 反馈与表现：课堂反馈 / 在校表现 合一（动态加载）
const FeedbackTab = dynamic(() => import('../classroom-feedback/page'), { ssr: false })
const PerformanceTab = dynamic(() => import('../performance/page'), { ssr: false })

export default function FeedbackPerformancePage() {
  const [tab, setTab] = useState('feedback')

  return (
    <PageLayout
      title="反馈与表现"
      subtitle="课堂成长反馈 · 在校表现动态统一管理"
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        destroyInactiveTabPane
        items={[
          { key: 'feedback', label: '课堂反馈', children: <FeedbackTab /> },
          { key: 'performance', label: '表现动态', children: <PerformanceTab /> },
        ]}
      />
    </PageLayout>
  )
}
