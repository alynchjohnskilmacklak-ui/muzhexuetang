'use client'

import useSWR from 'swr'
import { Alert, Row, Col } from 'antd'
import { DashboardHero } from '@/components/Dashboard/DashboardHero'
import { MetricsCards } from '@/components/Dashboard/MetricsCards'
import { OperationHighlightsCard } from '@/components/Dashboard/OperationHighlightsCard'
import { StudentGrowthChart } from '@/components/Dashboard/StudentGrowthChart'
import { TodayScheduleCard } from '@/components/Dashboard/TodaySchedule'
import { TeacherWorkloadCard } from '@/components/Dashboard/TeacherWorkload'
import { ActivityLogCard } from '@/components/Dashboard/ActivityLog'
import { PendingItemsCard } from '@/components/Dashboard/PendingItemsCard'
import { DashboardSkeleton } from '@/components/Dashboard/DashboardSkeleton'
import type { AdminDashboardData } from '@/types/dashboard'

const fetcher = async (url: string): Promise<AdminDashboardData> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('数据总览加载失败')
  }
  return response.json()
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR('/api/dashboard', fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: true,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error || !data) {
    return (
      <Alert
        type="error"
        showIcon
        message="数据总览加载失败"
        description="请检查数据库连接、登录状态或稍后重试。"
      />
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <DashboardHero metrics={data.metrics} />
      <MetricsCards data={data.metrics} />

      <OperationHighlightsCard data={data.operatingHighlights} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <StudentGrowthChart data={data.growthData} />
        </Col>
        <Col xs={24} lg={8}>
          <TodayScheduleCard data={data.schedules} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <TeacherWorkloadCard data={data.workloads} />
        </Col>
        <Col xs={24} lg={8}>
          <PendingItemsCard data={data.metrics} />
        </Col>
        <Col xs={24} lg={8}>
          <ActivityLogCard data={data.logs} />
        </Col>
      </Row>
    </div>
  )
}
