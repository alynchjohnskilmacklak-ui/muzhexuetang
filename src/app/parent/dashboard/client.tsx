'use client'

import { Row, Col, Card, Statistic, Table, Tag, Typography, List } from 'antd'
import { UserOutlined, BookOutlined, DollarOutlined, TrophyOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface Child {
  id: string; name: string; courseNames: string[]; avgScore: number; totalGrades: number
}
interface FeeRow { studentName: string; amount: number; type: string; status: string; createdAt: Date }
interface UpcomingClass { key: string; course: string; student: string; time: string; teacher: string; room: string }
interface Stats { totalPaid: number; totalPending: number; avgScore: number; childrenCount: number }

export function ParentDashboardClient({
  childrenList, allFees, upcomingClasses, stats
}: {
  childrenList: Child[]
  allFees: FeeRow[]
  upcomingClasses: UpcomingClass[]
  stats: Stats
}) {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>家长首页</Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}><Card bordered={false}><Statistic title="子女数" value={stats.childrenCount} prefix={<UserOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card bordered={false}><Statistic title="平均成绩" value={stats.avgScore} suffix="分" prefix={<TrophyOutlined />} /></Card></Col>
        <Col xs={12} sm={6}><Card bordered={false}><Statistic title="已缴费" value={stats.totalPaid} prefix={<DollarOutlined />} suffix="元" valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={6}><Card bordered={false}><Statistic title="待缴费" value={stats.totalPending} prefix={<DollarOutlined />} suffix="元" valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card bordered={false} title="子女学习概况">
            {childrenList.length === 0 ? (
              <Text type="secondary">暂无绑定学员</Text>
            ) : (
              childrenList.map(child => (
                <Row key={child.id} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f5f5f5' }}>
                  <Col span={8}><Text strong style={{ fontSize: 16 }}>{child.name}</Text></Col>
                  <Col span={8}><Text type="secondary">课程：{child.courseNames.join('、') || '暂无'}</Text></Col>
                  <Col span={8}><Text type="secondary">成绩记录：{child.totalGrades}条</Text></Col>
                  <Col span={24} style={{ marginTop: 8 }}>
                    <span>均分 <Text strong style={{ color: '#1677ff' }}>{child.avgScore || '-'}分</Text></span>
                  </Col>
                </Row>
              ))
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card bordered={false} title="近期课程">
            <List dataSource={upcomingClasses} locale={{ emptyText: '暂无课程安排' }} renderItem={item => (
              <List.Item style={{ padding: '8px 0' }}>
                <div>
                  <div><Text strong>{item.course}</Text></div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined /> {item.time}</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>{item.teacher} | {item.room}</Text>
                  </div>
                </div>
              </List.Item>
            )} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card bordered={false} title="缴费记录">
            <Table dataSource={allFees.map((f, i) => ({ ...f, key: i }))} pagination={false} size="small"
              locale={{ emptyText: '暂无缴费记录' }}
              columns={[
                { title: '学员', dataIndex: 'studentName', key: 'student' },
                { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => <Text strong>¥{v}</Text> },
                { title: '类型', dataIndex: 'type', key: 'type' },
                { title: '日期', dataIndex: 'createdAt', key: 'date', render: (d: Date) => new Date(d).toLocaleDateString('zh-CN') },
                { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'paid' ? 'green' : 'orange'}>{s === 'paid' ? '已缴' : '待缴'}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
