'use client'

import { useMemo, useState } from 'react'
import { Button, Card, Empty, Input, List, Modal, QRCode, Space, Tag, Typography } from 'antd'
import { CopyOutlined, LinkOutlined, ReloadOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text, Paragraph } = Typography
const fetcher = (url: string) => fetch(url).then(async (response) => {
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || '加载失败')
  return payload
})

type ParentAccount = {
  id: string
  name: string
  email: string
  status: string
  lastLoginAt?: string | null
  students: Array<{ id: string; name: string; grade?: string | null }>
  activationTokens: Array<{ expiresAt: string }>
}

export default function ParentAccessPage() {
  const isMobile = useIsMobile()
  const { data, isLoading, mutate } = useSWR<{ accounts: ParentAccount[] }>('/api/admin/parent-activation', fetcher)
  const [keyword, setKeyword] = useState('')
  const [issuingId, setIssuingId] = useState<string>()
  const [issued, setIssued] = useState<{ activationUrl: string; expiresAt: string; parent: { name: string; email: string } } | null>(null)
  const accounts = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) return data?.accounts || []
    return (data?.accounts || []).filter((account) => [account.name, account.email, ...account.students.map((student) => student.name)].some((value) => value?.toLowerCase().includes(normalized)))
  }, [data, keyword])

  const issue = async (account: ParentAccount) => {
    setIssuingId(account.id)
    try {
      const response = await fetch('/api/admin/parent-activation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentUserId: account.id }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '生成失败')
      setIssued(payload)
      await mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败')
    } finally {
      setIssuingId(undefined)
    }
  }

  const copyLink = async () => {
    if (!issued) return
    await navigator.clipboard.writeText(issued.activationUrl)
    toast.success('激活链接已复制，可直接发给家长微信')
  }

  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1280, margin: '0 auto' }}>
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <div>
          <Title level={isMobile ? 3 : 2} style={{ marginBottom: 4 }}>家长便捷登录</Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>为家长生成一次性二维码或微信链接。家长核对孩子并设置密码后即可登录，无需管理员查看或发送明文密码。</Paragraph>
        </div>
        <Card>
          <Input allowClear size="large" prefix={<SearchOutlined />} placeholder="搜索家长账号、邮箱或孩子姓名" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        </Card>
        <Card title={`家长账号（${accounts.length}）`}>
          <List
            loading={isLoading}
            dataSource={accounts}
            locale={{ emptyText: <Empty description="暂无匹配账号" /> }}
            renderItem={(account) => (
              <List.Item
                style={{ alignItems: isMobile ? 'flex-start' : 'center', gap: 12 }}
                actions={[<Button key="issue" type="primary" ghost={!isMobile} icon={account.activationTokens.length ? <ReloadOutlined /> : <LinkOutlined />} loading={issuingId === account.id} onClick={() => issue(account)}>{account.activationTokens.length ? '重新生成' : '生成登录链接'}</Button>]}
              >
                <List.Item.Meta
                  avatar={<div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-primary-soft, #fff2eb)', display: 'grid', placeItems: 'center' }}><UserOutlined /></div>}
                  title={<Space wrap><span>{account.name || '家长'}</span><Tag color={account.status === 'active' ? 'green' : 'default'}>{account.status === 'active' ? '可登录' : account.status}</Tag>{account.activationTokens.length > 0 && <Tag color="orange">链接待使用</Tag>}</Space>}
                  description={<Space direction="vertical" size={2}><Text type="secondary">账号：{account.email}</Text><Text type="secondary">孩子：{account.students.map((student) => `${student.name}${student.grade ? `（${student.grade}）` : ''}`).join('、') || '尚未绑定'}</Text></Space>}
                />
              </List.Item>
            )}
          />
        </Card>
      </Space>

      <Modal open={Boolean(issued)} title="家长一次性激活入口" footer={null} onCancel={() => setIssued(null)} width={isMobile ? 'calc(100vw - 24px)' : 480}>
        {issued && <Space direction="vertical" align="center" size={16} style={{ width: '100%', textAlign: 'center' }}>
          <QRCode value={issued.activationUrl} size={isMobile ? 220 : 260} color="#1a1201" />
          <div><Title level={4} style={{ margin: 0 }}>{issued.parent.name || '家长'}</Title><Text type="secondary">{issued.parent.email}</Text></div>
          <Paragraph style={{ margin: 0 }}>请家长使用微信扫码，核对孩子姓名后设置自己的登录密码。链接在 7 天内有效且只能使用一次。</Paragraph>
          <Input.TextArea value={issued.activationUrl} autoSize readOnly />
          <Button type="primary" size="large" icon={<CopyOutlined />} block onClick={copyLink}>复制链接发到微信</Button>
          <Text type="secondary">重新生成会立即作废旧链接；不会修改家长当前密码。</Text>
        </Space>}
      </Modal>
    </div>
  )
}
