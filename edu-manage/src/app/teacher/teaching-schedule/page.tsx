'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/components/Layout/PageLayout'

// 教学课表：我的课表 / 个性化课程 合一（动态加载）
const ScheduleTab = dynamic(() => import('../schedule/page'), { ssr: false })
const IntensiveTab = dynamic(() => import('../intensive/page'), { ssr: false })

export default function TeacherTeachingSchedulePage() {
  const [tab, setTab] = useState('schedule')

  return (
    <PageLayout
      title="我的课表"
      subtitle="常规课表 · 个性化课程"
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        destroyInactiveTabPane
        items={[
          { key: 'schedule', label: '我的课表', children: <ScheduleTab /> },
          { key: 'intensive', label: '个性化课程', children: <IntensiveTab /> },
        ]}
      />
    </PageLayout>
  )
}
