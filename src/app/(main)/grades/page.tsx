'use client'

import { Card, Typography, Empty } from 'antd'

const { Title, Paragraph } = Typography

export default function GradesPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>成绩管理</Title>
      <Card bordered={false} style={{ borderRadius: 8, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="成绩管理模块开发中">
          <Paragraph type="secondary">此功能将在下一阶段实现</Paragraph>
        </Empty>
      </Card>
    </div>
  )
}
