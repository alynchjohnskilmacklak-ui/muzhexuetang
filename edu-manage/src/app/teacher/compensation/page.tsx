'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/components/Layout/PageLayout'

// 薪酬福利：我的薪资 / 我的福利 合一（动态加载）
const SalaryTab = dynamic(() => import('../salary/page'), { ssr: false })
import { BenefitsLazyTab } from './_benefits-tab'

export default function TeacherCompensationPage() {
  const [tab, setTab] = useState('salary')

  return (
    <PageLayout
      title="薪酬福利"
      subtitle="收入流水 · 福利等级"
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        destroyInactiveTabPane
        items={[
          { key: 'salary', label: '我的薪资', children: <SalaryTab /> },
          { key: 'benefits', label: '我的福利', children: <BenefitsLazyTab /> },
        ]}
      />
    </PageLayout>
  )
}
