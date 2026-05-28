'use client'

import { Card, Descriptions, Tag, Typography, Empty, Avatar } from 'antd'
import { UserOutlined, TeamOutlined, MailOutlined, CalendarOutlined } from '@ant-design/icons'
import { format } from 'date-fns'

const { Title, Text } = Typography

export function ParentProfileClient({
  user, studentInfo,
}: {
  user: any
  studentInfo: any[]
}) {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>个人中心</Title>

      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#E8784A', fontSize: 24 }} />
          <div>
            <Title level={5} style={{ margin: 0 }}>{user.name}</Title>
            <Text type="secondary">{user.role === 'parent' ? '家长' : user.role}</Text>
          </div>
        </div>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
          <Descriptions.Item label={<><MailOutlined /> 账号邮箱</>}>{user.email}</Descriptions.Item>
          <Descriptions.Item label={<><CalendarOutlined /> 注册时间</>}>
            {format(new Date(user.createdAt), 'yyyy-MM-dd')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        bordered={false}
        style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}
        title={<span style={{ fontSize: 15, fontWeight: 600 }}><TeamOutlined style={{ marginRight: 6 }} />子女信息</span>}
      >
        {studentInfo.length === 0 ? (
          <Empty description="暂无绑定学生" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          studentInfo.map(s => (
            <Card
              key={s.id}
              bordered={false}
              style={{ borderRadius: 10, background: '#FFFBF7', border: '1px solid #FBF0EA', marginBottom: 12 }}
              bodyStyle={{ padding: '14px 18px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: 'rgba(232,120,74,.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 600, color: '#E8784A',
                }}>
                  {s.name[0]}
                </div>
                <div>
                  <Text strong style={{ fontSize: 15, color: '#1F2933' }}>{s.name}</Text>
                  <div style={{ fontSize: 12, color: '#7A869A', marginTop: 2 }}>
                    {[s.grade, s.school].filter(Boolean).join(' · ') || '暂无学校信息'}
                  </div>
                </div>
              </div>
              {s.teachers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>授课老师：</Text>
                  {s.teachers.map((t: string) => (
                    <Tag key={t} color="orange" style={{ borderRadius: 9999 }}>{t}</Tag>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </Card>
    </div>
  )
}
