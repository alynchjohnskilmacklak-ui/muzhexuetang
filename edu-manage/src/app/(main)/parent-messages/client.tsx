'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Badge, Button, Empty, Input, Select, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined, SendOutlined, SearchOutlined,
  MessageOutlined, UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { usePausableSWR } from '@/lib/use-pausable-swr'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SUBJECT_COLORS } from '@/constants/subjects'

const { Text, Title } = Typography
const { TextArea } = Input
const fetcher = (url: string) => fetch(url).then(r => r.json())

const ADMIN = '#534AB7'
const PARENT = '#E8784A'
const TEACHER = '#1D9E75'

type Reply = { id: string; authorName: string; role: string; content: string; isReadByTeacher: boolean; createdAt: string }
type Message = {
  id: string; title: string; subject: string | null; status: string
  parent: { id: string; name: string }
  teacher: { id: string; name: string } | null
  student: { id: string; name: string } | null
  replies: Reply[]; updatedAt: string
}

const unreadCount = (m: Message) => m.replies.filter(r => !r.isReadByTeacher && r.role === 'parent').length

function ChatBubble({ reply }: { reply: Reply }) {
  const isParent = reply.role === 'parent'
  const color = reply.role === 'parent' ? PARENT : reply.role === 'teacher' ? TEACHER : ADMIN
  const roleLabel = reply.role === 'admin' ? '管理员' : reply.role === 'teacher' ? '老师' : '家长'
  return (
    <div style={{ display: 'flex', flexDirection: isParent ? 'row' : 'row-reverse', gap: 8, alignItems: 'flex-end', marginBottom: 16 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>
        {reply.authorName.slice(0, 1)}
      </div>
      <div style={{ maxWidth: '72%' }}>
        <div style={{ fontSize: 11, color: '#9a8e7a', marginBottom: 4, textAlign: isParent ? 'left' : 'right' }}>
          {reply.authorName}（{roleLabel}） · {format(new Date(reply.createdAt), 'MM-dd HH:mm')}
        </div>
        <div style={{
          background: isParent ? '#fff' : color,
          color: isParent ? '#1a1201' : '#fff',
          border: isParent ? '1px solid rgba(0,0,0,.08)' : 'none',
          borderRadius: isParent ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
          boxShadow: '0 2px 8px rgba(0,0,0,.05)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>{reply.content}</div>
      </div>
    </div>
  )
}

function ConversationItem({ msg, onClick, active }: { msg: Message; onClick: () => void; active: boolean }) {
  const unread = unreadCount(msg)
  const last = msg.replies[msg.replies.length - 1]
  const sc = msg.subject ? SUBJECT_COLORS[msg.subject] : null
  return (
    <div onClick={onClick} style={{
      background: active ? '#F4F3FE' : '#fff',
      borderLeft: active ? `3px solid ${ADMIN}` : '3px solid transparent',
      borderBottom: '1px solid rgba(0,0,0,.05)',
      padding: '12px 14px', cursor: 'pointer', transition: 'background .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: PARENT, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>
          {msg.parent.name.slice(0, 1)}
        </div>
        <Text strong style={{ flex: 1, fontSize: 14 }} ellipsis>{msg.parent.name}</Text>
        {unread > 0 && <Badge count={unread} size="small" />}
        {msg.status === 'CLOSED' && <Tag style={{ margin: 0, fontSize: 10, borderRadius: 9999, background: '#f5f5f5', color: '#999', border: 'none' }}>已关闭</Tag>}
      </div>
      <Text style={{ fontSize: 13, color: '#3a3320', display: 'block', marginBottom: 4 }} ellipsis>{msg.title}</Text>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {msg.teacher && <Tag style={{ margin: 0, fontSize: 10, borderRadius: 9999, background: '#F0F9F5', color: TEACHER, border: 'none' }}>{msg.teacher.name}</Tag>}
        {msg.subject && sc && <Tag style={{ margin: 0, fontSize: 10, borderRadius: 9999, background: sc.bg, color: sc.color, border: 'none' }}>{msg.subject}</Tag>}
        {msg.student && <Tag style={{ margin: 0, fontSize: 10, borderRadius: 9999, background: '#f5f2ee', color: '#8a7e6a', border: 'none' }}>{msg.student.name}</Tag>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#bbb' }}>
          {formatDistanceToNow(new Date(msg.updatedAt), { addSuffix: true, locale: zhCN })}
        </span>
      </div>
      {last && <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }} ellipsis>{last.authorName}：{last.content}</Text>}
    </div>
  )
}

export function AdminMessagesClient() {
  const isMobile = useIsMobile() ?? false
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [search, setSearch] = useState('')
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [closing, setClosing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, mutate } = usePausableSWR('/api/messages', fetcher, {
    refreshInterval: 5_000, revalidateOnFocus: true, revalidateOnReconnect: true,
  })
  const allMessages: Message[] = data?.messages || []

  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>()
    allMessages.forEach(m => { if (m.teacher) map.set(m.teacher.id, m.teacher.name) })
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [allMessages])

  const stats = useMemo(() => ({
    total: allMessages.length,
    open: allMessages.filter(m => m.status === 'OPEN').length,
    unread: allMessages.reduce((s, m) => s + unreadCount(m), 0),
  }), [allMessages])

  const messages = useMemo(() => {
    const kw = search.trim()
    return allMessages
      .filter(m => filter === 'ALL' || m.status === filter)
      .filter(m => !teacherFilter || m.teacher?.id === teacherFilter)
      .filter(m => !kw || `${m.title} ${m.parent.name} ${m.teacher?.name || ''} ${m.student?.name || ''} ${m.subject || ''}`.includes(kw) || m.replies.some(r => r.content.includes(kw)))
      .sort((a, b) => {
        const ua = unreadCount(a), ub = unreadCount(b)
        if (ua !== ub) return ub - ua
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [allMessages, filter, teacherFilter, search])

  const active = allMessages.find(m => m.id === activeId) || null

  useEffect(() => {
    if (active) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [active?.replies.length, active])

  const handleSelect = async (id: string) => { setActiveId(id); await fetch(`/api/messages/${id}`); mutate() }

  const handleReply = async () => {
    if (!activeId || !replyText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/messages/${activeId}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim() }),
      })
      if (!res.ok) { toast.error('发送失败'); return }
      setReplyText(''); mutate()
    } catch { toast.error('网络错误') } finally { setSubmitting(false) }
  }

  const handleClose = async () => {
    if (!activeId) return
    setClosing(true)
    try {
      await fetch(`/api/messages/${activeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      })
      toast.success('已关闭'); mutate()
    } catch { toast.error('操作失败') } finally { setClosing(false) }
  }

  const statCards = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
      {[
        { label: '沟通总数', value: stats.total, color: ADMIN, bg: '#F4F3FE' },
        { label: '进行中', value: stats.open, color: PARENT, bg: '#FFF6F1' },
        { label: '待处理', value: stats.unread, color: '#E24B4A', bg: '#FDECEC' },
      ].map(c => (
        <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 2 }}>{c.label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
        </div>
      ))}
    </div>
  )

  const filterBar = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      <Input prefix={<SearchOutlined style={{ color: '#bbb' }} />} placeholder="搜索家长/老师/学员/内容"
        value={search} onChange={e => setSearch(e.target.value)} allowClear
        style={{ flex: 1, minWidth: 160, borderRadius: 8 }} />
      <Select allowClear placeholder="按老师" value={teacherFilter || undefined}
        onChange={v => setTeacherFilter(v || '')} options={teacherOptions} style={{ width: 130 }}
        showSearch filterOption={(i, o) => String(o?.label || '').includes(i)} />
      <Select value={filter} onChange={v => setFilter(v)} style={{ width: 110 }}
        options={[{ value: 'ALL', label: '全部状态' }, { value: 'OPEN', label: '进行中' }, { value: 'CLOSED', label: '已关闭' }]} />
    </div>
  )

  const conversationList = (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {messages.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <MessageOutlined style={{ fontSize: 36, color: ADMIN, opacity: .25, marginBottom: 12 }} />
          <Empty description={search || teacherFilter ? '没有匹配的会话' : '暂无留言'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : messages.map(m => (
        <ConversationItem key={m.id} msg={m} active={m.id === activeId} onClick={() => handleSelect(m.id)} />
      ))}
    </div>
  )

  const chatPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!active ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c4bab0' }}>
          <MessageOutlined style={{ fontSize: 48, marginBottom: 16, opacity: .3 }} />
          <Text type="secondary">选择左侧会话查看详情</Text>
        </div>
      ) : (
        <>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,.07)', background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: 15, flex: 1 }}>{active.title}</Text>
              {active.status === 'OPEN' && <Button size="small" onClick={handleClose} loading={closing} style={{ borderRadius: 8, fontSize: 12 }}>关闭会话</Button>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#FFF6F1', color: PARENT, border: 'none' }}><UserOutlined /> {active.parent.name}</Tag>
              {active.teacher && <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#F0F9F5', color: TEACHER, border: 'none' }}>{active.teacher.name} 老师</Tag>}
              {active.student && <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#f5f2ee', color: '#8a7e6a', border: 'none' }}>学员：{active.student.name}</Tag>}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', background: '#faf8f5' }}>
            {active.replies.map(r => <ChatBubble key={r.id} reply={r} />)}
            <div ref={bottomRef} />
          </div>
          {active.status === 'OPEN' ? (
            <div style={{ padding: '12px 18px', background: '#fff', borderTop: '1px solid rgba(0,0,0,.07)', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <TextArea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="以管理员身份回复（Enter 发送，Shift+Enter 换行）"
                autoSize={{ minRows: 1, maxRows: 4 }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
                style={{ borderRadius: 10, flex: 1, resize: 'none' }} />
              <Button type="primary" icon={<SendOutlined />} loading={submitting} disabled={!replyText.trim()} onClick={handleReply}
                style={{ background: ADMIN, border: 'none', borderRadius: 10, height: 36 }} />
            </div>
          ) : (
            <div style={{ padding: '10px 18px', background: '#f9f9f9', borderTop: '1px solid rgba(0,0,0,.07)', textAlign: 'center', flexShrink: 0 }}>
              <Text type="secondary" style={{ fontSize: 13 }}><CheckCircleOutlined style={{ marginRight: 6 }} />该会话已关闭</Text>
            </div>
          )}
        </>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ paddingBottom: 20 }}>
        <Title level={4} style={{ marginBottom: 2 }}>家长沟通监控</Title>
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 14 }}>查看全部教师与家长留言，可随时介入</Text>
        {!activeId ? (
          <>
            {statCards}
            {filterBar}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.07)', overflow: 'hidden' }}>
              {conversationList}
            </div>
          </>
        ) : (
          <div>
            <Button onClick={() => setActiveId(null)} style={{ marginBottom: 12, borderRadius: 8 }}>← 返回列表</Button>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,.07)', overflow: 'hidden', height: 'calc(100vh - 200px)' }}>
              {chatPanel}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Title level={4} style={{ marginBottom: 2 }}>家长沟通监控</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>查看全部教师与家长的留言往来，可随时以管理员身份介入</Text>
      </div>
      {statCards}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, height: 'calc(100vh - 260px)', minHeight: 480 }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 14px 0' }}>{filterBar}</div>
          <div style={{ padding: '0 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
            <Text strong style={{ fontSize: 13, color: '#5a4e3a' }}>会话列表（{messages.length}）</Text>
            {stats.unread > 0 && <Badge count={stats.unread} size="small" />}
          </div>
          {conversationList}
        </div>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {chatPanel}
        </div>
      </div>
    </div>
  )
}