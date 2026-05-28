'use client'

import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card, Col, Descriptions, Empty, Progress, Row, Spin, Statistic, Table, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { formatHours } from '@/lib/format'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: student, isLoading } = useSWR(params.id ? `/api/students/${params.id}` : null, fetcher)

  if (isLoading) return <PageLayout title="学员详情"><div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div></PageLayout>
  if (!student) return <PageLayout title="学员详情"><Empty description="学员不存在" /></PageLayout>

  const remainHours = Number(student.remainHours || 0)
  const totalHours = Number(student.totalHours || 0)
  const usedHours = Math.max(0, totalHours - remainHours)

  return (
    <PageLayout
      title={student.name}
      subtitle={`${student.grade || '未设年级'} · ${student.school || '未填写学校'} · ${student.status || '-'}`}
      actions={<Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/students')}>返回学员管理</Button>}
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><Metric title="剩余课时" value={formatHours(remainHours)} /></Col>
        <Col xs={12} lg={6}><Metric title="总课时" value={formatHours(totalHours)} /></Col>
        <Col xs={12} lg={6}><Metric title="考勤记录" value={student.attendances?.length || 0} /></Col>
        <Col xs={12} lg={6}><Metric title="缴费记录" value={student.fees?.length || 0} /></Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Descriptions column={2} size="small" labelStyle={{ color: '#98A2B3' }} contentStyle={{ color: '#1F2329' }}>
          <Descriptions.Item label="姓名">{student.name}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag>{student.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="电话">{student.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="家长">{student.parentName || student.parent?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="家长电话">{student.parentPhone || '-'}</Descriptions.Item>
          <Descriptions.Item label="主教老师">{student.mainTeacher?.name || '-'}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 18 }}>
          <div style={{ color: '#98A2B3', marginBottom: 6 }}>课时进度</div>
          <Progress percent={totalHours ? Math.round((usedHours / totalHours) * 100) : 0} strokeColor="#5e6ad2" />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="考勤记录" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={student.attendances || []}
              columns={[
                { title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag> },
                { title: '扣课时', dataIndex: 'hoursDeducted', render: (value: number) => formatHours(value) },
                { title: '日期', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleDateString('zh-CN') },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="缴费记录" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8 }}
              dataSource={student.fees || []}
              columns={[
                { title: '类型', dataIndex: 'type' },
                { title: '金额', dataIndex: 'amount' },
                { title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </PageLayout>
  )
}

function Metric({ title, value }: { title: string; value: number | string }) {
  return (
    <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
      <Statistic title={<span style={{ color: '#98A2B3' }}>{title}</span>} value={value} valueStyle={{ color: '#1F2329' }} />
    </Card>
  )
}
