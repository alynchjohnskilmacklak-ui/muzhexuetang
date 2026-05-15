'use client'

import { useState } from 'react'
import { Row, Col, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ScheduleCalendar } from '@/components/Schedule/ScheduleCalendar'
import { ScheduleFilter } from '@/components/Schedule/ScheduleFilter'
import { CourseModal } from '@/components/Schedule/CourseModal'
import { ResourceHeatmap } from '@/components/Schedule/ResourceHeatmap'

export default function SchedulePage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>排课系统</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建课程
        </Button>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={4}>
          <ScheduleFilter />
        </Col>
        <Col xs={24} lg={20}>
          <ScheduleCalendar />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <ResourceHeatmap />
        </Col>
      </Row>
      <CourseModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
