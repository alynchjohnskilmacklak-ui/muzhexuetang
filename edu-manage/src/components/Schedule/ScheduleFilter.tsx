'use client'

import { Card, Select, Typography, Space } from 'antd'

const { Title, Text } = Typography

const teachers = ['全部教师', '王老师', '李老师', '张老师', '赵老师', '陈老师']
const rooms = ['全部教室', '琴房A', '教室201', '教室302', '机房B', '画室']
const subjects = ['全部科目', '音乐', '数学', '英语', '编程', '美术']

export function ScheduleFilter() {
  return (
    <Card bordered={false} style={{ borderRadius: 8 }}>
      <Title level={5} style={{ marginBottom: 16 }}>筛选条件</Title>
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>教师筛选</Text>
          <Select defaultValue="全部教师" options={teachers.map(t => ({ value: t, label: t }))} style={{ width: '100%' }} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>教室筛选</Text>
          <Select defaultValue="全部教室" options={rooms.map(r => ({ value: r, label: r }))} style={{ width: '100%' }} />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>科目筛选</Text>
          <Select defaultValue="全部科目" options={subjects.map(s => ({ value: s, label: s }))} style={{ width: '100%' }} />
        </div>
      </Space>
    </Card>
  )
}
