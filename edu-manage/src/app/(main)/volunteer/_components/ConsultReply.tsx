'use client'

import { Button, Input, Popconfirm, Space, Tag } from 'antd'
import { useState } from 'react'
import { toast } from 'sonner'

type Consultation = { id: string; question: string; reply?: string | null; isReplied: boolean; parent?: { name: string } }

export function ConsultReply({ item, onReplied }: { item: Consultation; onReplied: () => void }) {
  const [reply, setReply] = useState(item.reply || '')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!reply.trim()) return toast.error('请输入回复')
    setLoading(true)
    const res = await fetch(`/api/volunteer/consultation/${item.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    })
    setLoading(false)
    if (!res.ok) return toast.error('回复失败')
    toast.success('已回复')
    onReplied()
  }

  const remove = async () => {
    const res = await fetch(`/api/volunteer/consultation/${item.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('删除失败')
    toast.success('咨询已删除')
    onReplied()
  }

  return (
    <div style={{ padding: 12, borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
      <Space style={{ marginBottom: 8 }}>
        <span style={{ color: '#1F2329', fontWeight: 700 }}>{item.parent?.name || '家长'}</span>
        <Tag color={item.isReplied ? 'green' : 'orange'}>{item.isReplied ? '已回复' : '待回复'}</Tag>
      </Space>
      <div style={{ color: '#5a4e3a', marginBottom: 10 }}>{item.question}</div>
      <Input.TextArea value={reply} onChange={(event) => setReply(event.target.value)} autoSize={{ minRows: 2, maxRows: 4 }} maxLength={300} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Popconfirm title="删除这条咨询？" okText="删除" cancelText="取消" onConfirm={remove}>
          <Button danger>删除</Button>
        </Popconfirm>
        <Button type="primary" loading={loading} onClick={submit}>回复</Button>
      </div>
    </div>
  )
}
