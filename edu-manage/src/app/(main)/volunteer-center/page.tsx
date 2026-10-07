'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/components/Layout/PageLayout'

// 中考志愿中心：咨询 / 模拟填报 / 学校库 / 一分一档 / 名额表 五合一
// 动态加载：rank-query 212KB 大文件仅在打开对应 Tab 时加载（缓解首屏加载慢）
const VolunteerTab = dynamic(() => import('../volunteer/page'), { ssr: false })
const SimTab = dynamic(() => import('../volunteer-sim/page'), { ssr: false })
const SchoolsTab = dynamic(() => import('../volunteer-sim/schools/page'), { ssr: false })
const RankQueryTab = dynamic(() => import('../volunteer-sim/rank-query/page'), { ssr: false })
const QuotaTab = dynamic(() => import('../volunteer/quota/page'), { ssr: false })

export default function VolunteerCenterPage() {
  const [tab, setTab] = useState('volunteer')

  return (
    <PageLayout
      title="中考志愿"
      subtitle="志愿咨询 · 模拟测算 · 学校库 · 一分一档 · 名额表"
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        destroyInactiveTabPane
        items={[
          { key: 'volunteer', label: '志愿咨询', children: <VolunteerTab /> },
          { key: 'sim', label: '模拟填报', children: <SimTab /> },
          { key: 'schools', label: '学校库', children: <SchoolsTab /> },
          { key: 'rank', label: '一分一档', children: <RankQueryTab /> },
          { key: 'quota', label: '名额表', children: <QuotaTab /> },
        ]}
      />
    </PageLayout>
  )
}
