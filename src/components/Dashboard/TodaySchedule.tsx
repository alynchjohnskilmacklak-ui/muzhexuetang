'use client'

import { Card, Tag, Typography, List } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import type { TodaySchedule } from '@/lib/mock-data'

const { Title, Text } = Typography

const subjectColors: Record<string, string> = {
  '音乐': '#eb2f96', '数学': '#1677ff', '英语': '#52c41a', '编程': '#722ed1', '美术': '#fa8c16',
}

export function TodayScheduleCard({ data }: { data: TodaySchedule[] }) {
  return (
    <Card bordered={false} style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
      <Title level={5} style={{ marginBottom: 16 }}>今日课表</Title>
      <List
        dataSource={data}
        renderItem={(item) => (
          <List.Item style={{ padding: '10px 0', borderBottom: '1px solid #fafafa' }}>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text strong>{item.courseName}</Text>
                <Tag color={subjectColors[item.subject] || '#1677ff'}>{item.subject}</Tag>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined /> {item.time}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{item.teacher}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{item.room}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{item.students}人</Text>
              </div>
            </div>
          </List.Item>
        )}
      />
    </Card>
  )
}
