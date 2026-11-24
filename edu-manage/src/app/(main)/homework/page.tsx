'use client'

import { Suspense } from 'react'
import { Spin } from 'antd'
import { PageLayout } from '@/components/Layout/PageLayout'
import { HomeworkClient } from './client'

export default function HomeworkPage() {
  return (
    <PageLayout
      title="作业监管中心"
      subtitle="全校班级作业布置 · 提交批改进度 · 教学履约质检大盘"
    >
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" tip="正在加载页面..." /></div>}>
        <HomeworkClient />
      </Suspense>
    </PageLayout>
  )
}
