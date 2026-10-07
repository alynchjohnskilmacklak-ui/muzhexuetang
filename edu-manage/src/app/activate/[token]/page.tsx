'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Alert, Button, Card, Form, Input, Result, Space, Spin, Tag, Typography } from 'antd'
import { CheckCircleOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

type ActivationInfo = {
  parent: { name?: string | null; email: string }
  students: Array<{ id: string; name: string; grade?: string | null }>
  expiresAt: string
}

export default function ParentActivationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [info, setInfo] = useState<ActivationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form] = Form.useForm()

  useEffect(() => {
    fetch(`/api/auth/activate/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '链接无效')
        setInfo(payload)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : '链接无效'))
      .finally(() => setLoading(false))
  }, [token])

  const activate = async () => {
    if (!info) return
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      const response = await fetch(`/api/auth/activate/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: values.password }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '设置失败')
      const signedIn = await signIn('credentials', {
        email: payload.email,
        password: values.password,
        loginRole: 'parent',
        division: payload.division,
        redirect: false,
      })
      if (!signedIn?.ok) throw new Error('密码设置成功，请返回登录页登录')
      router.replace('/parent/dashboard')
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '设置失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ minHeight: '100dvh', background: '#faf8f5', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: 'min(100%, 520px)', borderRadius: 20, boxShadow: '0 18px 60px rgba(65, 44, 26, .12)' }}>
        {loading ? <div style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}><Spin size="large" tip="正在核对登录信息" /></div> : !info ? (
          <Result status="warning" title="链接已失效" subTitle={error || '请联系牧哲学堂管理员重新生成家长登录链接'} extra={<Button type="primary" onClick={() => router.push('/login')}>返回登录页</Button>} />
        ) : (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, margin: '0 auto 14px', borderRadius: 18, background: '#fff2eb', display: 'grid', placeItems: 'center', color: '#E8784A', fontSize: 30 }}><SafetyCertificateOutlined /></div>
              <Title level={2} style={{ margin: 0 }}>欢迎加入牧哲学堂</Title>
              <Paragraph type="secondary" style={{ marginTop: 8 }}>首次只需核对孩子并设置密码，以后使用账号即可直接登录。</Paragraph>
            </div>
            <Card size="small" style={{ background: '#fffbf7' }}>
              <Space direction="vertical" size={8}>
                <Text strong>{info.parent.name || '家长'} · {info.parent.email}</Text>
                <Space wrap>{info.students.map((student) => <Tag color="orange" key={student.id}>{student.name}{student.grade ? ` · ${student.grade}` : ''}</Tag>)}</Space>
              </Space>
            </Card>
            <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="请确认以上是您的孩子" description="若孩子信息不正确，请不要继续设置，联系管理员核对绑定关系。" />
            {error && <Alert type="error" showIcon message={error} closable onClose={() => setError('')} />}
            <Form form={form} layout="vertical" onFinish={activate}>
              <Form.Item name="password" label="设置登录密码" rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '至少 8 位' }, { pattern: /^(?=.*[A-Za-z]).+$/, message: '需要包含英文字母' }]}>
                <Input.Password size="large" prefix={<LockOutlined />} placeholder="至少 8 位，包含英文字母" autoComplete="new-password" />
              </Form.Item>
              <Form.Item name="confirm" label="再次输入密码" dependencies={['password']} rules={[{ required: true, message: '请再次输入密码' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('两次密码不一致')) } })]}>
                <Input.Password size="large" prefix={<LockOutlined />} placeholder="请再次输入" autoComplete="new-password" />
              </Form.Item>
              <Button htmlType="submit" type="primary" size="large" block loading={submitting}>设置完成并登录</Button>
            </Form>
            <Text type="secondary" style={{ textAlign: 'center', fontSize: 12 }}>链接只能使用一次；系统不会向管理员展示您设置的密码。</Text>
          </Space>
        )}
      </Card>
    </main>
  )
}
