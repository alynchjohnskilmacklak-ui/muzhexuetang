'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Avatar, Badge, Button, Drawer, Input,
  Select, Tag, Typography,
} from 'antd'
import {
  CheckCircleOutlined, CloseOutlined,
  MessageOutlined, SendOutlined, UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { usePausableSWR } from '@/lib/use-pausable-swr'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SUBJECT_COLORS } from '@/constants/subjects'
import { fmtDateTime } from '@/lib/format-date'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'

const { Text, Title } = Typography
const { TextArea } = Input
const fetcher = (url: string) => fetch(url).then(r => r.json())

type Reply = {
  id: string; authorName: string; role: string
  content: string; isReadByTeacher: boolean; isReadByParent: boolean; createdAt: string
}
type Message = {
  id: string; title: string; subject: string | null; status: string
  parent: { id: string; name: string }
  student: { id: string; name: string } | null
  feedback: {
    id: string
    createdAt: string
    summary: string | null
    overallComment: string | null
    classLesson: {
      lessonDate: string
      subject: string | null
      group: { course: { name: string; subject: string } }
    } | null
  } | null
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
        {isTeacher && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#9A8E7A', textAlign: 'right' }}>
            {reply.isReadByParent ? '家长已查看' : '家长未查看'}
          </div>
        )}
        {!isTeacher && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#9A8E7A' }}>
            {reply.isReadByTeacher ? '已查看' : '新留言'}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageCard({ msg, onClick, active, index }: { msg: Message; onClick: () => void; active: boolean; index: number }) {
  const unread = unreadCount(msg)
  const lastReply = msg.replies[msg.replies.length - 1]
  const subjectColor = msg.subject ? SUBJECT_COLORS[msg.subject] : null
  return (
    <button type="button" aria-pressed={active} className="pressable stagger-item" onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', color: 'inherit', font: 'inherit',
      background: active ? '#F0F9F5' : '#fff',
      border: active ? '1.5px solid #1D9E75' : '1px solid rgba(0,0,0,.07)',
      borderRadius: 12, padding: '14px 16px',
      cursor: 'pointer', transition: 'all .18s ease', marginBottom: 8,
      animationDelay: `${Math.min(index, 8) * 40}ms`,
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
        {msg.feedback && (
          <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#fff3ec', color: '#E8784A', border: 'none' }}>
            课堂反馈留言
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
    </button>
  )
}

export function TeacherMessagesClient() {
  const isMobile = useIsMobile() ?? false
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [mobileViewport, setMobileViewport] = useState({ height: 0, bottomInset: 0 })
  const bottomRef = useRef<HTMLDivElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  const { data, mutate, isLoading } = usePausableSWR('/api/messages', fetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const allMessages: Message[] = data?.messages || []
  const messages = allMessages.filter(m => filter === 'ALL' || (filter === 'OPEN' ? m.status !== 'CLOSED' : m.status === 'CLOSED'))
  const active = allMessages.find(m => m.id === activeId) || null

  const scrollConversationToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const conversation = conversationRef.current
    if (!conversation) return
    conversation.scrollTo({ top: conversation.scrollHeight, behavior })
  }

  useEffect(() => {
    if (!activeId) return
    const timer = window.setTimeout(() => scrollConversationToBottom(), 100)
    return () => window.clearTimeout(timer)
  }, [activeId, active?.replies.length])

  useEffect(() => {
    if (!isMobile) return

    const updateViewport = () => {
      const viewport = window.visualViewport
      const height = Math.round(viewport?.height ?? window.innerHeight)
      const bottomInset = viewport
        ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
        : 0

      setMobileViewport(current => (
        current.height === height && current.bottomInset === bottomInset
          ? current
          : { height, bottomInset }
      ))
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('scroll', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('scroll', updateViewport)
    }
  }, [isMobile])

  useEffect(() => {
    if (!isMobile || !activeId) return
    const timer = window.setTimeout(() => scrollConversationToBottom('auto'), 50)
    return () => window.clearTimeout(timer)
  }, [activeId, isMobile, mobileViewport.height, mobileViewport.bottomInset])

  const handleReplyFocus = () => {
    const revealComposer = () => {
      composerRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
      scrollConversationToBottom()
    }

    window.requestAnimationFrame(revealComposer)
    window.setTimeout(revealComposer, 300)
  }

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
      toast.success('回复已发送，家长首页将显示新回复提示')
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {active && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,.07)', background: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text strong style={{ fontSize: 15, flex: 1 }}>{active.title}</Text>
            {active.status !== 'CLOSED' && (
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
            {active.feedback && (
              <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#fff3ec', color: '#E8784A', border: 'none' }}>
                {active.feedback.classLesson?.group.course.name || active.feedback.classLesson?.subject || '课堂反馈'} · {fmtDateTime(active.feedback.createdAt)}
              </Tag>
            )}
          </div>
        </div>
      )}
      <div ref={conversationRef} style={{
        flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 16px',
        background: '#faf8f5', overscrollBehavior: 'contain', scrollPaddingBottom: 88,
      }}>
        {!active ? (
          <BrandEmpty title="选择一条留言查看对话" hint="家长的问题和你的回复会显示在这里，选择左侧留言即可继续沟通。" icon={<MessageOutlined />} />
        ) : (
          <>
            {active.replies.map((reply, index) => <div className="stagger-item" key={reply.id} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}><ChatBubble reply={reply} /></div>)}
            <div ref={bottomRef} />
          </>
        )}
      </div>
      {active && active.status !== 'CLOSED' && (
        <div ref={composerRef} style={{
          padding: isMobile
            ? '12px 12px calc(12px + env(safe-area-inset-bottom, 0px))'
            : '12px 16px',
          background: '#fff',
          borderTop: '1px solid rgba(0,0,0,.07)', flexShrink: 0,
          display: 'flex', gap: 8, alignItems: 'flex-end', position: 'relative', zIndex: 2,
        }}>
          <TextArea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onFocus={handleReplyFocus}
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

  if (isLoading) return <CardSkeleton rows={3} />

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
          <BrandEmpty title="还没有家长留言" hint="家长发来的问题会显示在这里，及时回复有助于减少信息遗漏。" icon={<MessageOutlined />} />
        ) : messages.map((msg, index) => (
          <MessageCard key={msg.id} msg={msg} index={index} onClick={() => handleSelect(msg.id)} active={false} />
        ))}
        <Drawer
          open={!!activeId} onClose={() => setActiveId(null)}
          placement="bottom"
          height={mobileViewport.height
            ? Math.min(720, Math.max(240, Math.round(mobileViewport.height * 0.9)))
            : '85dvh'}
          title={null} closable={false}
          rootStyle={{ bottom: mobileViewport.bottomInset }}
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
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
              <BrandEmpty title="当前筛选下没有留言" hint="可以清除筛选条件，查看其他家长留言。" icon={<MessageOutlined />} />
            ) : messages.map((msg, index) => (
              <MessageCard key={msg.id} msg={msg} index={index} onClick={() => handleSelect(msg.id)} active={msg.id === activeId} />
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
