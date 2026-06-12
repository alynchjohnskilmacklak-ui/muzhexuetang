'use client'

import { useState } from 'react'
import { Card, Descriptions, Tag, Typography, Empty, Avatar, Button, Form, Input, Modal } from 'antd'
import { UserOutlined, TeamOutlined, MailOutlined, CalendarOutlined, LockOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { toast } from 'sonner'

const { Title, Text } = Typography

export function ParentProfileClient({
  user, studentInfo,
}: {
  user: any
  studentInfo: any[]
}) {
  const [changingPwd, setChangingPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || '修改失败'); return }
      toast.success('密码已修改，下次登录请使用新密码')
      setChangingPwd(false)
      form.resetFields()
    } catch { toast.error('网络错误') }
    finally { setSubmitting(false) }
  }

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
        <div style={{ marginTop: 16 }}>
          <Button icon={<LockOutlined />} onClick={() => setChangingPwd(true)}>
            修改密码
          </Button>
        </div>
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

      <Modal
        open={changingPwd}
        onCancel={() => { setChangingPwd(false); form.resetFields() }}
        title="修改密码"
        footer={null}
        width={400}
        centered
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: 16 }}>
          <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password placeholder="输入当前密码" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '新密码至少6位' },
          ]}>
            <Input.Password placeholder="输入新密码（至少6位）" style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setChangingPwd(false); form.resetFields() }}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}
              style={{ background: '#E8784A', border: 'none', borderRadius: 8 }}>
              确认修改
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
