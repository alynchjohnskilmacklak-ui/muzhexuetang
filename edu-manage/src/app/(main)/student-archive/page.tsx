'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Card, Empty, Select, Space, Spin, Table, Tag, Typography } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, FileSearchOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'

const { Text } = Typography

type CompletenessItem = {
  studentId: string
  name: string
  grade: string | null
  mainTeacherName: string | null
  hasGrade: boolean
  hasFeedback: boolean
  hasSummary: boolean
  missingCount: number
}

type CompletenessPayload = {
  summary: { noGrade: number; noFeedback: number; noSummary: number }
  items: CompletenessItem[]
}

const fetcher = (url: string) => fetch(url).then(async (res) => {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
})

function StatusDot({ ok, text }: { ok: boolean; text: string }) {
  return (
    <Tag
      color={ok ? 'green' : 'red'}
      icon={ok ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
      style={{ borderRadius: 9999 }}
    >
      {ok ? `${text}齐` : `缺${text}`}
    </Tag>
  )
}

export default function StudentArchiveDashboardPage() {
  const [months, setMonths] = useState(1)
  const { data, isLoading } = useSWR<CompletenessPayload>(`/api/admin/profile-completeness?months=${months}`, fetcher)

  return (
    <PageLayout title="学情档案总览" subtitle="按月检查成绩、课堂反馈与阶段小结是否补齐">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card bordered={false} style={{ borderRadius: 8, border: '1px solid #EEE7E1' }}>
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size={12} wrap>
              {[
                { label: '本期无成绩', value: data?.summary.noGrade ?? 0, color: '#E8784A' },
                { label: '本期无反馈', value: data?.summary.noFeedback ?? 0, color: '#534AB7' },
                { label: '本期无小结', value: data?.summary.noSummary ?? 0, color: '#E24B4A' },
              ].map((item) => (
                <div key={item.label} style={{ minWidth: 140 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                  <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </Space>
            <Select
              value={months}
              onChange={setMonths}
              style={{ width: 128 }}
              options={[
                { label: '近 1 个月', value: 1 },
                { label: '近 3 个月', value: 3 },
                { label: '近 6 个月', value: 6 },
                { label: '近 12 个月', value: 12 },
              ]}
            />
          </Space>
        </Card>

        <Card bordered={false} style={{ borderRadius: 8, border: '1px solid #EEE7E1' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
          ) : !data?.items.length ? (
            <Empty description="暂无学员数据" />
          ) : (
            <Table<CompletenessItem>
              rowKey="studentId"
              dataSource={data.items}
              pagination={{ pageSize: 20 }}
              columns={[
                {
                  title: '学员',
                  dataIndex: 'name',
                  render: (_, record) => (
                    <Space direction="vertical" size={0}>
                      <Link href={`/student-archive/${record.studentId}`} style={{ fontWeight: 700, color: '#1F2329' }}>
                        {record.name}
                      </Link>
                      <Text type="secondary" style={{ fontSize: 12 }}>{record.grade || '未设年级'}</Text>
                    </Space>
                  ),
                },
                {
                  title: '主教师',
                  dataIndex: 'mainTeacherName',
                  render: (value) => value || <Text type="secondary">未分配</Text>,
                },
                {
                  title: '完整度',
                  render: (_, record) => (
                    <Space wrap>
                      <StatusDot ok={record.hasGrade} text="成绩" />
                      <StatusDot ok={record.hasFeedback} text="反馈" />
                      <StatusDot ok={record.hasSummary} text="小结" />
                    </Space>
                  ),
                },
                {
                  title: '操作',
                  width: 130,
                  render: (_, record) => (
                    <Link href={`/student-archive/${record.studentId}`}>
                      <FileSearchOutlined /> 查看档案
                    </Link>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </Space>
    </PageLayout>
  )
}
