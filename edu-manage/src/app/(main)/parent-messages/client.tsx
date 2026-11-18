'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { useState, useRef, useEffect, useMemo } from 'react'
import { Avatar, Badge, Button, Empty, Input, Select, Tag, Typography } from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'
import {
  CheckCircleOutlined, SendOutlined, SearchOutlined, BellOutlined,
  CloseOutlined, PictureOutlined, SmileOutlined, UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { usePausableSWR } from '@/lib/use-pausable-swr'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SUBJECT_COLORS } from '@/constants/subjects'
import { STICKER_MARK, stickerPreview } from '@/constants/stickers'
import { StickerPanel } from '@/components/Parent/StickerPanel'
import { StickerMessageContent } from '@/components/Parent/StickerMessageContent'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { uploadMessageImage } from '@/lib/client-image-upload'

const { Text, Title } = Typography
const { TextArea } = Input
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`加载失败（${response.status}）`)
  return response.json()
}

const ADMIN = 'var(--color-brand-purple)'
const PARENT = 'var(--color-primary)'
const TEACHER = 'var(--color-success)'

type Reply = {
  id: string
  authorName: string
  role: string
  content: string
  isReadByTeacher: boolean
  isReadByParent: boolean
  createdAt: string
  attachments?: Array<{ url: string; name?: string; type?: string }> | null
}
type Message = {
  id: string; title: string; subject: string | null; status: string
  parent: { id: string; name: string }
  teacher: { id: string; name: string; avatar?: string | null; gender?: string | null } | null
  student: { id: string; name: string; grade?: string | null; gender?: string | null } | null
  replies: Reply[]; updatedAt: string
  workflow?: {
    pendingTeacherReply: boolean
    pendingParentRead: boolean
    unreadForTeacher: number
    unreadForParent: number
    waitingMinutes: number
    overdue: boolean
    parentMessageViewedByTeacher: boolean
    staffReplyViewedByParent: boolean
    parentFollowUpCount: number
  }
  reminder?: { count: number; lastRemindedAt: string | null }
}

const unreadCount = (m: Message) => m.replies.filter(r => !r.isReadByTeacher && r.role === 'parent').length
const isPendingTeacherReply = (m: Message) => m.workflow?.pendingTeacherReply ?? (
  m.status !== 'CLOSED' && m.replies[m.replies.length - 1]?.role === 'parent'
)
const isPendingParentRead = (m: Message) => m.workflow?.pendingParentRead ?? (
  m.replies.some((reply) => reply.role !== 'parent' && !reply.isReadByParent)
)
const formatWaitingTime = (minutes = 0) => {
  if (minutes < 60) return `等待 ${Math.max(1, minutes)} 分钟`
  if (minutes < 24 * 60) return `等待 ${Math.floor(minutes / 60)} 小时`
  return `等待 ${Math.floor(minutes / 1440)} 天`
}

function ChatBubble({ reply }: { reply: Reply }) {
  const isParent = reply.role === 'parent'
  const color = reply.role === 'parent' ? PARENT : reply.role === 'teacher' ? TEACHER : ADMIN
  const roleLabel = reply.role === 'admin' ? '管理员' : reply.role === 'teacher' ? '老师' : '家长'
  return (
    <div style={{ display: 'flex', flexDirection: isParent ? 'row' : 'row-reverse', gap: 8, alignItems: 'flex-end', marginBottom: 16 }}>
      <Avatar size={30} icon={<UserOutlined />} style={{ flexShrink: 0, background: color, color: 'var(--color-on-primary)' }} />
      <div style={{ maxWidth: '72%' }}>
        <div style={{ fontSize: 11, color: 'var(--color-ink-subtle)', marginBottom: 4, textAlign: isParent ? 'left' : 'right' }}>
          {reply.authorName}（{roleLabel}） · {format(new Date(reply.createdAt), 'MM-dd HH:mm')}
        </div>
        <div style={{
          background: isParent ? 'var(--color-surface-1)' : color,
          color: isParent ? 'var(--color-ink)' : 'var(--color-on-primary)',
          border: isParent ? '1px solid rgba(0,0,0,.08)' : 'none',
          borderRadius: isParent ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
          boxShadow: '0 2px 8px rgba(0,0,0,.05)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          <StickerMessageContent
            content={reply.content}
            animated
            style={{ width: 150, maxWidth: '100%', borderRadius: 12 }}
          />
          {reply.attachments?.length ? (
            <div style={{ display: 'grid', gap: 6, marginTop: reply.content ? 8 : 0 }}>
              {reply.attachments.map((attachment, index) => (
                <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" aria-label="打开聊天图片">
                  <img
                    src={attachment.url}
                    alt={attachment.name || '聊天图片'}
                    loading="lazy"
                    style={{ display: 'block', width: '100%', maxWidth: 280, maxHeight: 240, objectFit: 'cover', borderRadius: 10 }}
                  />
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{
          marginTop: 4,
          fontSize: 10,
          color: 'var(--color-ink-subtle)',
          textAlign: isParent ? 'left' : 'right',
        }}>
          {isParent
            ? (reply.isReadByTeacher ? '教师已查看' : '教师未查看')
            : (reply.isReadByParent ? '家长已查看' : '家长未查看')}
        </div>
      </div>
    </div>
  )
}

function ConversationItem({ msg, onClick, active }: { msg: Message; onClick: () => void; active: boolean }) {
  const unread = unreadCount(msg)
  const last = msg.replies[msg.replies.length - 1]
  const sc = msg.subject ? SUBJECT_COLORS[msg.subject] : null
  const studentName = msg.student?.name || '学员信息待完善'
  const pendingTeacher = isPendingTeacherReply(msg)
  const pendingParent = isPendingParentRead(msg)
  return (
    <button type="button" aria-pressed={active} onClick={onClick} style={{
      display: 'flex', width: '100%', minWidth: 0, minHeight: 158, gap: 14, alignItems: 'flex-start',
      textAlign: 'left', color: 'var(--color-ink)', font: 'inherit',
      background: active ? 'var(--color-primary-bg)' : 'var(--color-surface-1)',
      border: `1px solid ${active ? 'rgba(232,120,74,.35)' : 'var(--color-hairline)'}`,
      borderRadius: 16, padding: 16, cursor: 'pointer',
      boxShadow: active ? '0 8px 22px rgba(119,67,40,.10)' : '0 3px 12px rgba(37,29,20,.045)',
      transition: 'background .16s ease, box-shadow .16s ease, transform .16s ease',
    }}>
      <div style={{ position: 'relative', flexShrink: 0, paddingTop: 2 }}>
        <StudentAvatar photoUrl={null} gender={msg.student?.gender} name={studentName} size={56} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', right: -5, top: -5, minWidth: 20, height: 20, padding: '0 5px',
            display: 'grid', placeItems: 'center', borderRadius: 999, border: '2px solid var(--color-surface-1)',
            background: 'var(--color-error)', color: 'var(--color-on-primary)', fontSize: 10, fontWeight: 700,
          }}>{unread}</span>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: 15, color: 'var(--color-ink)' }} ellipsis>{studentName}</Text>
              {msg.student?.grade && (
                <span style={{ padding: '2px 7px', borderRadius: 999, background: 'var(--color-surface-3)', color: 'var(--color-ink-muted)', fontSize: 10, lineHeight: 1.5 }}>
                  {msg.student.grade}
                </span>
              )}
            </div>
            <div style={{ color: 'var(--color-ink-muted)', fontSize: 12, marginTop: 3 }}>
              {msg.parent.name} · 家长
            </div>
          </div>
          <span style={{ color: 'var(--color-ink-subtle)', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {formatDistanceToNow(new Date(msg.updatedAt), { addSuffix: true, locale: zhCN })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 11 }}>
          {pendingTeacher && msg.status !== 'CLOSED' && (
            <span style={{ padding: '3px 8px', borderRadius: 999, background: msg.workflow?.overdue ? 'var(--color-error-bg)' : 'var(--color-primary-bg)', color: msg.workflow?.overdue ? 'var(--color-error)' : 'var(--color-primary-focus)', fontSize: 10, fontWeight: 650 }}>
              {msg.workflow?.overdue ? '回复超时' : formatWaitingTime(msg.workflow?.waitingMinutes)}
            </span>
          )}
          {pendingParent && msg.status !== 'CLOSED' && (
            <span style={{ padding: '3px 8px', borderRadius: 999, background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: 10, fontWeight: 650 }}>待家长查看</span>
          )}
          {msg.status === 'CLOSED' && (
            <span style={{ padding: '3px 8px', borderRadius: 999, background: 'var(--color-surface-3)', color: 'var(--color-ink-muted)', fontSize: 10 }}>已关闭</span>
          )}
          {msg.subject && sc && (
            <span style={{ padding: '3px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 650 }}>{msg.subject}</span>
          )}
          {!!msg.reminder?.count && (
            <span style={{ padding: '3px 8px', borderRadius: 999, background: 'var(--color-surface-3)', color: ADMIN, fontSize: 10 }}>已督促 {msg.reminder.count} 次</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11, minWidth: 0 }}>
          <Avatar
            size={25}
            src={msg.teacher ? getTeacherAvatarUrl(msg.teacher.avatar, msg.teacher.gender, msg.teacher.id) : undefined}
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-ink-muted)', flexShrink: 0, fontSize: 11 }}
          />
          <span style={{ color: 'var(--color-ink-caption)', fontSize: 12, whiteSpace: 'nowrap' }}>沟通老师</span>
          <Text strong style={{ color: 'var(--color-ink)', fontSize: 12 }} ellipsis>{msg.teacher ? `${msg.teacher.name}老师` : '待分配'}</Text>
        </div>
        <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--color-hairline-tertiary)', minWidth: 0 }}>
          <Text style={{ color: 'var(--color-ink-muted)', fontSize: 12 }} ellipsis>
            {last ? `${last.authorName}：${stickerPreview(last.content)}` : msg.title}
          </Text>
        </div>
      </div>
    </button>
  )
}

export function AdminMessagesClient() {
  const isMobile = useIsMobile() ?? false
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PENDING_TEACHER' | 'PENDING_PARENT' | 'CLOSED'>('ALL')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [search, setSearch] = useState('')
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [showSticker, setShowSticker] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, mutate } = usePausableSWR('/api/messages', fetcher, {
    refreshInterval: 5_000, revalidateOnFocus: true, revalidateOnReconnect: true,
  })
  const { data: workflowSummary, mutate: mutateWorkflowSummary } = usePausableSWR(
    '/api/messages/unread-count',
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  const allMessages = useMemo<Message[]>(() => data?.messages || [], [data])

  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>()
    allMessages.forEach(m => { if (m.teacher) map.set(m.teacher.id, m.teacher.name) })
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [allMessages])

  const stats = useMemo(() => ({
    total: Number(data?.total ?? allMessages.length),
    pendingTeacher: Number(
      workflowSummary?.pendingTeacherReplies
      ?? allMessages.filter(isPendingTeacherReply).length,
    ),
    pendingParent: Number(
      workflowSummary?.pendingParentReads
      ?? allMessages.filter(isPendingParentRead).length,
    ),
    overdue: Number(
      workflowSummary?.overdueTeacherReplies
      ?? allMessages.filter(message => message.workflow?.overdue).length,
    ),
  }), [allMessages, data?.total, workflowSummary])

  const serviceMetrics = useMemo(() => {
    const responseMinutes: number[] = []
    let parentFollowUps = 0
    const pendingByTeacher = new Map<string, { name: string; count: number }>()

    allMessages.forEach((message) => {
      parentFollowUps += message.workflow?.parentFollowUpCount || 0
      if (isPendingTeacherReply(message) && message.teacher) {
        const current = pendingByTeacher.get(message.teacher.id)
        pendingByTeacher.set(message.teacher.id, {
          name: message.teacher.name,
          count: (current?.count || 0) + 1,
        })
      }
      message.replies.forEach((reply, index) => {
        if (reply.role !== 'parent') return
        const replyAt = new Date(reply.createdAt).getTime()
        const staffReply = message.replies
          .slice(index + 1)
          .find(candidate => candidate.role === 'teacher')
        if (staffReply) {
          responseMinutes.push(Math.max(0, (new Date(staffReply.createdAt).getTime() - replyAt) / 60_000))
        }
      })
    })

    const averageMinutes = responseMinutes.length
      ? Math.round(responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length)
      : 0
    const within24Hours = responseMinutes.filter(value => value <= 24 * 60).length
    return {
      averageMinutes: Number(workflowSummary?.averageReplyMinutes ?? averageMinutes),
      replyRate24h: Number(workflowSummary?.replyRate24h ?? (
        responseMinutes.length ? Math.round(within24Hours / responseMinutes.length * 100) : 100
      )),
      parentFollowUps: Number(workflowSummary?.parentFollowUps ?? parentFollowUps),
      pendingByTeacher: Array.isArray(workflowSummary?.pendingByTeacher)
        ? workflowSummary.pendingByTeacher
        : [...pendingByTeacher.values()].sort((a, b) => b.count - a.count),
    }
  }, [allMessages, workflowSummary])

  const messages = useMemo(() => {
    const kw = search.trim()
    return allMessages
      .filter(m => (
        filter === 'ALL'
        || (filter === 'PENDING_TEACHER' && isPendingTeacherReply(m))
        || (filter === 'PENDING_PARENT' && isPendingParentRead(m))
        || (filter === 'CLOSED' && m.status === 'CLOSED')
      ))
      .filter(m => !teacherFilter || m.teacher?.id === teacherFilter)
      .filter(m => !kw || `${m.title} ${m.parent.name} ${m.teacher?.name || ''} ${m.student?.name || ''} ${m.subject || ''}`.includes(kw) || m.replies.some(r => r.content.includes(kw)))
      .sort((a, b) => {
        const pa = isPendingTeacherReply(a) ? 1 : 0
        const pb = isPendingTeacherReply(b) ? 1 : 0
        if (pa !== pb) return pb - pa
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [allMessages, filter, teacherFilter, search])

  const active = allMessages.find(m => m.id === activeId) || null

  useEffect(() => {
    if (!activeId) return
    const timer = window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    return () => window.clearTimeout(timer)
  }, [activeId, active?.replies.length])

  const handleSelect = async (id: string) => {
    setActiveId(id)
    setShowSticker(false)
    setShowEmoji(false)
    const response = await fetch(`/api/messages/${id}`)
    if (!response.ok) {
      toast.error('会话状态更新失败，请稍后重试')
      return
    }
    mutate()
    void mutateWorkflowSummary()
  }

  const handleUploadImage = async (file: File) => {
    const studentId = active?.student?.id
    if (!studentId) {
      toast.error('当前会话未关联学生，无法上传图片')
      return
    }
    setUploading(true)
    try {
      setPendingImage(await uploadMessageImage(file, studentId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  const handleReply = async (contentOverride?: string) => {
    const content = contentOverride ?? replyText.trim()
    if (!activeId || (!content && !pendingImage)) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/messages/${activeId}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          attachments: pendingImage ? [{ url: pendingImage, type: 'image' }] : [],
        }),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => null)
        toast.error(result?.error || '发送失败，请稍后重试')
        return
      }
      if (contentOverride === undefined) setReplyText('')
      setPendingImage(null)
      setShowEmoji(false)
      setShowSticker(false)
      toast.success('回复已发送，家长端将显示新回复提示')
      void mutate()
      void mutateWorkflowSummary()
    } catch { toast.error('网络错误') } finally { setSubmitting(false) }
  }

  const handleClose = async () => {
    if (!activeId) return
    setClosing(true)
    try {
      const response = await fetch(`/api/messages/${activeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      })
      if (!response.ok) { toast.error('关闭失败，请稍后重试'); return }
      toast.success('已关闭'); void mutate(); void mutateWorkflowSummary()
    } catch { toast.error('操作失败') } finally { setClosing(false) }
  }

  const handleRemindTeacher = async () => {
    if (!activeId) return
    setReminding(true)
    try {
      const res = await fetch(`/api/messages/${activeId}/remind`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || '提醒失败')
        return
      }
      toast.success(result.reminded ? '已提醒教师及时回复' : result.message)
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setReminding(false)
    }
  }

  const statCards = (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 12 }}>
      {[
        { label: '全部沟通', value: stats.total, color: 'var(--color-ink)', bg: 'var(--color-surface-1)' },
        { label: '待教师回复', value: stats.pendingTeacher, color: 'var(--color-primary-focus)', bg: 'var(--color-primary-bg)' },
        { label: '待家长查看', value: stats.pendingParent, color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
        { label: '超时未回复', value: stats.overdue, color: 'var(--color-error)', bg: 'var(--color-error-bg)' },
      ].map(c => (
        <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: '11px 14px', border: '1px solid var(--color-hairline-tertiary)' }}>
          <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginBottom: 3 }}>{c.label}</div>
          <div style={{ fontSize: 22, lineHeight: 1.15, fontWeight: 750, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
        </div>
      ))}
    </div>
  )

  const servicePanel = (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
      gap: isMobile ? 8 : 16,
      marginBottom: 16,
      padding: isMobile ? '12px 10px' : '13px 18px',
      borderRadius: 14,
      border: '1px solid var(--color-hairline)',
      background: 'var(--color-surface-1)',
    }}>
      <div>
        <Text style={{ color: 'var(--color-ink-muted)', fontSize: 11 }}>平均回复时间</Text>
        <div style={{ marginTop: 3, fontSize: 16, fontWeight: 750, color: 'var(--color-ink)' }}>
          {formatWaitingTime(serviceMetrics.averageMinutes).replace('等待 ', '')}
        </div>
      </div>
      <div>
        <Text style={{ color: 'var(--color-ink-muted)', fontSize: 11 }}>24小时回复率</Text>
        <div style={{ marginTop: 3, fontSize: 16, fontWeight: 750, color: 'var(--color-success)' }}>
          {serviceMetrics.replyRate24h}%
        </div>
      </div>
      <div>
        <Text style={{ color: 'var(--color-ink-muted)', fontSize: 11 }}>家长重复追问</Text>
        <div style={{ marginTop: 3, fontSize: 16, fontWeight: 750, color: 'var(--color-primary)' }}>
          {serviceMetrics.parentFollowUps} 次
        </div>
      </div>
      {serviceMetrics.pendingByTeacher.length > 0 && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
          {serviceMetrics.pendingByTeacher.slice(0, 8).map((item: { name: string; count: number }) => (
          <Tag key={item.name} style={{ margin: 0, borderRadius: 9999, border: 0, background: 'var(--color-primary-bg)', color: 'var(--color-warning-text)' }}>
              {item.name}待回复 {item.count}
            </Tag>
          ))}
        </div>
      )}
    </div>
  )

  const filterBar = (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'minmax(220px,1fr) 170px 160px', gap: 8, marginBottom: 10 }}>
      <Input prefix={<SearchOutlined style={{ color: 'var(--color-ink-subtle)' }} />} placeholder="搜索家长/老师/学员/内容"
        value={search} onChange={e => setSearch(e.target.value)} allowClear
        style={{ gridColumn: isMobile ? '1 / -1' : undefined, minWidth: 0, height: 42, borderRadius: 10 }} />
      <AdaptiveSelect allowClear placeholder="按老师" value={teacherFilter || undefined}
        onChange={v => setTeacherFilter(v || '')} options={teacherOptions} style={{ width: '100%', height: 42 }}
        showSearch filterOption={(i, o) => String(o?.label || '').includes(i)} />
      <AdaptiveSelect value={filter} onChange={v => setFilter(v)} style={{ width: '100%', height: 42 }}
        options={[
          { value: 'ALL', label: '全部状态' },
          { value: 'PENDING_TEACHER', label: '待教师回复' },
          { value: 'PENDING_PARENT', label: '待家长查看' },
          { value: 'CLOSED', label: '已关闭' },
        ]} />
    </div>
  )

  const conversationList = (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))', gap: 10 }}>
      {messages.length === 0 ? (
        <div style={{ gridColumn: '1 / -1', background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)', borderRadius: 16, padding: '36px 16px' }}>
          <Empty description={search || teacherFilter ? '没有匹配的会话' : '暂无留言'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : messages.map(m => (
        <ConversationItem key={m.id} msg={m} active={m.id === activeId} onClick={() => handleSelect(m.id)} />
      ))}
    </div>
  )

  const clearChatState = () => {
    setActiveId(null)
    setShowSticker(false)
    setShowEmoji(false)
    setPendingImage(null)
    setReplyText('')
  }

  const emojiOptions = ['😀', '😄', '😊', '🥰', '😅', '🤔', '👍', '🙏', '❤️', '✨', '🎉', '💪', '📚', '✅', '💡']
  const activeSubjectColor = active?.subject ? SUBJECT_COLORS[active.subject] : null

  const chatPanel = active ? (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-surface-1)' }}>
      <div style={{
        padding: isMobile ? 'max(12px, env(safe-area-inset-top)) 14px 12px' : '15px 20px',
        borderBottom: '1px solid var(--color-hairline)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 10 : 11,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <StudentAvatar photoUrl={null} gender={active.student?.gender} name={active.student?.name || active.parent.name} size={isMobile ? 42 : 48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ display: 'block', fontSize: 15, color: 'var(--color-ink)' }} ellipsis>
            {active.student?.name || active.parent.name}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>{active.parent.name} · 家长</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--color-ink-subtle)' }} />
            <Avatar
              size={20}
              src={active.teacher ? getTeacherAvatarUrl(active.teacher.avatar, active.teacher.gender, active.teacher.id) : undefined}
              style={{ background: 'var(--color-surface-3)', color: 'var(--color-ink-muted)', fontSize: 10 }}
            />
            <span style={{ color: 'var(--color-ink-muted)', fontSize: 11 }}>{active.teacher ? `${active.teacher.name}老师` : '待分配教师'}</span>
            {active.subject && activeSubjectColor && (
              <span style={{ padding: '2px 7px', borderRadius: 999, background: activeSubjectColor.bg, color: activeSubjectColor.color, fontSize: 10 }}>{active.subject}</span>
            )}
          </div>
        </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, justifyContent: isMobile ? 'flex-end' : 'initial' }}>
          {active.teacher && isPendingTeacherReply(active) && active.status !== 'CLOSED' && (
            <Button size="small" icon={<BellOutlined />} onClick={handleRemindTeacher} loading={reminding} style={{ borderRadius: 9, color: 'var(--color-primary-focus)', borderColor: 'var(--color-primary)' }}>
              提醒老师
            </Button>
          )}
          {active.status !== 'CLOSED' && (
            <Button size="small" onClick={handleClose} loading={closing} style={{ borderRadius: 9, color: 'var(--color-ink-muted)' }}>
              结束会话
            </Button>
          )}
          <Button type="text" icon={<CloseOutlined />} aria-label="关闭聊天" onClick={clearChatState} style={{ color: 'var(--color-ink-muted)' }} />
        </div>
      </div>

      <div style={{ padding: '8px 18px', background: 'var(--color-primary-bg)', borderBottom: '1px solid var(--color-hairline)', color: 'var(--color-ink-caption)', fontSize: 11, lineHeight: 1.5, flexShrink: 0 }}>
        请通过平台沟通，便于家长与任课老师持续查看完整记录。
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isMobile ? '16px 12px' : '22px 24px', background: 'var(--color-canvas)' }}>
        {active.replies.length ? active.replies.map(reply => <ChatBubble key={reply.id} reply={reply} />) : (
          <div style={{ minHeight: 180, display: 'grid', placeItems: 'center', color: 'var(--color-ink-subtle)', fontSize: 13 }}>
            还没有对话内容
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {active.status !== 'CLOSED' ? (
        <div style={{ borderTop: '1px solid var(--color-hairline)', padding: isMobile ? '10px 10px max(10px, env(safe-area-inset-bottom))' : '12px 16px', background: 'var(--color-surface-1)', flexShrink: 0, position: 'relative' }}>
          {pendingImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, padding: 7, borderRadius: 11, background: 'var(--color-surface-2)', border: '1px solid var(--color-hairline)' }}>
              <img src={pendingImage} alt="待发送图片预览" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
              <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>图片已上传，发送后家长可查看</span>
              <Button type="text" size="small" aria-label="移除图片" icon={<CloseOutlined />} onClick={() => setPendingImage(null)} style={{ marginLeft: 'auto' }} />
            </div>
          )}
          {(showSticker || showEmoji) && (
            <div style={{ position: 'absolute', right: isMobile ? 8 : 16, bottom: 'calc(100% + 8px)', zIndex: 30, maxWidth: 'calc(100vw - 32px)' }}>
              {showSticker ? (
                <StickerPanel compact onPick={sticker => { void handleReply(STICKER_MARK(sticker.id)) }} />
              ) : (
                <div style={{ width: 260, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, padding: 9, border: '1px solid var(--color-hairline-strong)', borderRadius: 14, background: 'var(--color-surface-1)', boxShadow: 'var(--shadow-overlay)' }}>
                  {emojiOptions.map(emoji => (
                    <button key={emoji} type="button" aria-label={`插入表情 ${emoji}`} onClick={() => { setReplyText(text => text + emoji); setShowEmoji(false) }} style={{ border: 0, borderRadius: 8, background: 'transparent', padding: 5, fontSize: 21, cursor: 'pointer' }}>{emoji}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="上传图片"
            style={{ display: 'none' }}
            onChange={event => {
              const file = event.currentTarget.files?.[0]
              if (file) void handleUploadImage(file)
              event.currentTarget.value = ''
            }}
          />
          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
            <Button aria-label="上传图片" icon={<PictureOutlined />} loading={uploading} disabled={uploading} onClick={() => fileInputRef.current?.click()} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10 }} />
            <Button aria-label="选择表情" icon={<SmileOutlined />} onClick={() => { setShowEmoji(value => !value); setShowSticker(false) }} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: showEmoji ? 'var(--color-primary-bg)' : undefined, color: showEmoji ? 'var(--color-primary)' : undefined }} />
            <Button aria-label="发送小羊表情包" onClick={() => { setShowSticker(value => !value); setShowEmoji(false) }} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, padding: 0, background: showSticker ? 'var(--color-primary-bg)' : undefined }}>🐑</Button>
            <TextArea
              value={replyText}
              onChange={event => setReplyText(event.target.value)}
              placeholder="以管理员身份回复…"
              autoSize={{ minRows: 1, maxRows: 4 }}
              onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleReply() } }}
              style={{ borderRadius: 10, flex: 1, minWidth: 0, resize: 'none' }}
            />
            <Button type="primary" aria-label="发送消息" icon={<SendOutlined />} loading={submitting} disabled={!replyText.trim() && !pendingImage} onClick={() => void handleReply()} style={{ width: 40, height: 38, flexShrink: 0, borderRadius: 10, background: 'var(--color-primary)' }} />
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-hairline)', textAlign: 'center', flexShrink: 0 }}>
          <Text style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}><CheckCircleOutlined style={{ marginRight: 6, color: 'var(--color-success)' }} />该会话已结束</Text>
        </div>
      )}
    </div>
  ) : null

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <Title level={4} style={{ margin: '0 0 3px', color: 'var(--color-ink)' }}>家长沟通</Title>
          <Text style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>查看家长、学生与任课老师的完整留言往来</Text>
        </div>
        <Tag style={{ margin: 2, border: 0, borderRadius: 999, background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: 11, whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, marginRight: 6, borderRadius: '50%', background: 'var(--color-success)', verticalAlign: 'middle' }} />实时同步
        </Tag>
      </div>

      {statCards}
      {servicePanel}

      <div style={{ marginBottom: 10 }}>
        {filterBar}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '2px 2px 10px' }}>
          <div>
            <Text strong style={{ fontSize: 15, color: 'var(--color-ink)' }}>沟通记录</Text>
            <Text style={{ color: 'var(--color-ink-muted)', fontSize: 12, marginLeft: 8 }}>{messages.length} 个会话</Text>
          </div>
          {stats.pendingTeacher > 0 && <Badge count={stats.pendingTeacher} overflowCount={99} color="var(--color-primary)" title={`${stats.pendingTeacher} 条待教师回复`} />}
        </div>
      </div>

      {conversationList}

      <BrandModal
        open={Boolean(activeId)}
        onCancel={clearChatState}
        getContainer={() => document.body}
        className="communication-chat-fullscreen"
        footer={null}
        title={null}
        closable={false}
        mobileFullHeight
        width="100vw"
        style={{ top: 0, maxWidth: 'none', paddingBottom: 0, margin: 0, width: '100vw' }}
        styles={{
          mask: { background: 'rgba(26,18,1,.46)' },
          content: { padding: 0, borderRadius: 0, overflow: 'hidden', background: 'var(--color-surface-1)', height: '100dvh', maxHeight: '100dvh', display: 'flex', flexDirection: 'column' },
          body: { padding: 0, flex: 1, minHeight: 0, maxHeight: 'none', display: 'flex', flexDirection: 'column' },
        }}
      >
        {chatPanel}
      </BrandModal>
    </div>
  )
}
