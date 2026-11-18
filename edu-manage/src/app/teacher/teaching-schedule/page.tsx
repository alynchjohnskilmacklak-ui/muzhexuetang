'use client'

import dynamic from 'next/dynamic'
import { PageLayout } from '@/components/Layout/PageLayout'

// 教学课表：我的课表（个性化课程已独立为「VIP课程预约」）
const ScheduleTab = dynamic(() => import('../schedule/page'), { ssr: false })

export default function TeacherTeachingSchedulePage() {
  return (
    <PageLayout
      title="我的课表"
      subtitle="常规课表 · 晚托作业班"
    >
      <ScheduleTab />
    </PageLayout>
  )
}
