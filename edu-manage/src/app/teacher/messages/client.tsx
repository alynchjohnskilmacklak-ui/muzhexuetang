'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, Badge, Button, Input, Typography } from 'antd'
import {
  BellFilled,
  BellOutlined,
  CheckCircleFilled,
  CloseOutlined,
  CrownFilled,
  LeftOutlined,
  MessageFilled,
  MessageOutlined,
  PictureOutlined,
  SearchOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { usePausableSWR } from '@/lib/use-pausable-swr'
import { fmtDateTime } from '@/lib/format-date'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { SUBJECT_COLORS } from '@/constants/subjects'
import { STICKER_MARK, stickerPreview, isStickerMarker } from '@/constants/stickers'
import { StickerPanel } from '@/components/Parent/StickerPanel'
import { StickerMessageContent } from '@/components/Parent/StickerMessageContent'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { uploadMessageImage } from '@/lib/client-image-upload'
import { resolveTier, TIER_APP, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  getMessageSensitivity,
  sortMessagesWithSensitivity,
  TEACHER_REPLY_GUIDANCE,
} from '@/lib/parent-message-sensitivity'

const { Text } = Typography
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('加载失败（' + response.status + '）')
  return response.json()
}

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
  id: string
  title: string
  subject: string | null
  status: string
  parent: { id: string; name: string }
  student: { id: string; name: string; grade?: string | null; gender?: string | null } | null
  feedback?: { studentNameSnapshot?: string | null } | null
  replies: Reply[]
  updatedAt: string
}

type TeacherSystemMessage = {
  id: string
  type: string
  title: string
  content: string
  readAt: string | null
  createdAt: string
}

type TeacherNotification = {
  id: string
  title: string
  content: string
  type: string
  href: string | null
  link: string | null
  read: boolean
  readAt: string | null
  createdAt: string
}

type TeacherInboxResponse = {
  messages: TeacherSystemMessage[]
  notifications: TeacherNotification[]
}

function unreadCount(msg: Message) {
  return msg.replies.filter((r) => !r.isReadByTeacher && r.role === 'parent').length
}

function getReplySnippet(reply?: Reply | null): string {
  if (!reply) return '暂无沟通内容'
  const trimmed = reply.content?.trim() || ''
  if (trimmed) {
    return stickerPreview(trimmed)
  }
  if (reply.attachments && reply.attachments.length > 0) {
    return '[图片]'
  }
  return '暂无沟通内容'
}

function ChatBubble({
  reply,
  accentColor,
  onMediaLoad,
}: {
  reply: Reply
  accentColor: string
  onMediaLoad?: () => void
}) {
  const isTeacher = reply.role !== 'parent'
  const isSticker = isStickerMarker(reply.content)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isTeacher ? 'row-reverse' : 'row',
        gap: 8,
        alignItems: 'flex-end',
        marginBottom: 10,
      }}
    >
      <Avatar
        size={32}
        icon={<UserOutlined />}
        style={{
          background: isTeacher ? accentColor : '#E8784A',
          flexShrink: 0,
        }}
      />
      <div style={{ maxWidth: '75%', minWidth: 40 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-ink-subtle)',
            marginBottom: 3,
            textAlign: isTeacher ? 'right' : 'left',
          }}
        >
          {reply.authorName} · {fmtDateTime(reply.createdAt)}
        </div>

        {isSticker ? (
          <div style={{ display: 'flex', justifyContent: isTeacher ? 'flex-end' : 'flex-start' }}>
            <StickerMessageContent
              content={reply.content}
              animated
              style={{ width: 100, height: 100, objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div
            style={{
              background: isTeacher ? accentColor : '#FFFFFF',
              color: isTeacher ? '#FFFFFF' : '#1A1201',
              border: isTeacher ? 'none' : '1px solid rgba(0,0,0,0.08)',
              borderRadius: isTeacher ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
              padding: '8px 12px',
              fontSize: 14,
              lineHeight: 1.55,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
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
                  maxWidth: 220,
                  maxHeight: 220,
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'block',
                  objectFit: 'cover',
                }}
                onClick={() => window.open(att.url, '_blank')}
              />
            ))}
          </div>
        )}

        {isTeacher && (
          <div style={{ marginTop: 2, fontSize: 10, color: 'var(--color-ink-subtle)', textAlign: 'right' }}>
            {reply.isReadByParent ? '家长已查看' : '家长未查看'}
          </div>
        )}
        {!isTeacher && (
          <div style={{ marginTop: 2, fontSize: 10, color: 'var(--color-ink-subtle)' }}>
            {reply.isReadByTeacher ? '已查看' : '新留言'}
          </div>
        )}
      </div>
    </div>
  )
}

export function TeacherMessagesClient() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [messageFilter, setMessageFilter] = useState<'ALL' | 'UNREAD'>('ALL')
  const [submitting, setSubmitting] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showSticker, setShowSticker] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showAllTeacherNotices, setShowAllTeacherNotices] = useState(false)
  const submittingRef = useRef(false)
  const readCountSyncRef = useRef('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)

  const handleMobileBack = useCallback(() => {
    if (showSticker) { setShowSticker(false); return true }
    if (showEmoji) { setShowEmoji(false); return true }
    if (activeId) { setActiveId(null); return true }
    return false
  }, [activeId, showEmoji, showSticker])

  useMobileBackHandler(handleMobileBack, 10)
  const { mutate: mutateSWR } = useSWRConfig()

  const { data: dashData } = usePausableSWR<{ teacher?: { id: string; name: string; tierLevel?: string | null } }>(
    '/api/teacher/dashboard',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )

  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const tierTheme = TIER_THEME[currentTier]
  const appTheme = TIER_APP[currentTier]

  // 梯队专属视觉风格
  const tierVisual = useMemo(() => {
    switch (currentTier) {
      case 'MANAGER':
        return {
          gradient: 'linear-gradient(135deg, #241A5E 0%, #4C3FA8 55%, #6B5DC2 100%)',
          shadow: '0 12px 30px rgba(76, 63, 168, 0.32)',
          subColor: '#E2D9F4',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#E2D9F4',
          badgeBorder: 'rgba(226, 217, 244, 0.28)',
          accentColor: '#4C3FA8',
          goldColor: '#FDE68A',
          bannerTag: `🛡️ ${tierTheme.label} · 家校沟通`,
        }
      case 'ELITE':
        return {
          gradient: 'linear-gradient(135deg, #061A17 0%, #0D3732 55%, #18524B 100%)',
          shadow: '0 12px 30px rgba(13, 55, 50, 0.38)',
          subColor: '#F6E9C8',
          badgeBg: 'rgba(201, 164, 92, 0.24)',
          badgeFg: '#F6E9C8',
          badgeBorder: 'rgba(201, 164, 92, 0.38)',
          accentColor: '#0D3732',
          goldColor: '#C9A45C',
          bannerTag: `👑 ${tierTheme.label} · 家校沟通`,
        }
      case 'SENIOR':
        return {
          gradient: 'linear-gradient(135deg, #0B2923 0%, #14574D 55%, #1E7E6F 100%)',
          shadow: '0 12px 30px rgba(20, 87, 77, 0.35)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#14574D',
          goldColor: '#F3D98F',
          bannerTag: `⭐ ${tierTheme.label} · 家校沟通`,
        }
      case 'EXPERIENCED':
        return {
          gradient: 'linear-gradient(135deg, #103B31 0%, #267461 55%, #38957E 100%)',
          shadow: '0 12px 30px rgba(38, 116, 97, 0.32)',
          subColor: '#CCFBF1',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#99F6E4',
          badgeBorder: 'rgba(153, 246, 228, 0.25)',
          accentColor: '#267461',
          goldColor: '#FDE68A',
          bannerTag: `🌿 ${tierTheme.label} · 家校沟通`,
        }
      case 'NEW':
      default:
        return {
          gradient: 'linear-gradient(135deg, #174233 0%, #3D8A6F 55%, #52A687 100%)',
          shadow: '0 12px 30px rgba(61, 138, 111, 0.32)',
          subColor: '#D1FAE5',
          badgeBg: 'rgba(255, 255, 255, 0.16)',
          badgeFg: '#A7F3D0',
          badgeBorder: 'rgba(167, 243, 208, 0.25)',
          accentColor: '#3D8A6F',
          goldColor: '#FEF08A',
          bannerTag: `🌱 ${tierTheme.label} · 家校沟通`,
        }
    }
  }, [currentTier, tierTheme])

  const { data, mutate, isLoading, error } = usePausableSWR('/api/messages', fetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  const {
    data: teacherInbox,
    error: teacherInboxError,
    isLoading: teacherInboxLoading,
    mutate: mutateTeacherInbox,
  } = usePausableSWR<TeacherInboxResponse>('/api/teacher/messages', fetcher, {
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

  // 按学生去重
  const seenStudents = new Set<string>()
  const messages = allMessages.filter((m) => {
    const key = m.student?.id || (m.feedback?.studentNameSnapshot ? `single:${m.id}` : m.parent.id)
    if (seenStudents.has(key)) return false
    seenStudents.add(key)
    return true
  })

  // 搜索与未读筛选（敏感诉求加权置顶）
  const filteredMessages = useMemo(() => {
    const list = messages.filter((m) => {
      const sName = m.student?.name || m.feedback?.studentNameSnapshot || m.parent.name || ''
      const parentName = m.parent.name || ''
      const lastReplyContent = m.replies[m.replies.length - 1]?.content || ''
      const unread = unreadCount(m)

      const matchKeyword =
        !searchKeyword.trim() ||
        sName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        parentName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        lastReplyContent.toLowerCase().includes(searchKeyword.toLowerCase())

      const matchUnread = messageFilter === 'ALL' || (messageFilter === 'UNREAD' && unread > 0)
      return matchKeyword && matchUnread
    })
    return sortMessagesWithSensitivity(list)
  }, [messages, searchKeyword, messageFilter])

  // 未读总条数
  const totalUnreadCount = useMemo(() => {
    return messages.reduce((sum, m) => sum + unreadCount(m), 0)
  }, [messages])

  const active = activeDetail?.id === activeId ? activeDetail : allMessages.find((m) => m.id === activeId) || null

  const teacherNotices = [
    ...(teacherInbox?.messages || []).map((message) => ({
      id: message.id,
      kind: 'teacher-message' as const,
      title: message.title,
      content: message.content,
      createdAt: message.createdAt,
      isRead: Boolean(message.readAt),
      label: message.type === 'praise' ? '管理表扬' : '管理提醒',
    })),
    ...(teacherInbox?.notifications || []).map((notification) => ({
      id: notification.id,
      kind: 'notification' as const,
      title: notification.title,
      content: notification.content,
      createdAt: notification.createdAt,
      isRead: notification.read,
      label: notification.type === 'PARENT_MESSAGE' ? '家长留言提醒' : '系统通知',
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const unreadNoticeCount = teacherNotices.filter((notice) => !notice.isRead).length

  const markTeacherNoticeRead = async (id: string, kind: 'notification' | 'teacher-message') => {
    try {
      const response = await fetch(`/api/teacher/messages/${encodeURIComponent(id)}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; success?: boolean }
      if (!response.ok) throw new Error(payload.error || `标记已读失败（${response.status}）`)
      await Promise.all([mutateTeacherInbox(), mutateSWR('/api/teacher/dashboard')])
      if (payload.success) toast.success('已标记为已读')
      else toast.info('这条提醒已处理，列表已刷新')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '标记已读失败，请稍后重试')
    }
  }

  useEffect(() => {
    if (!activeId || activeDetail?.id !== activeId) return
    const readStateKey = `${activeId}:${activeDetail.replies.length}`
    if (readCountSyncRef.current === readStateKey) return
    readCountSyncRef.current = readStateKey
    void mutateSWR('/api/messages/unread-count').catch(() => {
      toast.warning('消息已打开，但未读角标暂时无法同步，请稍后刷新')
    })
  }, [activeId, activeDetail?.id, activeDetail?.replies.length, mutateSWR])

  const isMobile = useIsMobile()

  const scrollToBottom = useCallback((smooth = false) => {
    const el = conversationRef.current
    if (!el) return
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } else {
      el.scrollTop = el.scrollHeight
    }
  }, [])

  useEffect(() => {
    if (!activeId) return
    scrollToBottom(false)
    const t1 = setTimeout(() => scrollToBottom(false), 50)
    const t2 = setTimeout(() => scrollToBottom(true), 200)
    const t3 = setTimeout(() => scrollToBottom(true), 400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
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

  const handleUploadImage = async (file: File) => {
    const studentId = active?.student?.id
    if (!studentId) {
      toast.error('当前会话未关联学生，无法上传图片')
      return
    }
    setUploading(true)
    try {
      const url = await uploadMessageImage(file, studentId)
      setPendingImage(url)
      toast.success('图片已就绪，可输入留言后一同发送')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '图片上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  const handleSelect = (id: string) => {
    setActiveId(id)
    setShowEmoji(false)
    setShowSticker(false)
  }

  const handleReply = async (contentOverride?: string) => {
    const content = contentOverride ?? replyText.trim()
    if (submittingRef.current || !activeId || (!content && !pendingImage)) return
    submittingRef.current = true
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
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error || `发送失败（${res.status}）`)
        return
      }
      if (contentOverride === undefined) setReplyText('')
      setPendingImage(null)
      setShowEmoji(false)
      setShowSticker(false)
      toast.success('回复已发送')
      mutate()
      void mutateActiveDetail()
      setTimeout(() => scrollToBottom(true), 100)
    } catch {
      toast.error('网络错误')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (isLoading) return <CardSkeleton rows={3} />
  if (error && !data) {
    return (
      <div
        role="alert"
        style={{
          margin: 16,
          padding: 16,
          borderRadius: 14,
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-hairline)',
          color: 'var(--color-ink-muted)',
        }}
      >
        <div style={{ marginBottom: 10 }}>家校沟通加载失败，请检查网络后重试。</div>
        <button
          type="button"
          onClick={() => void mutate()}
          style={{
            border: 0,
            borderRadius: 8,
            padding: '7px 12px',
            background: tierVisual.accentColor,
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          重新加载
        </button>
      </div>
    )
  }

  const studentName = active?.student?.name || active?.feedback?.studentNameSnapshot || active?.parent.name || ''

  const renderChatPanel = (inMobileModal = false) => {
    if (!active) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAF8F5', overflow: 'hidden' }}>
        {/* 顶部标题栏 */}
        <div
          style={{
            padding: inMobileModal
              ? 'calc(env(safe-area-inset-top, 0px) + 8px) 12px 10px'
              : '12px 18px',
            background: 'linear-gradient(180deg, #FFFDF9 0%, #FAF6EE 100%)',
            borderBottom: '1px solid rgba(201, 164, 92, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(58, 50, 39, 0.03)',
          }}
        >
          {inMobileModal && (
            <button
              type="button"
              aria-label="返回消息列表"
              onClick={() => setActiveId(null)}
              style={{
                border: 'none',
                background: '#F5F5F5',
                width: 38,
                height: 38,
                borderRadius: 10,
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
          )}
          <StudentAvatar photoUrl={null} gender={active?.student?.gender} name={studentName} size={inMobileModal ? 36 : 40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: inMobileModal ? 15 : 16, color: '#17352F' }}>
                {studentName}
              </Text>
              {active.student?.grade && (
                <span style={{ fontSize: 11, background: '#F0F9F5', color: tierVisual.accentColor, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                  {active.student.grade}
                </span>
              )}
              {active.subject && (
                <span style={{ fontSize: 11, background: '#FFF3E0', color: '#E65100', padding: '1px 6px', borderRadius: 4 }}>
                  {active.subject}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-ink-subtle)', marginTop: 2 }}>
              {active.parent.name.endsWith('家长') ? active.parent.name : `${active.parent.name}家长`}
            </div>
          </div>
          {!inMobileModal && (
            <div style={{ fontSize: 11.5, color: tierVisual.accentColor, fontWeight: 700, background: `${tierVisual.accentColor}12`, padding: '4px 10px', borderRadius: 999 }}>
              {tierTheme.label} · 家校对话
            </div>
          )}
        </div>

        {/* 家长敏感/重点诉求预警条与专业安抚指引 */}
        {(() => {
          const sens = getMessageSensitivity(active)
          if (!sens.isSensitive) return null
          return (
            <div style={{
              margin: inMobileModal ? '8px 12px 0' : '10px 16px 0',
              padding: '8px 12px',
              borderRadius: 10,
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: 12,
              lineHeight: 1.5,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <span>⚠️ 重点诉求预警：</span>
                  <span style={{ color: '#DC2626' }}>{sens.matchedKeywords.join('、')}</span>
                </div>
                <span style={{ fontSize: 11, color: '#B91C1C' }}>建议优先安抚，稳住学习信心</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {TEACHER_REPLY_GUIDANCE.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setReplyText(item.text)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #FECACA',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: 11,
                      color: '#B91C1C',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* 消息滚动列表 */}
        <div
          ref={conversationRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: inMobileModal ? '12px 14px' : '16px 20px',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {activeDetailError && activeDetail?.id !== activeId ? (
            <div role="alert" style={{ margin: '24px auto', maxWidth: 320, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
              <div style={{ marginBottom: 10 }}>完整对话加载失败，请检查网络后重试。</div>
              <Button onClick={() => void mutateActiveDetail()}>重新加载</Button>
            </div>
          ) : activeDetailLoading && activeDetail?.id !== activeId ? (
            <div role="status" aria-live="polite" style={{ padding: 24, textAlign: 'center', color: 'var(--color-ink-subtle)' }}>
              正在加载完整对话…
            </div>
          ) : (
            <>
              {activeDetailError && activeDetail?.id === activeId && (
                <div
                  role="status"
                  style={{
                    marginBottom: 12,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: '#FFF7E8',
                    color: '#8A5A12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    fontSize: 12,
                  }}
                >
                  <span>最新对话暂未同步，当前显示的是已加载内容。</span>
                  <Button size="small" onClick={() => void mutateActiveDetail()}>重试</Button>
                </div>
              )}
              {active.replies.map((reply) => (
                <ChatBubble
                  key={reply.id}
                  reply={reply}
                  accentColor={tierVisual.accentColor}
                  onMediaLoad={() => scrollToBottom(false)}
                />
              ))}
            </>
          )}
        </div>

        {/* 待发送图片预览 */}
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

        {/* 表情面板 */}
        {showEmoji && (
          <div style={{ padding: '10px 14px', background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, maxHeight: 120, overflowY: 'auto' }}>
            {['😀', '😄', '😊', '🥰', '😅', '🤔', '👍', '🙏', '❤️', '✨', '🎉', '💪', '📚', '✅', '💡', '👏', '🎯', '💯'].map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setReplyText((t) => t + e)
                  setShowEmoji(false)
                }}
                style={{ fontSize: 20, border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* 动态小羊表情面板 */}
        {showSticker && active.status !== 'CLOSED' && (
          <div style={{ padding: '10px 14px', background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.07)', flexShrink: 0, maxHeight: 180, overflowY: 'auto' }}>
            <StickerPanel
              onPick={(sticker) => {
                void handleReply(STICKER_MARK(sticker.id))
                setShowSticker(false)
              }}
            />
          </div>
        )}

        {/* 底部输入框 */}
        <div
          style={{
            padding: inMobileModal
              ? '8px 12px calc(max(env(safe-area-inset-bottom, 0px), 8px) + 4px)'
              : '10px 16px',
            background: 'linear-gradient(180deg, #FAF6EE 0%, #FFFDF9 100%)',
            borderTop: '1px solid rgba(201, 164, 92, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUploadImage(file)
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
              background: '#F5F5F5',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: '#555',
              cursor: uploading ? 'wait' : 'pointer',
              flexShrink: 0,
            }}
          >
            <PictureOutlined />
          </button>
          <button
            type="button"
            onClick={() => { setShowSticker((v) => !v); setShowEmoji(false) }}
            aria-label="打开小羊动态表情"
            title="小羊动态表情"
            style={{
              background: showSticker ? '#E7F3EE' : '#F5F5F5',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 17,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            🐑
          </button>
          <button
            type="button"
            onClick={() => { setShowEmoji((v) => !v); setShowSticker(false) }}
            aria-label="打开Emoji表情"
            title="Emoji表情"
            style={{
              background: showEmoji ? '#E7F3EE' : '#F5F5F5',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 17,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            😊
          </button>
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleReply()
              }
            }}
            placeholder="回复家长消息..."
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
            disabled={submitting || (!replyText.trim() && !pendingImage)}
            onClick={() => void handleReply()}
            aria-label="发送消息"
            style={{
              background: replyText.trim() || pendingImage ? tierVisual.accentColor : '#E0E0E0',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: replyText.trim() || pendingImage ? 'pointer' : 'not-allowed',
              boxShadow: replyText.trim() || pendingImage ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          >
            <SendOutlined />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 80, color: '#17352F' }}>
      {/* ========================================================= */}
      {/* 顶部根据老师等级/标签动态渲染专属高光数据看板 (HERO BANNER) */}
      {/* ========================================================= */}
      <div
        style={{
          background: tierVisual.gradient,
          borderRadius: 22,
          padding: '20px 20px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: tierVisual.shadow,
          marginBottom: 16,
        }}
      >
        {/* 背景光晕 */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -25,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: tierVisual.badgeBg,
                border: `1px solid ${tierVisual.badgeBorder}`,
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 800,
                color: tierVisual.badgeFg,
                marginBottom: 8,
                letterSpacing: '0.04em',
              }}
            >
              <MessageFilled style={{ color: tierVisual.goldColor }} />
              <span>{tierVisual.bannerTag}</span>
            </div>
            <div
              style={{
                color: '#FFFFFF !important',
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                textShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}
            >
              家校沟通与消息中心
            </div>
            <div style={{ fontSize: 12.5, color: tierVisual.subColor, marginTop: 5, opacity: 0.95 }}>
              及时回应家长疑难困惑，家校携手助力学员稳步成长
            </div>
          </div>
        </div>

        {/* 核心指标卡片（支持联动筛选） */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginTop: 18,
          }}
        >
          {/* 指标 1：待回复留言 */}
          <div
            onClick={() => setMessageFilter(totalUnreadCount > 0 ? 'UNREAD' : 'ALL')}
            style={{
              background: messageFilter === 'UNREAD' ? 'rgba(224, 120, 61, 0.32)' : 'rgba(255, 255, 255, 0.09)',
              border: messageFilter === 'UNREAD' ? '1.5px solid #FFAB91' : '1px solid rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: messageFilter === 'UNREAD' ? '0 2px 10px rgba(224, 120, 61, 0.25)' : 'none',
            }}
          >
            <div style={{ fontSize: 11, color: totalUnreadCount > 0 ? '#FFE0B2' : tierVisual.subColor }}>待回复留言</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: totalUnreadCount > 0 ? '#FFE082' : '#FFFFFF', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {totalUnreadCount} <span style={{ fontSize: 11, fontWeight: 600 }}>条</span>
            </div>
            <div style={{ fontSize: 10, color: totalUnreadCount > 0 ? '#FFAB91' : tierVisual.subColor, marginTop: 1 }}>
              {totalUnreadCount > 0 ? '⚠️ 点击查看未读' : '暂无待回留言'}
            </div>
          </div>

          {/* 指标 2：沟通家长数 */}
          <div
            onClick={() => setMessageFilter('ALL')}
            style={{
              background: messageFilter === 'ALL' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.09)',
              border: messageFilter === 'ALL' ? `1.5px solid ${tierVisual.goldColor}` : '1px solid rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              borderRadius: 14,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: messageFilter === 'ALL' ? '0 2px 10px rgba(201, 164, 92, 0.2)' : 'none',
            }}
          >
            <div style={{ fontSize: 11, color: tierVisual.subColor }}>关联学员家长</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {messages.length} <span style={{ fontSize: 11, fontWeight: 600 }}>人</span>
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>点击查看全部</div>
          </div>

          {/* 指标 3：系统提醒 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.09)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              borderRadius: 14,
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: 11, color: tierVisual.subColor }}>系统提醒</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {unreadNoticeCount} <span style={{ fontSize: 11, fontWeight: 600 }}>条待读</span>
            </div>
            <div style={{ fontSize: 10, color: tierVisual.subColor, opacity: 0.9, marginTop: 1 }}>管理通知与表扬</div>
          </div>
        </div>
      </div>

      {/* 系统通知提醒板块 (升级为东方雅韵暖白宣纸底板) */}
      <section
        aria-labelledby="teacher-system-notices-title"
        style={{
          marginBottom: 16,
          padding: 16,
          borderRadius: 18,
          background: 'linear-gradient(175deg, #FFFDF9 0%, #FAF6EE 100%)',
          border: '1px solid rgba(201, 164, 92, 0.28)',
          boxShadow: '0 3px 14px rgba(58, 50, 39, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: 8,
                background: 'rgba(20, 87, 77, 0.08)',
                color: '#14574D',
                fontSize: 14,
                border: '1px solid rgba(20, 87, 77, 0.14)',
              }}
            >
              <BellFilled />
            </span>
            <span id="teacher-system-notices-title" style={{ fontSize: 15, fontWeight: 750, color: '#1A1201' }}>
              系统提醒与教务公告
            </span>
          </div>
          <Badge count={unreadNoticeCount} overflowCount={99} />
        </div>

        {teacherInboxLoading && !teacherInbox ? (
          <CardSkeleton rows={2} />
        ) : teacherInboxError && !teacherInbox ? (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: 'var(--color-ink-muted)', fontSize: 13 }}>
            <span>系统提醒暂时无法加载。</span>
            <Button size="small" onClick={() => void mutateTeacherInbox()}>重新加载</Button>
          </div>
        ) : teacherNotices.length === 0 ? (
          <div role="status" style={{ padding: '8px 4px', color: '#756A58', fontSize: 13 }}>
            目前没有新的系统提醒。
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {(showAllTeacherNotices ? teacherNotices : teacherNotices.slice(0, 3)).map((notice) => (
              <article
                key={`${notice.kind}:${notice.id}`}
                style={{
                  padding: '11px 13px',
                  borderRadius: 12,
                  background: notice.isRead
                    ? 'rgba(20, 87, 77, 0.03)'
                    : 'linear-gradient(145deg, #FFFDF8 0%, #FBF5E9 100%)',
                  border: notice.isRead
                    ? '1px solid rgba(20, 87, 77, 0.08)'
                    : '1px solid rgba(201, 164, 92, 0.35)',
                  boxShadow: notice.isRead ? 'none' : '0 2px 6px rgba(58, 50, 39, 0.03)',
                  transition: 'all 0.16s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <Text strong style={{ fontSize: 13.5, color: '#1A1201' }}>
                        {notice.title}
                      </Text>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#14574D',
                          background: 'rgba(20, 87, 77, 0.08)',
                          border: '1px solid rgba(20, 87, 77, 0.18)',
                          padding: '1px 7px',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {notice.label}
                      </span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12.5, lineHeight: 1.55, color: '#5A4E3A', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      {notice.content}
                    </div>
                    <time dateTime={notice.createdAt} style={{ display: 'block', marginTop: 5, fontSize: 11, color: '#8A7D6B', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDateTime(notice.createdAt)}
                    </time>
                  </div>
                  {!notice.isRead && (
                    <button
                      type="button"
                      onClick={() => void markTeacherNoticeRead(notice.id, notice.kind)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'linear-gradient(180deg, #FFFDF8 0%, #F5EFE3 100%)',
                        border: '1px solid rgba(20, 87, 77, 0.24)',
                        color: '#14574D',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(26, 18, 1, 0.03)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      标记已读
                    </button>
                  )}
                </div>
              </article>
            ))}
            {teacherNotices.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllTeacherNotices((value) => !value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  marginTop: 4,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(20, 87, 77, 0.05) 0%, rgba(201, 164, 92, 0.08) 100%)',
                  border: '1px solid rgba(201, 164, 92, 0.25)',
                  color: '#14574D',
                  fontSize: 12.5,
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
              >
                {showAllTeacherNotices ? '收起较早提醒' : `查看其余 ${teacherNotices.length - 3} 条提醒 ➔`}
              </button>
            )}
          </div>
        )}
      </section>

      {/* 桌面端 vs 移动端分流渲染 */}
      {!isMobile ? (
        /* 桌面端：左侧会话列表 + 右侧聚焦聊天面板 */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: 16,
            height: 'calc(100vh - 220px)',
            minHeight: 580,
            background: 'linear-gradient(175deg, #FFFDF9 0%, #FAF6EE 100%)',
            borderRadius: 18,
            border: '1px solid rgba(201, 164, 92, 0.28)',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(58, 50, 39, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
          }}
        >
          {/* 左侧：搜索与会话列表 */}
          <div
            style={{
              borderRight: '1px solid rgba(201, 164, 92, 0.16)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              background: '#FAF6EE',
            }}
          >
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(201, 164, 92, 0.16)', background: 'linear-gradient(180deg, #FFFDF9 0%, #FAF6EE 100%)' }}>
              <Input
                prefix={<SearchOutlined style={{ color: tierVisual.accentColor }} />}
                placeholder="搜索家长、学员或留言..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
                style={{
                  height: 38,
                  borderRadius: 10,
                  border: '1px solid rgba(201, 164, 92, 0.28)',
                  background: '#FFFDF9',
                  marginBottom: 8,
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setMessageFilter('ALL')}
                  style={{
                    background: messageFilter === 'ALL'
                      ? 'linear-gradient(135deg, #186358 0%, #10483f 100%)'
                      : 'linear-gradient(180deg, #FFFDF9 0%, #FAF6EE 100%)',
                    color: messageFilter === 'ALL' ? '#FFFFFF' : '#5A4E3A',
                    border: messageFilter === 'ALL' ? 'none' : '1px solid rgba(201, 164, 92, 0.28)',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 11.5,
                    fontWeight: messageFilter === 'ALL' ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: messageFilter === 'ALL' ? '0 2px 6px rgba(20, 87, 77, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  全部 ({messages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMessageFilter('UNREAD')}
                  style={{
                    background: messageFilter === 'UNREAD'
                      ? 'linear-gradient(135deg, #C2572C 0%, #A8451D 100%)'
                      : 'linear-gradient(180deg, #FFFDF9 0%, #FAF6EE 100%)',
                    color: messageFilter === 'UNREAD' ? '#FFFFFF' : totalUnreadCount > 0 ? '#C2572C' : '#5A4E3A',
                    border: messageFilter === 'UNREAD' ? 'none' : totalUnreadCount > 0 ? '1px solid rgba(194, 87, 44, 0.35)' : '1px solid rgba(201, 164, 92, 0.28)',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 11.5,
                    fontWeight: messageFilter === 'UNREAD' || totalUnreadCount > 0 ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: messageFilter === 'UNREAD' ? '0 2px 6px rgba(194, 87, 44, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  未读 ({totalUnreadCount})
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              {filteredMessages.length === 0 ? (
                <BrandEmpty title="暂无匹配沟通记录" hint="家长发来的问题会显示在这里" icon={<MessageOutlined />} />
              ) : (
                filteredMessages.map((msg) => {
                  const unread = unreadCount(msg)
                  const lastReply = msg.replies[msg.replies.length - 1]
                  const subjectColor = msg.subject ? SUBJECT_COLORS[msg.subject] : null
                  const sName = msg.student?.name || msg.feedback?.studentNameSnapshot || msg.parent.name
                  const parentLabel = msg.parent.name.endsWith('家长') ? msg.parent.name : msg.parent.name + '家长'
                  const isSelected = activeId === msg.id
                  const sens = getMessageSensitivity(msg)

                  return (
                    <button
                      key={msg.student?.id || msg.parent.id}
                      type="button"
                      className="teacher-message-card"
                      aria-label={'查看' + sName + (msg.student?.grade ? '，' + msg.student.grade : '') + '的家校沟通' + (unread ? '，' + unread + '条未读留言' : '')}
                      onClick={() => handleSelect(msg.id)}
                      style={{
                        background: isSelected
                          ? 'linear-gradient(155deg, #FFFDF6 0%, #F5EDE0 100%)'
                          : sens.isSensitive
                          ? 'linear-gradient(155deg, #FFF8F8 0%, #FDF2F2 100%)'
                          : 'linear-gradient(155deg, #FFFDF9 0%, #FAF6EE 100%)',
                        borderRadius: 14,
                        border: isSelected
                          ? '1.5px solid #14574D'
                          : sens.isSensitive
                          ? '1.5px solid #DC2626'
                          : unread > 0
                          ? '1.5px solid rgba(194, 87, 44, 0.45)'
                          : '1px solid rgba(201, 164, 92, 0.28)',
                        boxShadow: isSelected
                          ? '0 3px 12px rgba(20, 87, 77, 0.1)'
                          : sens.isSensitive
                          ? '0 3px 10px rgba(220, 38, 38, 0.12)'
                          : '0 1px 4px rgba(58, 50, 39, 0.02)',
                        marginBottom: 8,
                        textAlign: 'left',
                        cursor: 'pointer',
                        padding: '10px 12px',
                        width: '100%',
                        transition: 'all 0.16s ease',
                      }}
                    >
                      <Badge count={unread} size="small" color="#C2572C" offset={[-3, 4]}>
                        <StudentAvatar photoUrl={null} gender={msg.student?.gender} name={sName} size={42} />
                      </Badge>
                      <div className="teacher-message-card__content" style={{ minWidth: 0, flex: 1 }}>
                        <div className="teacher-message-card__heading">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                            <Text strong className="teacher-message-card__student" style={{ fontSize: 14, color: '#1A1201' }} ellipsis>
                              {sName}
                            </Text>
                            {sens.isSensitive && (
                              <span style={{ fontSize: 10, color: '#DC2626', background: '#FEE2E2', padding: '1px 6px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                ⚠️ 重点诉求: {sens.matchedKeywords.slice(0, 2).join('、')}
                              </span>
                            )}
                          </div>
                          <time className="teacher-message-card__date" dateTime={msg.updatedAt}>
                            {(msg.updatedAt || '').slice(5, 10)}
                          </time>
                        </div>
                        <div className="teacher-message-card__meta" style={{ marginTop: 2, fontSize: 11 }}>
                          <span className={'teacher-message-card__grade' + (msg.student?.grade ? '' : ' is-empty')}>
                            {msg.student?.grade || (msg.feedback?.studentNameSnapshot ? '单次反馈' : '年级待补充')}
                          </span>
                          <span className="teacher-message-card__relation">{parentLabel}</span>
                          {msg.subject && subjectColor && (
                            <span className="teacher-message-card__subject" style={{ background: subjectColor.bg, color: subjectColor.color }}>
                              {msg.subject}
                            </span>
                          )}
                        </div>
                        <div className="teacher-message-card__preview" style={{ marginTop: 2 }}>
                          <span className={`teacher-message-card__speaker ${lastReply?.role === 'parent' ? 'is-parent' : ''}`}>
                            {(lastReply?.role === 'parent' ? '家长' : '我') + '：'}
                          </span>
                          <span className="teacher-message-card__snippet" style={{ fontSize: 12 }}>
                            {getReplySnippet(lastReply)}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* 右侧：聊天面板 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              background: '#FAF8F5',
            }}
          >
            {active ? (
              renderChatPanel(false)
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrandEmpty title="选择一位学员家长开始沟通" hint="在左侧选择对应家长的对话即可查看与回复" icon={<MessageOutlined />} />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 移动端：普通流下渲染列表，点击后由 Portal 挂载全屏聊天（彻底解决定位被容器动画阻断的Bug） */
        <div>
          {/* 搜索与筛选 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <Input
              prefix={<SearchOutlined style={{ color: tierVisual.accentColor }} />}
              placeholder="搜索家长姓名、学员姓名或最近留言..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              style={{
                height: 42,
                borderRadius: 12,
                border: '1px solid rgba(201, 164, 92, 0.28)',
                background: 'linear-gradient(180deg, #FFFDF9 0%, #FAF6EE 100%)',
                boxShadow: 'inset 0 1px 2px rgba(26, 18, 1, 0.02)',
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setMessageFilter('ALL')}
                style={{
                  background: messageFilter === 'ALL'
                    ? 'linear-gradient(135deg, #186358 0%, #10483f 100%)'
                    : 'linear-gradient(180deg, #FFFDF9 0%, #FAF6EE 100%)',
                  color: messageFilter === 'ALL' ? '#FFFFFF' : '#5A4E3A',
                  border: messageFilter === 'ALL' ? 'none' : '1px solid rgba(201, 164, 92, 0.28)',
                  borderRadius: 999,
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: messageFilter === 'ALL' ? 750 : 500,
                  cursor: 'pointer',
                  boxShadow: messageFilter === 'ALL' ? '0 2px 6px rgba(20, 87, 77, 0.25)' : 'none',
                  transition: 'all 0.16s ease',
                }}
              >
                全部会话 ({messages.length})
              </button>
              <button
                type="button"
                onClick={() => setMessageFilter('UNREAD')}
                style={{
                  background: messageFilter === 'UNREAD'
                    ? 'linear-gradient(135deg, #C2572C 0%, #A8451D 100%)'
                    : 'linear-gradient(180deg, #FFFDF9 0%, #FAF6EE 100%)',
                  color: messageFilter === 'UNREAD' ? '#FFFFFF' : totalUnreadCount > 0 ? '#C2572C' : '#5A4E3A',
                  border: messageFilter === 'UNREAD' ? 'none' : totalUnreadCount > 0 ? '1px solid rgba(194, 87, 44, 0.35)' : '1px solid rgba(201, 164, 92, 0.28)',
                  borderRadius: 999,
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: messageFilter === 'UNREAD' || totalUnreadCount > 0 ? 750 : 500,
                  cursor: 'pointer',
                  boxShadow: messageFilter === 'UNREAD' ? '0 2px 6px rgba(194, 87, 44, 0.25)' : 'none',
                  transition: 'all 0.16s ease',
                }}
              >
                仅看未读 ({totalUnreadCount})
              </button>
            </div>
          </div>

          {/* 学生与家长沟通卡片列表 */}
          <div className="teacher-message-list">
            {filteredMessages.length === 0 ? (
              <BrandEmpty title="暂时没有匹配的沟通记录" hint="家长发来的问题会显示在这里" icon={<MessageOutlined />} />
            ) : (
              filteredMessages.map((msg) => {
                const unread = unreadCount(msg)
                const lastReply = msg.replies[msg.replies.length - 1]
                const subjectColor = msg.subject ? SUBJECT_COLORS[msg.subject] : null
                const sName = msg.student?.name || msg.feedback?.studentNameSnapshot || msg.parent.name
                const parentLabel = msg.parent.name.endsWith('家长') ? msg.parent.name : msg.parent.name + '家长'
                const sens = getMessageSensitivity(msg)

                return (
                  <button
                    key={msg.student?.id || msg.parent.id}
                    type="button"
                    className="teacher-message-card"
                    aria-label={'查看' + sName + (msg.student?.grade ? '，' + msg.student.grade : '') + '的家校沟通' + (unread ? '，' + unread + '条未读留言' : '')}
                    onClick={() => handleSelect(msg.id)}
                    style={{
                      background: sens.isSensitive
                        ? 'linear-gradient(155deg, #FFF8F8 0%, #FDF2F2 100%)'
                        : 'linear-gradient(155deg, #FFFDF9 0%, #FAF6EE 100%)',
                      borderRadius: 16,
                      border: sens.isSensitive
                        ? '1.5px solid #DC2626'
                        : unread > 0
                        ? '1.5px solid rgba(194, 87, 44, 0.45)'
                        : '1px solid rgba(201, 164, 92, 0.28)',
                      boxShadow: sens.isSensitive
                        ? '0 3px 12px rgba(220, 38, 38, 0.12)'
                        : unread > 0
                        ? '0 2px 10px rgba(194, 87, 44, 0.08)'
                        : '0 2px 8px rgba(58, 50, 39, 0.03)',
                      marginBottom: 10,
                      width: '100%',
                      padding: '12px 14px',
                      transition: 'all 0.16s ease',
                    }}
                  >
                    <Badge count={unread} size="small" color="#C2572C" offset={[-3, 4]}>
                      <StudentAvatar photoUrl={null} gender={msg.student?.gender} name={sName} size={50} />
                    </Badge>
                    <div className="teacher-message-card__content">
                      <div className="teacher-message-card__heading">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                          <Text strong className="teacher-message-card__student" style={{ fontSize: 15, color: '#1A1201' }} ellipsis>
                            {sName}
                          </Text>
                          {sens.isSensitive && (
                            <span style={{ fontSize: 10, color: '#DC2626', background: '#FEE2E2', padding: '1px 6px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              ⚠️ 重点诉求: {sens.matchedKeywords.slice(0, 2).join('、')}
                            </span>
                          )}
                        </div>
                        <time className="teacher-message-card__date" dateTime={msg.updatedAt}>
                          {(msg.updatedAt || '').slice(5, 10)}
                        </time>
                      </div>
                      <div className="teacher-message-card__meta">
                        <span className={'teacher-message-card__grade' + (msg.student?.grade ? '' : ' is-empty')}>
                          {msg.student?.grade || (msg.feedback?.studentNameSnapshot ? '单次反馈' : '年级待补充')}
                        </span>
                        <span className="teacher-message-card__relation">{parentLabel}</span>
                        {msg.subject && subjectColor && (
                          <span className="teacher-message-card__subject" style={{ background: subjectColor.bg, color: subjectColor.color }}>
                            {msg.subject}
                          </span>
                        )}
                      </div>
                      <div className="teacher-message-card__preview">
                        <span className={`teacher-message-card__speaker ${lastReply?.role === 'parent' ? 'is-parent' : ''}`}>
                          {(lastReply?.role === 'parent' ? '家长' : '我') + '：'}
                        </span>
                        <span className="teacher-message-card__snippet">
                          {getReplySnippet(lastReply)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* 移动端全屏聊天：通过 Portal 直接挂载到 body，免疫一切外层动画/transform导致的定位拉长 */}
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
              {renderChatPanel(true)}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  )
}
