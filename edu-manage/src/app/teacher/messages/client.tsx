'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Avatar, Badge, Button, Drawer, Empty, Input,
  Select, Tag, Typography,
} from 'antd'
import {
  CheckCircleOutlined, CloseOutlined,
  MessageOutlined, SendOutlined, UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import useSWR from 'swr'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SUBJECT_COLORS } from '@/constants/subjects'
import { fmtDateTime } from '@/lib/format-date'

const { Text, Title } = Typography
const { TextArea } = Input
const fetcher = (url: string) => fetch(url).then(r => r.json())

type Reply = {
  id: string; authorName: string; role: string
  content: string; isReadByTeacher: boolean; createdAt: string
}
type Message = {
  id: string; title: string; subject: string | null; status: string
  parent: { id: string; name: string }
  student: { id: string; name: string } | null
  replies: Reply[]
  updatedAt: string
}

function unreadCount(msg: Message) {
  return msg.replies.filter(r => !r.isReadByTeacher && r.role === 'parent').length
}

function ChatBubble({ reply }: { reply: Reply }) {
  const isTeacher = reply.role !== 'parent'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isTeacher ? 'row-reverse' : 'row',
      gap: 8, alignItems: 'flex-end', marginBottom: 16,
    }}>
      <Avatar size={32} icon={<UserOutlined />}
        style={{ background: isTeacher ? '#1D9E75' : '#E8784A', flexShrink: 0 }}>
        {reply.authorName.slice(0, 1)}
      </Avatar>
      <div style={{ maxWidth: '70%' }}>
        <div style={{ fontSize: 11, color: '#9a8e7a', marginBottom: 4, textAlign: isTeacher ? 'right' : 'left' }}>
          {reply.authorName} · {fmtDateTime(reply.createdAt)}
        </div>
        <div style={{
          background: isTeacher ? '#1D9E75' : '#fff',
          color: isTeacher ? '#fff' : '#1a1201',
          border: isTeacher ? 'none' : '1px solid rgba(0,0,0,.08)',
          borderRadius: isTeacher ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
          boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {reply.content}
        </div>
      </div>
    </div>
  )
}

function MessageCard({ msg, onClick, active }: { msg: Message; onClick: () => void; active: boolean }) {
  const unread = unreadCount(msg)
  const lastReply = msg.replies[msg.replies.length - 1]
  const subjectColor = msg.subject ? SUBJECT_COLORS[msg.subject] : null
  return (
    <div onClick={onClick} style={{
      background: active ? '#F0F9F5' : '#fff',
      border: active ? '1.5px solid #1D9E75' : '1px solid rgba(0,0,0,.07)',
      borderRadius: 12, padding: '14px 16px',
      cursor: 'pointer', transition: 'all .18s ease', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <Text strong style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>{msg.title}</Text>
        {unread > 0 && <Badge count={unread} size="small" />}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#FFF6F1', color: '#E8784A', border: 'none' }}>
          {msg.parent.name}
        </Tag>
        {msg.student && (
          <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#f5f5f5', color: '#5a4e3a', border: 'none' }}>
            {msg.student.name}
          </Tag>
        )}
        {msg.subject && subjectColor && (
          <Tag style={{ borderRadius: 9999, fontSize: 11, border: 'none', background: subjectColor.bg, color: subjectColor.color }}>
            {msg.subject}
          </Tag>
        )}
        <Tag style={{
          marginLeft: 'auto', borderRadius: 9999, fontSize: 11,
          background: msg.status === 'CLOSED' ? '#f5f5f5' : '#F0F9F5',
          color: msg.status === 'CLOSED' ? '#999' : '#1D9E75', border: 'none',
        }}>
          {msg.status === 'CLOSED' ? '已关闭' : '进行中'}
        </Tag>
      </div>
      {lastReply && (
        <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
          {lastReply.role === 'parent' ? `${lastReply.authorName}：` : '我：'}{lastReply.content}
        </Text>
      )}
    </div>
  )
}

export function TeacherMessagesClient() {
  const isMobile = useIsMobile() ?? false
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [closing, setClosing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, mutate } = useSWR('/api/messages', fetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const allMessages: Message[] = data?.messages || []
  const messages = allMessages.filter(m => filter === 'ALL' || m.status === filter)
  const active = allMessages.find(m => m.id === activeId) || null

  useEffect(() => {
    if (active) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [active?.replies.length])

  const handleSelect = async (id: string) => {
    setActiveId(id)
    await fetch(`/api/messages/${id}`)
    mutate()
  }

  const handleReply = async () => {
    if (!activeId || !replyText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/messages/${activeId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim() }),
      })
      if (!res.ok) { toast.error('发送失败'); return }
      setReplyText('')
      mutate()
    } catch { toast.error('网络错误') }
    finally { setSubmitting(false) }
  }

  const handleClose = async () => {
    if (!activeId) return
    setClosing(true)
    try {
      await fetch(`/api/messages/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      })
      toast.success('已关闭留言')
      mutate()
    } catch { toast.error('操作失败') }
    finally { setClosing(false) }
  }

  const chatPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {active && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,.07)', background: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text strong style={{ fontSize: 15, flex: 1 }}>{active.title}</Text>
            {active.status === 'OPEN' && (
              <Button size="small" onClick={handleClose} loading={closing}
                style={{ borderRadius: 8, fontSize: 12 }}>
                关闭留言
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#FFF6F1', color: '#E8784A', border: 'none' }}>
              {active.parent.name} 家长
            </Tag>
            {active.student && (
              <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#f5f5f5', color: '#5a4e3a', border: 'none' }}>
                学员：{active.student.name}
              </Tag>
            )}
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', background: '#faf8f5' }}>
        {!active ? (
          <Empty description="选择留言开始回复" style={{ marginTop: 80 }} />
        ) : (
          <>
            {active.replies.map(r => <ChatBubble key={r.id} reply={r} />)}
            <div ref={bottomRef} />
          </>
        )}
      </div>
      {active && active.status === 'OPEN' && (
        <div style={{
          padding: '12px 16px', background: '#fff',
          borderTop: '1px solid rgba(0,0,0,.07)', flexShrink: 0,
          display: 'flex', gap: 8, alignItems: 'flex-end',
        }}>
          <TextArea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="回复家长..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
            style={{ borderRadius: 10, flex: 1, resize: 'none' }}
          />
          <Button type="primary" icon={<SendOutlined />} loading={submitting}
            disabled={!replyText.trim()} onClick={handleReply}
            style={{ background: '#1D9E75', border: 'none', borderRadius: 10, height: 36 }}
          />
        </div>
      )}
      {active && active.status === 'CLOSED' && (
        <div style={{ padding: '10px 16px', background: '#f9f9f9', borderTop: '1px solid rgba(0,0,0,.07)', textAlign: 'center', flexShrink: 0 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <CheckCircleOutlined style={{ marginRight: 6 }} />该留言已关闭
          </Text>
        </div>
      )}
    </div>
  )

  const filterBar = (
    <Select value={filter} onChange={v => setFilter(v as typeof filter)}
      style={{ width: 100, borderRadius: 8 }} size="small">
      <Select.Option value="ALL">全部</Select.Option>
      <Select.Option value="OPEN">进行中</Select.Option>
      <Select.Option value="CLOSED">已关闭</Select.Option>
    </Select>
  )

  if (isMobile) {
    return (
      <div style={{ padding: '0 0 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ marginBottom: 2 }}>家长留言</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>查看并回复家长提问</Text>
          </div>
          {filterBar}
        </div>
        {messages.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '48px 24px', textAlign: 'center', border: '1px solid rgba(0,0,0,.06)' }}>
            <MessageOutlined style={{ fontSize: 40, color: '#1D9E75', opacity: .4, marginBottom: 12 }} />
            <div style={{ fontSize: 15, color: '#5a4e3a' }}>暂无留言</div>
          </div>
        ) : messages.map(msg => (
          <MessageCard key={msg.id} msg={msg} onClick={() => handleSelect(msg.id)} active={false} />
        ))}
        <Drawer
          open={!!activeId} onClose={() => setActiveId(null)}
          placement="bottom" height="85vh"
          title={null} closable={false}
          bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
          headerStyle={{ display: 'none' }}
          style={{ borderRadius: '16px 16px 0 0' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,.07)',
            background: '#fff', borderRadius: '16px 16px 0 0',
          }}>
            <Text strong>回复留言</Text>
            <button onClick={() => setActiveId(null)} style={{
              width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(0,0,0,.1)',
              background: '#f5f5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CloseOutlined style={{ fontSize: 12 }} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {chatPanel}
          </div>
        </Drawer>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 2 }}>家长留言</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>查看并回复家长提问</Text>
        </div>
        {filterBar}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, height: 'calc(100vh - 160px)' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(0,0,0,.06)', flexShrink: 0 }}>
            <Text strong style={{ fontSize: 14, color: '#5a4e3a' }}>留言列表</Text>
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>（{messages.length}条）</Text>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '12px 12px' }}>
            {messages.length === 0 ? (
              <Empty description="暂无留言" style={{ marginTop: 60 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : messages.map(msg => (
              <MessageCard key={msg.id} msg={msg} onClick={() => handleSelect(msg.id)} active={msg.id === activeId} />
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {chatPanel}
        </div>
      </div>
    </div>
  )
}
