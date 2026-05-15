'use client'

import { useState } from 'react'
import { Card, Typography, Table, Tag, Select } from 'antd'

const { Title, Text } = Typography

interface GradeRow { key: string; student: string; course: string; score: number; type: string; date: string }

export function ParentGradesClient({
  gradeData, studentNames
}: {
  gradeData: GradeRow[]
  studentNames: string[]
}) {
  const [selectedChild, setSelectedChild] = useState<string>('all')

  const filtered = selectedChild === 'all' ? gradeData : gradeData.filter(g => g.student === selectedChild)

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>成绩查询</Title>
      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16 }}>
        <Select defaultValue="all" style={{ width: 180 }} onChange={v => setSelectedChild(v)}
          options={[{ value: 'all', label: '全部子女' }, ...studentNames.map(c => ({ value: c, label: c }))]} />
      </Card>
      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Table dataSource={filtered} rowKey="key" pagination={false} size="small"
          locale={{ emptyText: '暂无成绩记录' }}
          columns={[
            { title: '学员', dataIndex: 'student', key: 'student', render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: '课程', dataIndex: 'course', key: 'course' },
            { title: '成绩', dataIndex: 'score', key: 'score', render: (v: number) => <Text strong style={{ color: v >= 90 ? '#52c41a' : v >= 80 ? '#1677ff' : '#ff4d4f', fontSize: 16 }}>{v}分</Text> },
            { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => <Tag>{t}</Tag> },
            { title: '日期', dataIndex: 'date', key: 'date' },
            { title: '等级', key: 'level', render: (_: unknown, r: GradeRow) => {
              const lv = r.score >= 90 ? 'A' : r.score >= 80 ? 'B' : 'C'
              return <Tag color={lv === 'A' ? 'green' : lv === 'B' ? 'blue' : 'red'}>{lv}</Tag>
            }},
          ]} />
      </Card>
    </div>
  )
}
