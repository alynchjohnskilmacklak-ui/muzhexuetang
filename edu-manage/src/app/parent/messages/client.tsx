'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Avatar, Badge, Button, Drawer, Empty, Form, Input,
  Modal, Select, Tag, Typography,
} from 'antd'
import {
  MessageOutlined, PlusOutlined, SendOutlined,
  UserOutlined, CloseOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import useSWR from 'swr'
import { format } from 'date-fns'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SUBJECT_COLORS } from '@/constants/subjects'

const { Text, Title } = Typography
const { TextArea } = Input
const fetcher = (url: string) => fetch(url).then(r => r.json())

type Reply = {
  id: string; messageId: string; authorName: string; role: string
  content: string; isReadByParent: boolean; createdAt: string
}
type Message = {
  id: string; title: string; subject: string | null; status: string
  teacher: { id: string; name: string } | null
  student: { id: string; name: string } | null
  replies: Reply[]
  updatedAt: string; createdAt: string
}
type Teacher = { id: string; name: string; subjects: string[]; studentIds: string[] }
type Student = { id: string; name: string; grade: string | null }

function unreadCount(msg: Message) {
  return msg.replies.filter(r => !r.isReadByParent && r.role !== 'parent').length
}

function RoleAvatar({ role, name }: { role: string; name: string }) {
  const isParent = role === 'parent'
  return (
    <Avatar
      size={32}
      icon={<UserOutlined />}
      style={{ background: isParent ? '#E8784A' : '#1D9E75', flexShrink: 0 }}
    >
      {name.slice(0, 1)}
    </Avatar>
  )
}

function ChatBubble({ reply, isOwn }: { reply: Reply; isOwn: boolean }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      gap: 8,
      alignItems: 'flex-end',
      marginBottom: 16,
    }}>
      <RoleAvatar role={reply.role} name={reply.authorName} />
      <div style={{ maxWidth: '70%', minWidth: 60 }}>
        <div style={{
          fontSize: 11,
          color: '#9a8e7a',
          marginBottom: 4,
          textAlign: isOwn ? 'right' : 'left',
        }}>
          {reply.authorName} · {format(new Date(reply.createdAt), 'MM-dd HH:mm')}
        </div>
        <div style={{
          background: isOwn ? '#E8784A' : '#fff',
          color: isOwn ? '#fff' : '#1a1201',
          border: isOwn ? 'none' : '1px solid rgba(0,0,0,.08)',
          borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {reply.content}
        </div>
      </div>
    </div>
  )
}

function MessageCard({
  msg, onClick, active,
}: { msg: Message; onClick: () => void; active: boolean }) {
  const unread = unreadCount(msg)
  const lastReply = msg.replies[msg.replies.length - 1]
  const subjectColor = msg.subject ? SUBJECT_COLORS[msg.subject] : null

  return (
    <div
      onClick={onClick}
      style={{
        background: active ? '#FFF6F1' : '#fff',
        border: active ? '1.5px solid #E8784A' : '1px solid rgba(0,0,0,.07)',
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all .18s ease',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <Text strong style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>{msg.title}</Text>
        {unread > 0 && <Badge count={unread} size="small" />}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {msg.subject && subjectColor && (
          <Tag style={{
            borderRadius: 9999, fontSize: 11, border: 'none',
            background: subjectColor.bg, color: subjectColor.color,
          }}>{msg.subject}</Tag>
        )}
        {msg.teacher && (
          <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#F0F9F5', color: '#1D9E75', border: 'none' }}>
            {msg.teacher.name} 老师
          </Tag>
        )}
        <Tag style={{
          borderRadius: 9999, fontSize: 11,
          background: msg.status === 'CLOSED' ? '#f5f5f5' : '#FFF6F1',
          color: msg.status === 'CLOSED' ? '#999' : '#E8784A',
          border: 'none',
        }}>
          {msg.status === 'CLOSED' ? '已关闭' : '进行中'}
        </Tag>
      </div>
      {lastReply && (
        <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
          {lastReply.role !== 'parent' ? `${lastReply.authorName}：` : '我：'}
          {lastReply.content}
        </Text>
      )}
    </div>
  )
}

export function ParentMessagesClient({
  students, teachers, initialMessages,
}: {
  students: Student[]
  teachers: Teacher[]
  initialMessages: Message[]
}) {
  const isMobile = useIsMobile() ?? false
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [composeForm] = Form.useForm()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [activeChildId, setActiveChildId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('childId') || (students[0]?.id ?? '')
    }
    return students[0]?.id ?? ''
  })
  const [filterChildId, setFilterChildId] = useState<string>(activeChildId)
  const { data, mutate } = useSWR('/api/messages', fetcher, {
    fallbackData: { messages: initialMessages },
    refreshInterval: 5_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const allMessages: Message[] = data?.messages || []
  const messages = students.length > 1 && filterChildId
    ? allMessages.filter(m => !m.student || m.student.id === filterChildId)
    : allMessages
  const active = allMessages.find(m => m.id === activeId) || null

  useEffect(() => {
    if (active) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
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

  const handleCompose = async (values: Record<string, string>) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          content: values.content,
          teacherId: values.teacherId || null,
          studentId: values.studentId || null,
          subject: values.subject || null,
        }),
      })
      if (!res.ok) { toast.error('提交失败'); return }
      const msg: Message = await res.json()
      toast.success('已发送，等待老师回复')
      setShowCompose(false)
      composeForm.resetFields()
      await mutate()
      setActiveId(msg.id)
    } catch { toast.error('网络错误') }
    finally { setSubmitting(false) }
  }

  const chatPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {active && (
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(0,0,0,.07)',
          background: '#fff',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text strong style={{ fontSize: 15 }}>{active.title}</Text>
            {active.subject && SUBJECT_COLORS[active.subject] && (
              <Tag style={{
                borderRadius: 9999, fontSize: 11, border: 'none',
                background: SUBJECT_COLORS[active.subject].bg,
                color: SUBJECT_COLORS[active.subject].color,
              }}>{active.subject}</Tag>
            )}
            {active.teacher && (
              <Tag style={{ borderRadius: 9999, fontSize: 11, background: '#F0F9F5', color: '#1D9E75', border: 'none' }}>
                {active.teacher.name} 老师
              </Tag>
            )}
            <Tag style={{
              marginLeft: 'auto', borderRadius: 9999, fontSize: 11,
              background: active.status === 'CLOSED' ? '#f5f5f5' : '#FFF6F1',
              color: active.status === 'CLOSED' ? '#999' : '#E8784A',
              border: 'none',
            }}>
              {active.status === 'CLOSED' ? '已关闭' : '进行中'}
            </Tag>
          </div>
        </div>
      )}

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 16px',
        background: '#faf8f5',
      }}>
        {!active ? (
          <Empty description="选择一条留言查看对话" style={{ marginTop: 80 }} />
        ) : (
          <>
            {active.replies.map(r => (
              <ChatBubble key={r.id} reply={r} isOwn={r.role === 'parent'} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {active && active.status === 'OPEN' && (
        <div style={{
          padding: '12px 16px',
          background: '#fff',
          borderTop: '1px solid rgba(0,0,0,.07)',
          flexShrink: 0,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <TextArea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="补充说明或追问..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
            style={{ borderRadius: 10, flex: 1, resize: 'none' }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            disabled={!replyText.trim()}
            onClick={handleReply}
            style={{
              background: 'linear-gradient(135deg,#E87545,#F09A5B)',
              border: 'none', borderRadius: 10, height: 36,
            }}
          />
        </div>
      )}
      {active && active.status === 'CLOSED' && (
        <div style={{
          padding: '10px 16px',
          background: '#f9f9f9',
          borderTop: '1px solid rgba(0,0,0,.07)',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <CheckCircleOutlined style={{ marginRight: 6 }} />
            该留言已关闭
          </Text>
        </div>
      )}
    </div>
  )

  const selectedStudentId = Form.useWatch('studentId', composeForm)
  const teacherOptions = teachers
    .filter(t => !selectedStudentId || t.studentIds.includes(selectedStudentId))
    .map(t => ({
      value: t.id,
      label: t.subjects.length > 0 ? `${t.name}（${t.subjects.join('·')}）` : t.name,
    }))

  const composeModal = (
    <Modal
      open={showCompose}
      onCancel={() => { setShowCompose(false); composeForm.resetFields() }}
      title={<span style={{ fontWeight: 700, color: '#1a1201' }}>新建留言</span>}
      footer={null}
      width={isMobile ? '95vw' : 520}
      centered
      destroyOnClose
      getContainer={() => document.body}
    >
      <Form form={composeForm} layout="vertical" onFinish={handleCompose} style={{ marginTop: 16 }}>
        <Form.Item name="studentId" label="孩子">
          <Select
            placeholder="选择孩子（可选）"
            allowClear
            style={{ borderRadius: 8 }}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            listHeight={200}
            virtual={false}
          >
            {students.map(s => (
              <Select.Option key={s.id} value={s.id}>
                {s.name}{s.grade ? `（${s.grade}）` : ''}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="subject" label="学科">
          <Select
            placeholder="选择学科（可选）"
            allowClear
            style={{ borderRadius: 8 }}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            listHeight={200}
            virtual={false}
          >
            {Object.keys(SUBJECT_COLORS).map(s => (
              <Select.Option key={s} value={s}>{s}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="teacherId" label="指定老师">
          <Select
            placeholder="选择老师（可选）"
            allowClear
            style={{ borderRadius: 8 }}
            options={teacherOptions}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            listHeight={200}
            virtual={false}
          />
        </Form.Item>
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请填写标题' }]}>
          <Input placeholder="例如：关于数学作业的问题" maxLength={100} style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item name="content" label="问题详情" rules={[{ required: true, message: '请填写问题内容' }]}>
          <TextArea
            placeholder="请详细描述您的问题，老师会尽快回复..."
            maxLength={2000}
            rows={5}
            showCount
            style={{ borderRadius: 8 }}
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => { setShowCompose(false); composeForm.resetFields() }}>取消</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SendOutlined />}
            style={{ background: 'linear-gradient(135deg,#E87545,#F09A5B)', border: 'none', borderRadius: 8 }}
          >
            发送
          </Button>
        </div>
      </Form>
    </Modal>
  )

  if (isMobile) {
    return (
      <div style={{ padding: '0 0 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ marginBottom: 2 }}>我的留言</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>向老师提问，随时查看回复</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
            setShowCompose(true)
            if (filterChildId) {
              setTimeout(() => composeForm.setFieldValue('studentId', filterChildId), 50)
            }
          }}
            style={{ background: 'linear-gradient(135deg,#E87545,#F09A5B)', border: 'none', borderRadius: 10 }}
          >
            提问
          </Button>
        </div>

        {students.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => { setFilterChildId(s.id); setActiveChildId(s.id) }}
                style={{
                  flexShrink: 0, padding: '6px 16px', borderRadius: 20, fontSize: 13,
                  border: `1.5px solid ${filterChildId === s.id ? '#E8784A' : '#EEE7E1'}`,
                  background: filterChildId === s.id ? 'rgba(232,120,74,0.1)' : '#fff',
                  color: filterChildId === s.id ? '#E8784A' : '#5a4e3a',
                  fontWeight: filterChildId === s.id ? 700 : 500,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {s.name}{s.grade ? ` · ${s.grade}` : ''}
              </button>
            ))}
          </div>
        )}        {messages.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16, padding: '48px 24px',
            textAlign: 'center', border: '1px solid rgba(0,0,0,.06)',
          }}>
            <MessageOutlined style={{ fontSize: 40, color: '#E8784A', opacity: .4, marginBottom: 12 }} />
            <div style={{ fontSize: 15, color: '#5a4e3a', marginBottom: 6 }}>还没有留言</div>
            <Text type="secondary" style={{ fontSize: 13 }}>有任何学习问题，都可以向老师提问</Text>
          </div>
        ) : (
          messages.map(msg => (
            <MessageCard key={msg.id} msg={msg} onClick={() => handleSelect(msg.id)} active={false} />
          ))
        )}

        <Drawer
          open={!!activeId}
          onClose={() => setActiveId(null)}
          placement="bottom"
          height="85vh"
          title={null}
          closable={false}
          bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
          headerStyle={{ display: 'none' }}
          style={{ borderRadius: '16px 16px 0 0' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,.07)',
            background: '#fff', borderRadius: '16px 16px 0 0',
          }}>
            <Text strong>对话详情</Text>
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

        {composeModal}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ marginBottom: 2 }}>我的留言</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>向老师提问，随时查看回复</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setShowCompose(true)
            if (filterChildId) {
              setTimeout(() => composeForm.setFieldValue('studentId', filterChildId), 50)
            }
          }}
          style={{ background: 'linear-gradient(135deg,#E87545,#F09A5B)', border: 'none', borderRadius: 10, height: 38 }}
        >
          新建留言
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, height: 'calc(100vh - 160px)' }}>
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(0,0,0,.07)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(0,0,0,.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: students.length > 1 ? 10 : 0 }}>
              <Text strong style={{ fontSize: 14, color: '#5a4e3a' }}>
                {students.length > 1 ? '留言筛选' : '所有留言'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>（{messages.length}条）</Text>
            </div>
            {students.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setFilterChildId(s.id); setActiveChildId(s.id) }}
                    style={{
                      padding: '4px 12px', borderRadius: 16, fontSize: 12,
                      border: `1.5px solid ${filterChildId === s.id ? '#E8784A' : '#EEE7E1'}`,
                      background: filterChildId === s.id ? 'rgba(232,120,74,0.1)' : '#fff',
                      color: filterChildId === s.id ? '#E8784A' : '#5a4e3a',
                      fontWeight: filterChildId === s.id ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '12px 12px' }}>
            {messages.length === 0 ? (
              <Empty description="暂无留言" style={{ marginTop: 60 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              messages.map(msg => (
                <MessageCard key={msg.id} msg={msg} onClick={() => handleSelect(msg.id)} active={msg.id === activeId} />
              ))
            )}
          </div>
        </div>

        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(0,0,0,.07)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {chatPanel}
        </div>
      </div>

      {composeModal}
    </div>
  )
}
