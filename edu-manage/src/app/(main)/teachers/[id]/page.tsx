'use client'

import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card, Col, Descriptions, Empty, Row, Space, Spin, Statistic, Tag } from 'antd'
import { ArrowLeftOutlined, CalendarOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { materialAudienceLabel, materialStatusLabel } from '@/lib/material-format'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

export default function TeacherDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: teacher, isLoading } = useSWR(params.id ? `/api/teachers/${params.id}` : null, fetcher)

  if (isLoading) return <PageLayout title="教师详情"><div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div></PageLayout>
  if (!teacher) return <PageLayout title="教师详情"><Empty description="教师不存在" /></PageLayout>

  const subjects = String(teacher.subjects || '').split(',').filter(Boolean)

  return (
    <PageLayout
      title={teacher.name}
      subtitle={`${teacher.employmentType === 'FULL_TIME' ? '全职' : '兼职'} · ${teacher.phone || '未填写电话'}`}
      actions={<Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/teachers')}>返回教师管理</Button>}
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><Metric title="负责学员" value={teacher._count?.students || 0} /></Col>
        <Col xs={12} lg={6}><Metric title="排课数" value={teacher._count?.schedules || 0} /></Col>
        <Col xs={12} lg={6}><Metric title="月课时" value={teacher.monthlyHours || 0} /></Col>
        <Col xs={12} lg={6}><Metric title="评分" value={teacher.rating || 0} /></Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Descriptions column={2} size="small" labelStyle={{ color: '#98A2B3' }} contentStyle={{ color: '#1F2329' }}>
          <Descriptions.Item label="姓名">{teacher.name}</Descriptions.Item>
          <Descriptions.Item label="电话">{teacher.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{teacher.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">{teacher.status || '-'}</Descriptions.Item>
          <Descriptions.Item label="学历">{teacher.education || '-'}</Descriptions.Item>
          <Descriptions.Item label="毕业院校">{teacher.university || '-'}</Descriptions.Item>
          <Descriptions.Item label="专业">{teacher.major || '-'}</Descriptions.Item>
          <Descriptions.Item label="科目">
            <Space wrap>{subjects.map((subject) => <Tag key={subject}>{subject}</Tag>)}</Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: '#1F2329' }}><TeamOutlined /> 关联学员</span>} bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            {teacher.students?.length ? teacher.students.map((student: Record<string, unknown>) => (
              <div key={student.id as string} style={{ color: '#5a4e3a', padding: '8px 0', borderBottom: '1px solid #EEE7E1' }}>{student.name as string}</div>
            )) : <Empty description="暂无关联学员" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: '#1F2329' }}><CalendarOutlined /> 对应班级课程</span>} bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            {teacher.classGroups?.length ? teacher.classGroups.map((group: Record<string, unknown>) => (
              <div key={group.id as string} style={{ color: '#5a4e3a', padding: '8px 0', borderBottom: '1px solid #EEE7E1' }}>
                <div style={{ color: '#1F2329' }}>{group.name as string}</div>
                <div style={{ color: '#98A2B3', fontSize: 12 }}>
                  {(group.course as Record<string, unknown> | undefined)?.name as string || '-'} · 学员 {((group.enrollments as unknown[]) || []).length} 人
                </div>
              </div>
            )) : <Empty description="暂无对应班级" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: '#1F2329' }}><FileTextOutlined /> 教师上传资料</span>}
        extra={<Button type="link" onClick={() => router.push(`/materials?teacherId=${params.id}`)}>查看全部资料</Button>}
        bordered={false}
        style={{ borderRadius: 8, marginTop: 16, background: '#ffffff', border: '1px solid #EEE7E1' }}
      >
        {teacher.studyMaterials?.length ? teacher.studyMaterials.map((material: Record<string, unknown>) => (
          <div key={material.id as string} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #EEE7E1', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ color: '#1F2329', fontWeight: 600 }}>{material.title as string}</div>
              <div style={{ color: '#98A2B3', fontSize: 12 }}>{material.grade as string} · {material.subject as string} · {new Date(material.createdAt as string).toLocaleDateString('zh-CN')}</div>
            </div>
            <Tag>{materialAudienceLabel(material.audience as string)}</Tag>
            <Tag color={(material.status as string) === 'PUBLISHED' ? 'success' : 'default'}>{materialStatusLabel(material.status as string)}</Tag>
          </div>
        )) : <Empty description="暂无教师上传资料" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </Card>
    </PageLayout>
  )
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
      <Statistic title={<span style={{ color: '#98A2B3' }}>{title}</span>} value={value} valueStyle={{ color: '#1F2329' }} />
    </Card>
  )
}
