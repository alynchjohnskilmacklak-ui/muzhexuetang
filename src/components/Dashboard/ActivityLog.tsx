'use client'

import { Card, Timeline, Typography, Tag } from 'antd'
import type { ActivityLog } from '@/lib/mock-data'

const { Title, Text } = Typography

export function ActivityLogCard({ data }: { data: ActivityLog[] }) {
  return (
    <Card bordered={false} style={{ borderRadius: 8, height: '100%' }}>
      <Title level={5} style={{ marginBottom: 16 }}>最近操作日志</Title>
      <Timeline
        items={data.map((item) => ({
          color: 'blue',
          children: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <Text strong>{item.user}</Text>
                <Text> {item.action} </Text>
                <Tag style={{ marginLeft: 4 }}>{item.target}</Tag>
              </span>
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{item.time}</Text>
            </div>
          ),
        }))}
      />
    </Card>
  )
}
