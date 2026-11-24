'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Avatar, Badge, Button, Form, Input, Radio,
  Select, Tag, Typography,
} from 'antd'
import {
  PlusOutlined, SendOutlined, MessageOutlined,
  UserOutlined, CloseOutlined, CheckCircleOutlined,
  BookOutlined, ContactsOutlined, EditOutlined, FileTextOutlined,
  PictureOutlined, LeftOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { isParentUnreadCountsCacheKey } from '@/lib/parent-unread-cache'
import { usePausableSWR } from '@/lib/use-pausable-swr'
import { fmtDateTime } from '@/lib/format-date'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { shouldSearchChoices, shouldUseInlineChoices } from '@/lib/choice-thresholds'

// 老师等级直接引用 constants/teacher-tier.ts 的 TIER_THEME
import { PullToRefresh } from '@/components/PullToRefresh'
import { useIsMobile } from '@/hooks/useIsMobile'
import { rememberParentChild } from '@/lib/parent-child-preference'
import { findParentChildSelection } from '@/lib/parent-child-selection'
import { SUBJECT_COLORS } from '@/constants/subjects'
import { TIER_THEME, resolveTier } from '@/constants/teacher-tier'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { SafeFormModal } from '@/components/Common/SafeFormModal'
import { BrandModal } from '@/components/Common/BrandModal'
import { STICKER_MARK, stickerPreview, isStickerMarker } from '@/constants/stickers'
import { StickerPanel } from '@/components/Parent/StickerPanel'
import { StickerMessageContent } from '@/components/Parent/StickerMessageContent'
import { uploadMessageImage } from '@/lib/client-image-upload'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'

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
  attachments?: Array<{ url: string; name?: string; type?: string }> | null
}
type Message = {
  id: string; title: string; subject: string | null; status: string
  teacher: { id: string; name: string; avatar?: string | null; gender?: string | null } | null
  student: { id: string; name: string } | null
  replies: Reply[]
  updatedAt: string; createdAt: string
}
type Student = { id: string; name: string; grade: string | null; recordIds: string[]; membershipLevel?: string | null }
type TeacherRecommendation = { id: string; name: string; subject: string | null; source: 'lesson' | 'group'; avatar?: string | null; tierLevel?: string | null; subjects?: string | null; gender?: string | null }

function unreadCount(msg: Message) {
  return msg.replies.filter(r => !r.isReadByParent && r.role !== 'parent').length
}

const PARENT_QUICK_INQUIRIES = [
  { label: '💬 问课堂表现', text: '老师您好，请问孩子今天在课堂上的专注度和互动积极性怎么样？' },
  { label: '📝 核对作业任务', text: '老师您好，想和您核对一下孩子今晚需要完成的作业与订正任务有哪几项？' },
  { label: '🎯 巩固复习建议', text: '老师，这节课的核心公式与知识点，孩子回家复习时建议先看哪部分？' },
  { label: '⏰ 咨询请假补课', text: '老师您好，孩子近期有事需要协调请假，请问可以安排什么时间段补课呢？' },
  { label: '🙏 表达感谢', text: '非常感谢老师耐心的辅导与陪伴，孩子近来学习状态提升很多！' },
]

function RoleAvatar({ role }: { role: string }) {
  const isParent = role === 'parent'
  return (
    <Avatar
      size={32}
      icon={<UserOutlined />}
      style={{ background: isParent ? '#E8784A' : '#1D9E75', flexShrink: 0 }}
    />
  )
}

function ChatBubble({ reply, isOwn, onMediaLoad }: { reply: Reply; isOwn: boolean; onMediaLoad?: () => void }) {
  const isSticker = isStickerMarker(reply.content)
  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      gap: 8,
      alignItems: 'flex-end',
      marginBottom: 10,
    }}>
      <RoleAvatar role={reply.role} />
      <div style={{ maxWidth: '75%', minWidth: 40 }}>
        <div style={{
          fontSize: 11,
          color: '#9a8e7a',
          marginBottom: 3,
          textAlign: isOwn ? 'right' : 'left',
        }}>
          {reply.authorName} · {fmtDateTime(reply.createdAt)}
        </div>
        {isSticker ? (
          <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
            <StickerMessageContent
              content={reply.content}
              animated
              style={{ width: 100, height: 100, objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div style={{
            background: isOwn ? '#E8784A' : '#fff',
            color: isOwn ? '#fff' : '#1a1201',
            border: isOwn ? 'none' : '1px solid rgba(0,0,0,.08)',
            borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            padding: '8px 12px',
            fontSize: 14,
            lineHeight: 1.55,
            boxShadow: '0 1px 4px rgba(0,0,0,.04)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {reply.content}
          </div>
        )}
        {reply.attachments && reply.attachments.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reply.attachments.map((att, i) => (
              <img
                key={i}
                src={att.url}
                alt={att.name || '图片'}
                onLoad={onMediaLoad}
                style={{
                  maxWidth: 220, maxHeight: 220, borderRadius: 10, cursor: 'pointer',
                  display: 'block', objectFit: 'cover',
                }}
                onClick={() => window.open(att.url, '_blank')}
              />
            ))}
          </div>
        )}
        {isOwn && (
          <div style={{ marginTop: 2, fontSize: 10, color: '#9A8E7A', textAlign: 'right' }}>
            {reply.isReadByTeacher ? '老师已查看' : '老师未查看'}
          </div>
        )}
        {!isOwn && (
          <div style={{ marginTop: 2, fontSize: 10, color: '#9A8E7A' }}>
            {reply.isReadByParent ? '已查看' : '新回复'}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageCard({
  msg, onClick, active, index = 0,
}: { msg: Message; onClick: () => void; active: boolean; index?: number }) {
  const unread = unreadCount(msg)
  const lastReply = msg.replies[msg.replies.length - 1]
  const subjectColor = msg.subject ? SUBJECT_COLORS[msg.subject] : null

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="stagger-item"
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
        animationDelay: `${Math.min(index, 8) * 40}ms`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <Text strong style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>{msg.title}</Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {unread > 0 && <Badge count={unread} size="small" />}
          <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
            {(msg.updatedAt || msg.createdAt || '').slice(5, 10)}
          </Text>
        </div>
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
          {stickerPreview(lastReply.content)}
        </Text>
      )}
    </button>
  )
}

export function ParentMessagesClient({
  students, initialMessages, teacherRecommendations, initialActiveChildId,
}: {
  students: Student[]
  initialActiveChildId: string
  initialMessages: Message[]
  teacherRecommendations: Record<string, TeacherRecommendation[]>
}) {
  const isMobile = useIsMobile() ?? false
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showSticker, setShowSticker] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const replySubmittingRef = useRef(false)
  const readCountSyncRef = useRef('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate: mutateSWR } = useSWRConfig()

  const handleMobileBack = useCallback(() => {
    if (showSticker) { setShowSticker(false); return true }
    if (showEmoji) { setShowEmoji(false); return true }
    if (showCompose) { setShowCompose(false); return true }
    if (activeId) { setActiveId(null); return true }
    return false
  }, [activeId, showCompose, showEmoji, showSticker])

  useMobileBackHandler(handleMobileBack, 10)

  const handleUploadImage = async (file: File) => {
    const studentId = active?.student?.id
    if (!studentId) {
      toast.error('当前会话未关联学生，无法上传图片')
      return
    }
    setUploading(true)
    try {
      setPendingImage(await uploadMessageImage(file, studentId))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '图片上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }
  const [composeForm] = Form.useForm()
  const composeValues = Form.useWatch([], composeForm)
  void composeValues
  const composeStudentId = Form.useWatch('studentId', composeForm)
  const recommendedTeachers = composeStudentId ? teacherRecommendations[composeStudentId] || [] : []
  const bottomRef = useRef<HTMLDivElement>(null)

  const [activeChildId, setActiveChildId] = useState<string>(initialActiveChildId || students[0]?.id || '')
  const [filterChildId, setFilterChildId] = useState<string>(activeChildId)
  const { data, mutate, error: messagesError } = usePausableSWR('/api/messages', fetcher, {
    fallbackData: { messages: initialMessages },
    refreshInterval: 5_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const {
    data: activeDetail,
    error: activeDetailError,
    isLoading: activeDetailLoading,
    mutate: mutateActiveDetail,
  } = usePausableSWR<Message>(activeId ? `/api/messages/${activeId}` : null, fetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const allMessages: Message[] = data?.messages || []
  const selectedRecordIds = new Set(students.find((student) => student.id === filterChildId)?.recordIds || [])
  const filtered = filterChildId
    ? allMessages.filter(m => !m.student || selectedRecordIds.has(m.student.id))
    : allMessages
  // 每个老师只保留最新一条对话（按updatedAt排序，已按desc排过）
  const seenTeachers = new Set<string>()
  const messages = filtered.filter(m => {
    if (!m.teacher) return true
    if (seenTeachers.has(m.teacher.id)) return false
    seenTeachers.add(m.teacher.id)
    return true
  })
  const active = activeDetail?.id === activeId
    ? activeDetail
    : messages.find(m => m.id === activeId) || null

  useEffect(() => {
    if (!activeId || activeDetail?.id !== activeId) return
    const readStateKey = `${activeId}:${activeDetail.replies.length}`
    if (readCountSyncRef.current === readStateKey) return
    readCountSyncRef.current = readStateKey
    void mutateSWR(isParentUnreadCountsCacheKey).catch(() => {
      toast.warning('消息已打开，但未读角标暂时无法同步，请稍后刷新')
    })
  }, [activeId, activeDetail?.id, activeDetail?.replies.length, mutateSWR])

  useEffect(() => {
    const requestedChildId = new URLSearchParams(window.location.search).get('childId')
    const selected = findParentChildSelection(students, requestedChildId)
    if (!selected) return
    setActiveChildId(selected.id)
    setFilterChildId(selected.id)
    rememberParentChild(selected.id, selected.membershipLevel)
  }, [students])

  const selectChild = (studentId: string) => {
    setFilterChildId(studentId)
    setActiveChildId(studentId)
    setActiveId(null)
    setReplyText('')
    rememberParentChild(studentId, students.find((student) => student.id === studentId)?.membershipLevel)
    const params = new URLSearchParams(window.location.search)
    params.set('childId', studentId)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }

  const conversationRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = false) => {
    const el = conversationRef.current
    if (el) {
      if (smooth) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      } else {
        el.scrollTop = el.scrollHeight
      }
    } else if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }
  }, [])

  useEffect(() => {
    if (!activeId) return
    scrollToBottom(false)
    const t1 = window.setTimeout(() => scrollToBottom(false), 50)
    const t2 = window.setTimeout(() => scrollToBottom(true), 200)
    const t3 = window.setTimeout(() => scrollToBottom(true), 400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [activeId, active?.replies.length, scrollToBottom])

  useEffect(() => {
    if (pendingImage || showEmoji || showSticker) {
      scrollToBottom(true)
    }
  }, [pendingImage, showEmoji, showSticker, scrollToBottom])

  useEffect(() => {
    if (isMobile && active) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isMobile, active])

  useEffect(() => {
    if (!showCompose || !composeStudentId) return
    const recommendation = teacherRecommendations[composeStudentId]?.[0]
    composeForm.setFieldsValue({
      teacherId: recommendation?.id,
      subject: recommendation?.subject || composeForm.getFieldValue('subject') || undefined,
    })
  }, [composeForm, composeStudentId, showCompose, teacherRecommendations])

  const handleSelect = (id: string) => {
    setActiveId(id)
  }

  // 点击老师名片，先找已有对话，没有再创建
  const handleClickTeacher = async (teacher: TeacherRecommendation) => {
    // 查找是否已有和这个老师的对话
    const existing = messages.find(m => m.teacher?.id === teacher.id && (m.status === 'OPEN' || m.status === 'REPLIED' || m.status === 'READ'))
    if (existing) {
      await handleSelect(existing.id)
      return
    }
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `与${teacher.name}老师沟通`,
          content: '老师您好，想咨询一下孩子的学习情况。',
          studentId: filterChildId || null,
          teacherId: teacher.id,
          subject: teacher.subject || null,
        }),
      })
      if (!res.ok) { toast.error('创建对话失败'); return }
      const msg: Message = await res.json()
      await mutate()
      setActiveId(msg.id)
    } catch { toast.error('网络错误') }
  }

  const handleReply = async (stickerId?: string) => {
    const content = stickerId ? STICKER_MARK(stickerId) : replyText.trim()
    if (replySubmittingRef.current || !activeId || (!content && !pendingImage)) return
    replySubmittingRef.current = true
    setSubmitting(true)
    try {
      const res = await fetch(`/api/messages/${activeId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          attachments: pendingImage ? [{ url: pendingImage, type: 'image' }] : [],
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null
        toast.error(data?.error || `发送失败（${res.status}）`)
        return
      }
      if (!stickerId) setReplyText('')
      setPendingImage(null)
      toast.success('发送成功')
      mutate()
      void mutateActiveDetail()
    } catch { toast.error('网络错误') }
    finally {
      replySubmittingRef.current = false
      setSubmitting(false)
    }
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

      <div
        ref={conversationRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px',
          background: '#faf8f5',
          overscrollBehavior: 'contain',
        }}
      >
        {activeId && activeDetailError && activeDetail?.id !== activeId ? (
          <div role="alert" style={{ margin: '36px auto', maxWidth: 320, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
            <div style={{ marginBottom: 10 }}>完整对话加载失败，请检查网络后重试。</div>
            <Button onClick={() => void mutateActiveDetail()}>重新加载</Button>
          </div>
        ) : activeId && activeDetailLoading && activeDetail?.id !== activeId ? (
          <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 2px' }}>
            {[0, 1, 2].map((skeletonIndex) => (
              <div key={skeletonIndex} style={{ display: 'flex', flexDirection: skeletonIndex === 1 ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                <div className="mz-skeleton" style={{ width: 32, height: 32, borderRadius: 12, flexShrink: 0 }} />
                <div style={{ maxWidth: '70%', minWidth: 60 }}>
                  <div className="mz-skeleton" style={{ width: 80, height: 10, borderRadius: 6, marginBottom: 6 }} />
                  <div className="mz-skeleton" style={{ width: skeletonIndex === 1 ? 120 : 180, height: 14, borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : !active ? (
          <div style={{ marginTop: 36 }}><GuidedEmpty title="选择一条留言查看对话" description="家长留言和老师回复会集中显示在这里，选择左侧记录即可继续沟通。" actionLabel={messages[0] ? '打开最新留言' : undefined} onAction={messages[0] ? () => handleSelect(messages[0].id) : undefined} compact /></div>
        ) : (
          <>
            {active.replies.map(r => (
              <ChatBubble key={r.id} reply={r} isOwn={r.role === 'parent'} onMediaLoad={() => scrollToBottom(false)} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {pendingImage && (
        <div style={{ padding: '8px 14px', background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <img src={pendingImage} alt="待发送图片预览" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
          <span style={{ fontSize: 12, color: '#666' }}>图片已就绪，发送时将一同提交</span>
          <button
            type="button"
            aria-label="移除待发送图片"
            onClick={() => setPendingImage(null)}
            style={{ marginLeft: 'auto', width: 36, height: 36, border: 'none', background: 'none', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CloseOutlined />
          </button>
        </div>
      )}

      {active && active.status !== 'CLOSED' && (
        <>
          {/* 家长常用快捷问话气泡 */}
          <div style={{
            display: 'flex',
            gap: 6,
            padding: '7px 14px 5px',
            background: '#FAF8F4',
            borderTop: '1px solid rgba(0,0,0,.06)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            flexShrink: 0,
          }}>
            {PARENT_QUICK_INQUIRIES.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReplyText((prev) => (prev ? `${prev} ${q.text}` : q.text))}
                style={{
                  flexShrink: 0,
                  padding: '4px 10px',
                  borderRadius: 14,
                  fontSize: 11.5,
                  background: '#FFFFFF',
                  border: '1px solid rgba(20, 87, 77, 0.18)',
                  color: '#14574D',
                  cursor: 'pointer',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
                title={q.text}
              >
                {q.label}
              </button>
            ))}
          </div>

          <div style={{
            padding: '10px 14px',
            background: '#fff',
            borderTop: '1px solid rgba(0,0,0,.07)',
            flexShrink: 0,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            position: 'relative',
          }}>
          {showSticker && (
            <div style={{ position: 'absolute', right: 16, bottom: 'calc(100% + 8px)', zIndex: 30, maxHeight: 180, overflowY: 'auto', background: '#FFFFFF', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <StickerPanel onPick={(s) => { void handleReply(s.id); setShowSticker(false) }} />
            </div>
          )}
          {showEmoji && (
            <div
              style={{
                position: 'absolute',
                right: 16,
                bottom: 'calc(100% + 8px)',
                zIndex: 30,
                background: '#FFFFFF',
                border: '1px solid rgba(0,0,0,.08)',
                borderRadius: 14,
                padding: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 6,
              }}
            >
              {['😊','🙏','👍','🌹','💪','📚','✏️','🎉','❤️','🙌','🤝','💯','📝','🌟','☕'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setReplyText((t) => t + emoji)
                    setShowEmoji(false)
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: 'none',
                    background: '#fafafa',
                    fontSize: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleUploadImage(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label="上传图片"
            title="上传图片"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: '#F5F5F5',
              cursor: uploading ? 'wait' : 'pointer',
              fontSize: 16,
              color: '#555',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PictureOutlined />
          </button>
          <button
            type="button"
            onClick={() => { setShowSticker((v) => !v); setShowEmoji(false) }}
            aria-expanded={showSticker}
            aria-label="打开小羊表情面板"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: showSticker ? '#E7F3EE' : '#f5f5f5',
              cursor: 'pointer',
              fontSize: 17,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🐑
          </button>
          <button
            type="button"
            onClick={() => { setShowEmoji((v) => !v); setShowSticker(false) }}
            aria-expanded={showEmoji}
            aria-label="打开表情面板"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: showEmoji ? '#E7F3EE' : '#f5f5f5',
              cursor: 'pointer',
              fontSize: 17,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            😊
          </button>
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="补充说明或追问..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleReply()
              }
            }}
            style={{
              flex: 1,
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 20,
              padding: '8px 14px',
              fontSize: 14,
              outline: 'none',
              background: '#FAFAFA',
            }}
          />
          <button
            type="button"
            aria-label="发送消息"
            onClick={() => void handleReply()}
            disabled={(!replyText.trim() && !pendingImage) || submitting}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: replyText.trim() || pendingImage ? 'var(--color-primary)' : '#CCC',
              color: '#FFF',
              cursor: replyText.trim() || pendingImage ? 'pointer' : 'not-allowed',
              fontSize: 16,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <SendOutlined />
          </button>
        </div>
        </>
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
      title={(
        <div>
          <div style={{ fontSize: 11.5, color: '#C9A45C', fontWeight: 700, letterSpacing: .5 }}>家长端 · 家校沟通</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#123C35', marginTop: 2 }}>向老师提问</div>
          <div style={{ fontSize: 12, color: '#7A6A55', marginTop: 3, fontWeight: 400 }}>提交后，老师一般课后或晚上回复</div>
        </div>
      )}
      width={520}
      mobileHeight="92dvh"
      okText="发送"
      confirmLoading={submitting}
      okButtonProps={{ style: { background: 'linear-gradient(135deg,#F0875B,#E8784A)', border: 'none', borderRadius: 12, minHeight: 46, paddingInline: 30, fontWeight: 700, boxShadow: '0 6px 16px rgba(232,120,74,.28)' } }}
      cancelButtonProps={{ style: { borderRadius: 12, minHeight: 46, paddingInline: 26 } }}
    >
      <Form form={composeForm} layout="vertical" onFinish={handleCompose} style={{ marginTop: 14 }}>
        <Form.Item name="studentId" label={<span><UserOutlined style={{ color: '#E8784A', marginRight: 6 }} />孩子</span>} rules={[{ required: true, message: '请选择孩子' }]}>
          {shouldUseInlineChoices(students.length) ? (
            <Radio.Group
              aria-label="选择联系问题对应的孩子"
              optionType="button"
              buttonStyle="solid"
              size="large"
              style={{ display: 'flex', flexWrap: 'wrap' }}
              options={students.map((student) => ({ value: student.id, label: `${student.name}${student.grade ? `（${student.grade}）` : ''}` }))}
            />
          ) : (
            <Select
              placeholder="选择孩子，系统会自动匹配任课教师"
              style={{ borderRadius: 10, height: 46 }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              listHeight={200}
              virtual={false}
              showSearch={shouldSearchChoices(students.length)}
              optionFilterProp="label"
              placement="bottomLeft"
              options={students.map((student) => ({ value: student.id, label: `${student.name}${student.grade ? `（${student.grade}）` : ''}` }))}
            />
          )}
        </Form.Item>
        <Form.Item name="teacherId" label={<span><ContactsOutlined style={{ color: '#E8784A', marginRight: 6 }} />联系老师</span>} rules={[{ required: true, message: '请选择任课老师' }]}
          extra={recommendedTeachers[0] ? `已优先推荐${recommendedTeachers[0].source === 'lesson' ? '最近课次' : '当前班级'}任课老师，可手动调整` : '请选择孩子当前的任课老师'}>
          {shouldUseInlineChoices(recommendedTeachers.length) ? (
            <Radio.Group
              aria-label="选择联系老师"
              optionType="button"
              buttonStyle="solid"
              size="large"
              style={{ display: 'flex', flexWrap: 'wrap' }}
              options={recommendedTeachers.map((teacher) => ({
                value: teacher.id,
                label: `${teacher.name}老师${teacher.subject ? ` · ${teacher.subject}` : ''}`,
              }))}
            />
          ) : (
            <Select
              placeholder="选择任课老师"
              options={recommendedTeachers.map((teacher) => ({
                value: teacher.id,
                label: `${teacher.name}老师${teacher.subject ? ` · ${teacher.subject}` : ''}`,
              }))}
              style={{ borderRadius: 10, height: 46 }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              listHeight={200}
              virtual={false}
              showSearch={shouldSearchChoices(recommendedTeachers.length)}
              optionFilterProp="label"
              placement="bottomLeft"
            />
          )}
        </Form.Item>
        <Form.Item name="subject" label={<span><BookOutlined style={{ color: '#E8784A', marginRight: 6 }} />学科（可选）</span>}>
          <Select
            placeholder="选择学科"
            allowClear
            style={{ borderRadius: 10, height: 46 }}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            listHeight={200}
            virtual={false}
          >
            {Object.keys(SUBJECT_COLORS).map(s => (
              <Select.Option key={s} value={s}>{s}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="title" label={<span><EditOutlined style={{ color: '#E8784A', marginRight: 6 }} />标题</span>} rules={[{ required: true, message: '请填写标题' }]}>
          <Input placeholder="例如：关于数学作业的问题" maxLength={100} style={{ borderRadius: 10, height: 46 }} />
        </Form.Item>
        <Form.Item name="content" label={<span><FileTextOutlined style={{ color: '#E8784A', marginRight: 6 }} />问题详情</span>} rules={[{ required: true, message: '请填写问题内容' }]}>
          <TextArea
            placeholder="请详细描述您的问题，老师会尽快回复..."
            maxLength={2000}
            rows={5}
            showCount
            style={{ borderRadius: 10 }}
          />
        </Form.Item>
      </Form>
    </SafeFormModal>
  )

  if (isMobile) {
    return (
      <div style={{ padding: '0 0 130px', overflowX: 'clip' }}>
        {/* 主题头部 */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(150deg,#1B4A3D 0%,#0E5E4E 55%,#123C35 100%)',
          borderRadius: '0 0 26px 26px',
          padding: '20px 18px 24px', color: '#fff',
          boxShadow: '0 10px 26px rgba(14,94,78,.22)',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -40, width: 170, height: 170, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.30),transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: -70, left: -40, width: 150, height: 150, borderRadius: 999, background: 'radial-gradient(circle,rgba(255,255,255,.08),transparent 65%)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.68)', letterSpacing: .5 }}>家长端 · 家校沟通</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 10 }}>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: .3, whiteSpace: 'nowrap' }}>家校沟通</span>
              <button onClick={openCompose} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999,
                background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, boxShadow: '0 6px 16px rgba(0,0,0,.18)', flexShrink: 0,
              }}>
                <PlusOutlined /> 向老师提问
              </button>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.80)', marginTop: 8, lineHeight: 1.6, maxWidth: 310 }}>
              作业疑问、课堂表现、学习进度，随时私聊孩子的任课老师
            </div>
          </div>
        </div>

        {students.length > 1 && (
          <div style={{ display: 'flex', gap: 8, margin: '14px 16px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => selectChild(s.id)}
                style={{
                  flexShrink: 0, padding: '7px 16px', borderRadius: 20, fontSize: 13,
                  border: `1.5px solid ${filterChildId === s.id ? '#E8784A' : '#EEE7E1'}`,
                  background: filterChildId === s.id ? 'linear-gradient(135deg,rgba(232,120,74,.14),rgba(232,120,74,.08))' : '#fff',
                  color: filterChildId === s.id ? '#E8784A' : '#5a4e3a',
                  fontWeight: filterChildId === s.id ? 700 : 500,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: filterChildId === s.id ? '0 4px 10px rgba(232,120,74,.14)' : 'none',
                }}
              >
                {s.name}{s.grade ? ` · ${s.grade}` : ''}
              </button>
            ))}
          </div>
        )}

        {/* 任课老师名片列表 */}
        {(() => {
          const teachers = teacherRecommendations[filterChildId] || []
          if (teachers.length === 0) return null
          return (
            <div style={{ margin: '4px 16px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#123C35', marginBottom: 10, paddingLeft: 2 }}>
                任课老师（点击直接沟通）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {teachers.map((teacher, index) => (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => handleClickTeacher(teacher)}
                    className="stagger-item"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: '#fff', border: '1px solid rgba(0,0,0,.07)',
                      borderRadius: 14, padding: '12px 14px', cursor: 'pointer',
                      textAlign: 'left', width: '100%',
                      boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                      animationDelay: `${Math.min(index, 8) * 40}ms`,
                    }}
                  >
                    <Avatar
                      size={44}
                      src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.id)}
                      icon={<UserOutlined />}
                      style={{ background: '#1D9E75', flexShrink: 0, fontSize: 18 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text strong style={{ fontSize: 15, color: '#123C35' }}>{teacher.name}老师</Text>
                        {(() => {
                          const tier = resolveTier(teacher.tierLevel)
                          const theme = TIER_THEME[tier]
                          return (
                            <Tag style={{
                              borderRadius: 9999, fontSize: 10, border: 'none', margin: 0,
                              background: theme.bg, color: theme.accent,
                            }}>
                              {theme.label}
                            </Tag>
                          )
                        })()}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {teacher.subject && (
                          <Tag style={{ borderRadius: 9999, fontSize: 10, border: 'none', margin: 0, background: '#F0F9F5', color: '#1D9E75' }}>
                            {teacher.subject}
                          </Tag>
                        )}
                      </div>
                    </div>
                    <MessageOutlined style={{ color: '#C9A45C', fontSize: 18, flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {Boolean(messagesError) && messages.length > 0 && (
          <div role="alert" style={{ margin: '0 16px 10px', padding: '10px 12px', borderRadius: 10, background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>最新沟通状态暂时无法同步，当前显示的是已加载内容。</span>
            <button type="button" onClick={() => void mutate()} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>重试</button>
          </div>
        )}

        {messagesError && messages.length === 0 ? (
          <div role="alert" style={{ margin: '8px 16px', padding: '28px 20px', borderRadius: 14, background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)', textAlign: 'center', color: 'var(--color-ink-muted)' }}>
            <div style={{ marginBottom: 12 }}>家校沟通暂时无法加载，请检查网络后重试。</div>
            <Button type="primary" onClick={() => void mutate()}>重新加载</Button>
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            margin: '8px 16px', borderRadius: 18,
            border: '1px solid var(--color-hairline)',
            background: 'linear-gradient(180deg,#FBF7EE,#fff)',
            padding: '34px 22px 30px', textAlign: 'center',
          }}>
            <div style={{
              width: 62, height: 62, borderRadius: 22, margin: '0 auto 14px',
              background: 'linear-gradient(135deg,rgba(201,164,92,.22),rgba(232,120,74,.12))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#C9A45C', fontSize: 26,
            }}>
              <MessageOutlined />
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#123C35' }}>和老师聊一聊孩子近况吧</div>
            <div style={{ fontSize: 13, color: '#7A6A55', lineHeight: 1.75, marginTop: 8 }}>
              作业疑问、课堂表现、课程安排，都可以直接私聊孩子的任课老师，及时了解学习进度。
            </div>
            <div style={{ fontSize: 12, color: '#C2572C', marginTop: 10, fontWeight: 600 }}>
              老师课后或晚上回复，请耐心等待
            </div>
            <button onClick={openCompose} style={{
              marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 26px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#1B4A3D,#0E5E4E)', color: '#fff',
              fontWeight: 700, fontSize: 14, boxShadow: '0 8px 20px rgba(14,94,78,.28)',
            }}>
              <PlusOutlined /> 发起第一条留言
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, index) => (
              <MessageCard key={msg.id} msg={msg} index={index} onClick={() => handleSelect(msg.id)} active={false} />
            ))}
          </div>
        )}

        {/* 悬浮提问按钮：方便家长随时私聊老师 */}
        <button onClick={openCompose} aria-label="私聊老师" style={{
          position: 'fixed', right: 16, bottom: 104, zIndex: 40,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'var(--color-primary)', color: 'var(--color-on-primary)',
          fontWeight: 800, fontSize: 14, letterSpacing: .3,
          boxShadow: '0 10px 26px rgba(232,120,74,.38)',
        }}>
          <MessageOutlined /> 私聊老师
        </button>

        {/* 移动端全屏聊天：通过 Portal 直接挂载到 body，彻底消除外层动画容器拉长与截断 */}
        {active && typeof document !== 'undefined' && createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              height: '100dvh',
              maxHeight: '100dvh',
              width: '100vw',
              display: 'flex',
              flexDirection: 'column',
              background: '#FAF8F5',
              overflow: 'hidden',
            }}
          >
            {/* 顶部导航 */}
            <div
              style={{
                padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 12px 10px',
                background: '#FFFFFF',
                borderBottom: '1px solid rgba(0,0,0,.07)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <button
                type="button"
                className="mobile-shell-back"
                aria-label="返回消息列表"
                onClick={() => setActiveId(null)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: 'none',
                  background: '#F5F5F5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: '#333',
                  flexShrink: 0,
                }}
              >
                <LeftOutlined />
              </button>
              <Avatar
                size={36}
                src={getTeacherAvatarUrl(active.teacher?.avatar, active.teacher?.gender, active.teacher?.id)}
                icon={<UserOutlined />}
                style={{ background: '#1D9E75', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#123C35' }}>
                    {active.teacher?.name}老师
                  </span>
                  {active.subject && (
                    <span style={{ fontSize: 11, background: '#E7F3EE', color: '#1D9E75', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                      {active.subject}
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: 'auto',
                      borderRadius: 9999,
                      fontSize: 11,
                      padding: '1px 8px',
                      background: active.status === 'CLOSED' ? '#F5F5F5' : '#FFF6F1',
                      color: active.status === 'CLOSED' ? '#999' : '#E8784A',
                      border: 'none',
                    }}
                  >
                    {active.status === 'CLOSED' ? '已关闭' : '进行中'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                  {active.student ? `${active.student.name} 的家校沟通` : '家校沟通'}
                </div>
              </div>
            </div>

            {/* 消息滚动列表 */}
            <div
              ref={conversationRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 14px',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {active.replies.map((r) => (
                <ChatBubble key={r.id} reply={r} isOwn={r.role === 'parent'} onMediaLoad={() => scrollToBottom(false)} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* 待发送图片预览 */}
            {pendingImage && (
              <div style={{ padding: '8px 12px', background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,.07)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <img src={pendingImage} alt="待发送图片预览" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                <span style={{ fontSize: 12, color: '#666' }}>图片已就绪，发送时将一同提交</span>
                <button
                  type="button"
                  aria-label="移除待发送图片"
                  onClick={() => setPendingImage(null)}
                  style={{ marginLeft: 'auto', width: 36, height: 36, border: 'none', background: 'none', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <CloseOutlined />
                </button>
              </div>
            )}

            {/* 底部输入框 */}
            {active.status !== 'CLOSED' ? (
              <div
                style={{
                  padding: '8px 12px calc(max(env(safe-area-inset-bottom, 0px), 8px) + 4px)',
                  background: '#FFFFFF',
                  borderTop: '1px solid rgba(0,0,0,.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {showSticker && (
                  <div style={{ position: 'absolute', right: 8, bottom: 'calc(100% + 6px)', zIndex: 30, maxHeight: 180, overflowY: 'auto', background: '#FFFFFF', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <StickerPanel onPick={(s) => { void handleReply(s.id); setShowSticker(false) }} />
                  </div>
                )}
                {showEmoji && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 8,
                      bottom: 'calc(100% + 6px)',
                      zIndex: 30,
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,0,0,.08)',
                      borderRadius: 14,
                      padding: 10,
                      boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: 6,
                    }}
                  >
                    {['😊','🙏','👍','🌹','💪','📚','✏️','🎉','❤️','🙌','🤝','💯','📝','🌟','☕'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setReplyText((t) => t + emoji)
                          setShowEmoji(false)
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          border: 'none',
                          background: '#fafafa',
                          fontSize: 18,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleUploadImage(f)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="上传图片"
                  title="上传图片"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: 'none',
                    background: '#F5F5F5',
                    cursor: uploading ? 'wait' : 'pointer',
                    fontSize: 16,
                    color: '#555',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PictureOutlined />
                </button>
                <button
                  type="button"
                  aria-label="打开小羊表情面板"
                  onClick={() => { setShowSticker((v) => !v); setShowEmoji(false) }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: 'none',
                    background: showSticker ? '#E7F3EE' : '#F5F5F5',
                    cursor: 'pointer',
                    fontSize: 17,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  🐑
                </button>
                <button
                  type="button"
                  aria-label="打开表情面板"
                  onClick={() => { setShowEmoji((v) => !v); setShowSticker(false) }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: 'none',
                    background: showEmoji ? '#E7F3EE' : '#F5F5F5',
                    cursor: 'pointer',
                    fontSize: 17,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  😊
                </button>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="输入消息..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleReply()
                    }
                  }}
                  style={{
                    flex: 1,
                    border: '1px solid rgba(0,0,0,0.12)',
                    borderRadius: 20,
                    padding: '8px 14px',
                    fontSize: 14,
                    outline: 'none',
                    background: '#FAFAFA',
                  }}
                />
                <button
                  type="button"
                  aria-label="发送消息"
                  onClick={() => void handleReply()}
                  disabled={(!replyText.trim() && !pendingImage) || submitting}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    background: replyText.trim() || pendingImage ? '#0E5E4E' : '#CCC',
                    color: '#FFF',
                    cursor: replyText.trim() || pendingImage ? 'pointer' : 'not-allowed',
                    fontSize: 16,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <SendOutlined />
                </button>
              </div>
            ) : (
              <div style={{ padding: '10px 16px', background: '#F9F9F9', borderTop: '1px solid rgba(0,0,0,.07)', textAlign: 'center', flexShrink: 0 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>该对话已关闭</Text>
              </div>
            )}
          </div>,
          document.body
        )}

        {composeModal}
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={async () => { await mutate() }}>
    <div>
      {/* 主题头部横幅 */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 20, marginBottom: 16,
        background: 'linear-gradient(145deg,#1B4A3D 0%,#0E5E4E 60%,#123C35 100%)',
        padding: '24px 26px', color: '#fff', boxShadow: '0 10px 26px rgba(14,94,78,.20)',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -30, width: 200, height: 200, borderRadius: 999, background: 'radial-gradient(circle,rgba(201,164,92,.28),transparent 65%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.65)', letterSpacing: .5 }}>家长端 · 家校沟通</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: .3, marginTop: 4 }}>家校沟通</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.80)', marginTop: 8, lineHeight: 1.65, maxWidth: 460 }}>
              作业疑问、课堂表现、学习进度，随时私聊孩子的任课老师，及时了解学习进度。
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCompose}
            style={{
              background: 'linear-gradient(135deg,#F0875B,#E8784A)', border: 'none',
              borderRadius: 12, minHeight: 44, fontWeight: 700, flexShrink: 0,
            }}
          >
            向老师提问
          </Button>
        </div>
      </div>

      {Boolean(messagesError) && messages.length > 0 && (
        <div role="status" style={{ margin: '0 0 12px', padding: '10px 12px', borderRadius: 10, background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>最新沟通状态暂时无法同步，当前显示的是已加载内容。</span>
          <button type="button" onClick={() => void mutate()} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44, padding: '0 8px' }}>重试</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, height: 'calc(100vh - 200px)' }}>
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
                    onClick={() => selectChild(s.id)}
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
              <div style={{ textAlign: 'center', padding: '44px 20px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 20, margin: '0 auto 12px',
                  background: 'linear-gradient(135deg,rgba(201,164,92,.20),rgba(232,120,74,.12))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A45C', fontSize: 24,
                }}>
                  <MessageOutlined />
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#123C35' }}>和老师聊一聊孩子近况吧</div>
                <div style={{ fontSize: 12.5, color: '#7A6A55', lineHeight: 1.7, marginTop: 6, maxWidth: 260, margin: '6px auto 0' }}>
                  作业疑问、课堂表现、课程安排，都可以直接私聊孩子的任课老师。
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCompose}
                  style={{ marginTop: 16, background: 'linear-gradient(135deg,#1B4A3D,#0E5E4E)', border: 'none', borderRadius: 10 }}>
                  发起第一条留言
                </Button>
              </div>
            ) : (
              messages.map((msg, index) => (
                <MessageCard key={msg.id} msg={msg} index={index} onClick={() => handleSelect(msg.id)} active={msg.id === activeId} />
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
