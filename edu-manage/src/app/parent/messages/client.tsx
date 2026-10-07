'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Avatar, Badge, Button, Drawer, Form, Input,
  Select, Tag, Typography,
} from 'antd'
import {
  PlusOutlined, SendOutlined,
  UserOutlined, CloseOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { usePausableSWR } from '@/lib/use-pausable-swr'
import { fmtDateTime } from '@/lib/format-date'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SUBJECT_COLORS } from '@/constants/subjects'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { SafeFormModal } from '@/components/Common/SafeFormModal'
import { WorkspacePageHeader } from '@/components/Common/WorkspacePageHeader'

const { Text } = Typography
const { TextArea } = Input
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`加载失败（${response.status}）`)
  return response.json()
}

type Reply = {
  id: string; messageId: string; authorName: string; role: string
  content: string; isReadByParent: boolean; isReadByTeacher: boolean; createdAt: string
}
type Message = {
  id: string; title: string; subject: string | null; status: string
  teacher: { id: string; name: string } | null
  student: { id: string; name: string } | null
  replies: Reply[]
  updatedAt: string; createdAt: string
}
type Student = { id: string; name: string; grade: string | null }
type TeacherRecommendation = { id: string; name: string; subject: string | null; source: 'lesson' | 'group' }

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
          {reply.authorName} · {fmtDateTime(reply.createdAt)}
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
        {isOwn && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#9A8E7A', textAlign: 'right' }}>
            {reply.isReadByTeacher ? '老师已查看' : '老师未查看'}
          </div>
        )}
        {!isOwn && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#9A8E7A' }}>
            {reply.isReadByParent ? '已查看' : '新回复'}
          </div>
        )}
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
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        background: active ? '#FFF6F1' : '#fff',
        border: active ? '1.5px solid #E8784A' : '1px solid rgba(0,0,0,.07)',
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'background-color var(--motion-standard) ease, border-color var(--motion-standard) ease',
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
    </button>
  )
}

export function ParentMessagesClient({
  students, initialMessages, teacherRecommendations,
}: {
  students: Student[]
  initialMessages: Message[]
  teacherRecommendations: Record<string, TeacherRecommendation[]>
}) {
  const isMobile = useIsMobile() ?? false
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [composeForm] = Form.useForm()
  const composeValues = Form.useWatch([], composeForm)
  void composeValues
  const composeStudentId = Form.useWatch('studentId', composeForm)
  const recommendedTeachers = composeStudentId ? teacherRecommendations[composeStudentId] || [] : []
  const bottomRef = useRef<HTMLDivElement>(null)

  const [activeChildId, setActiveChildId] = useState<string>(students[0]?.id ?? '')
  const [filterChildId, setFilterChildId] = useState<string>(activeChildId)
  const { data, mutate } = usePausableSWR('/api/messages', fetcher, {
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
    const requestedChildId = new URLSearchParams(window.location.search).get('childId')
    if (!requestedChildId || !students.some(student => student.id === requestedChildId)) return
    setActiveChildId(requestedChildId)
    setFilterChildId(requestedChildId)
  }, [students])

  useEffect(() => {
    if (!activeId) return
    const timer = window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    return () => window.clearTimeout(timer)
  }, [activeId, active?.replies.length])

  useEffect(() => {
    if (!showCompose || !composeStudentId) return
    const recommendation = teacherRecommendations[composeStudentId]?.[0]
    composeForm.setFieldsValue({
      teacherId: recommendation?.id,
      subject: recommendation?.subject || composeForm.getFieldValue('subject') || undefined,
    })
  }, [composeForm, composeStudentId, showCompose, teacherRecommendations])

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
      toast.success('留言已发送，教师端将显示待回复提示')
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
          studentId: values.studentId || null,
          teacherId: values.teacherId || null,
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
          <div style={{ marginTop: 36 }}><GuidedEmpty title="选择一条留言查看对话" description="家长留言和老师回复会集中显示在这里，选择左侧记录即可继续沟通。" actionLabel={messages[0] ? '打开最新留言' : undefined} onAction={messages[0] ? () => handleSelect(messages[0].id) : undefined} compact /></div>
        ) : (
          <>
            {active.replies.map(r => (
              <ChatBubble key={r.id} reply={r} isOwn={r.role === 'parent'} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {active && active.status !== 'CLOSED' && (
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
              background: 'var(--color-primary)',
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

  const closeCompose = () => {
    setShowCompose(false)
    composeForm.resetFields()
  }

  const openCompose = () => {
    setShowCompose(true)
    if (filterChildId) {
      window.setTimeout(() => composeForm.setFieldValue('studentId', filterChildId), 50)
    }
  }

  const composeModal = (
    <SafeFormModal
      open={showCompose}
      onClose={closeCompose}
      onOk={() => composeForm.submit()}
      dirty={showCompose && composeForm.isFieldsTouched()}
      title={<span style={{ fontWeight: 700, color: '#1a1201' }}>新建留言</span>}
      width={520}
      mobileHeight="92dvh"
      okText="发送"
      confirmLoading={submitting}
    >
      <Form form={composeForm} layout="vertical" onFinish={handleCompose} style={{ marginTop: 16 }}>
        <Form.Item name="studentId" label="孩子" rules={[{ required: true, message: '请选择孩子' }]}>
          <Select
            placeholder="选择孩子，系统会自动匹配任课教师"
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
        <Form.Item name="teacherId" label="联系老师" rules={[{ required: true, message: '请选择任课老师' }]}
          extra={recommendedTeachers[0] ? `已优先推荐${recommendedTeachers[0].source === 'lesson' ? '最近课次' : '当前班级'}任课老师，可手动调整` : '请选择孩子当前的任课老师'}>
          <Select
            placeholder="选择任课老师"
            options={recommendedTeachers.map((teacher) => ({
              value: teacher.id,
              label: `${teacher.name}老师${teacher.subject ? ` · ${teacher.subject}` : ''}`,
            }))}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            listHeight={200}
            virtual={false}
          />
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
      </Form>
    </SafeFormModal>
  )

  if (isMobile) {
    return (
      <div style={{ padding: '0 0 80px' }}>
        <WorkspacePageHeader
          eyebrow="家长端 · 家校沟通"
          title="我的留言"
          subtitle="向老师提问，随时查看回复"
          actions={(
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCompose}
            style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 10 }}
          >
            提问
          </Button>
          )}
        />

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
          <div style={{ background: 'var(--color-surface-1)', borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
            <GuidedEmpty
              title="还没有留言"
              description="有任何学习问题，都可以直接向孩子的任课老师提问。"
              actionLabel="发起第一条留言"
              actionIcon={<PlusOutlined />}
              onAction={openCompose}
            />
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
              width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(0,0,0,.1)',
              background: '#f5f5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} aria-label="关闭对话详情">
              <CloseOutlined style={{ fontSize: 15 }} />
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
    <PullToRefresh onRefresh={async () => { await mutate() }}>
    <div>
      <WorkspacePageHeader
        eyebrow="家长端 · 家校沟通"
        title="我的留言"
        subtitle="向老师提问，随时查看回复"
        actions={(
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCompose}
          style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 10, minHeight: 44 }}
        >
          新建留言
        </Button>
        )}
      />

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
              <div style={{ marginTop: 24 }}><GuidedEmpty title={filterChildId ? '这个孩子还没有留言' : '还没有留言'} description="需要了解课堂表现、作业或课程安排时，可以从这里向老师发起留言。" actionLabel="新建留言" onAction={() => setShowCompose(true)} compact /></div>
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
    </PullToRefresh>
  )
}
