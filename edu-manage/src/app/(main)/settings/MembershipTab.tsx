'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Input, Space, Spin, Typography, message } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DEFAULT_MEMBERSHIP_BENEFITS } from '@/data/membership-benefits-default'

const fetcher = (url: string) => fetch(url).then(response => response.json())
const { Title, Text } = Typography

export function MembershipTab() {
  const { data, isLoading, mutate } = useSWR('/api/settings', fetcher)
  const [content, setContent] = useState(DEFAULT_MEMBERSHIP_BENEFITS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) setContent(data.membershipBenefits?.trim() || DEFAULT_MEMBERSHIP_BENEFITS)
  }, [data])

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipBenefits: content }),
      })
      if (!response.ok) throw new Error('save failed')
      message.success('会员权益已更新')
      await mutate()
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card bordered={false} style={{ borderRadius: 10 }}>
        <Title level={4} style={{ marginTop: 0 }}>会员权益文案</Title>
        <Text type="secondary">支持 Markdown 与 GFM 表格，保存后家长端会员权益页立即使用新文案。</Text>
        <Input.TextArea value={content} onChange={event => setContent(event.target.value)} autoSize={{ minRows: 18, maxRows: 32 }} style={{ marginTop: 16, fontFamily: 'var(--font-geist-mono)' }} />
        <Space style={{ marginTop: 14 }} wrap>
          <Button type="primary" loading={saving} onClick={save} style={{ background: '#E8784A' }}>保存权益文案</Button>
          <Button onClick={() => setContent(DEFAULT_MEMBERSHIP_BENEFITS)}>恢复默认</Button>
        </Space>
      </Card>

      <Card bordered={false} style={{ borderRadius: 10 }} title="预览">
        <div className="membership-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </Card>
    </div>
  )
}
