'use client'

import { useEffect, useState } from 'react'
import { Row, Col, Spin } from 'antd'
import { MetricsCards } from '@/components/Dashboard/MetricsCards'
import { StudentGrowthChart } from '@/components/Dashboard/StudentGrowthChart'
import { TodayScheduleCard } from '@/components/Dashboard/TodaySchedule'
import { PaymentRecordsCard } from '@/components/Dashboard/PaymentRecords'
import { TeacherWorkloadCard } from '@/components/Dashboard/TeacherWorkload'
import { ActivityLogCard } from '@/components/Dashboard/ActivityLog'
import {
  getDashboardMetrics,
  getStudentGrowthData,
  getTodaySchedules,
  getPaymentRecords,
  getTeacherWorkloads,
  getActivityLogs,
  type DashboardMetrics,
  type StudentGrowthData,
  type TodaySchedule,
  type PaymentRecord,
  type TeacherWorkload,
  type ActivityLog,
} from '@/lib/mock-data'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [growthData, setGrowthData] = useState<StudentGrowthData | null>(null)
  const [schedules, setSchedules] = useState<TodaySchedule[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [workloads, setWorkloads] = useState<TeacherWorkload[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setMetrics(getDashboardMetrics())
      setGrowthData(getStudentGrowthData())
      setSchedules(getTodaySchedules())
      setPayments(getPaymentRecords())
      setWorkloads(getTeacherWorkloads())
      setLogs(getActivityLogs())
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  if (!metrics || !growthData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <MetricsCards data={metrics} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <StudentGrowthChart data={growthData} />
        </Col>
        <Col xs={24} lg={8}>
          <TodayScheduleCard data={schedules} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <PaymentRecordsCard data={payments} />
        </Col>
        <Col xs={24} lg={16}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <TeacherWorkloadCard data={workloads} />
            </Col>
            <Col xs={24} lg={12}>
              <ActivityLogCard data={logs} />
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  )
}
