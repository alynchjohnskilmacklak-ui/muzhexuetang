'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar, Badge, Button, Typography } from 'antd'
import { MessageOutlined, SendOutlined, CloseOutlined, LeftOutlined, UserOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { usePausableSWR } from '@/lib/use-pausable-swr'
import { fmtDateTime } from '@/lib/format-date'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { SUBJECT_COLORS } from '@/constants/subjects'
import { STICKER_MARK, stickerPreview } from '@/constants/stickers'
import { StickerPanel } from '@/components/Parent/StickerPanel'
import { StickerMessageContent } from '@/components/Parent/StickerMessageContent'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { uploadMessageImage } from '@/lib/client-image-upload'

const { Text } = Typography
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('加载失败（' + response.status + '）')
  return response.json()
}

type Reply = {
  id: string; authorName: string; role: string
  content: string; isReadByTeacher: boolean; isReadByParent: boolean; createdAt: string
  attachments?: Array<{ url: string; name?: string; type?: string }> | null
}
type Message = {
  id: string; title: string; subject: string | null; status: string
  parent: { id: string; name: string }
  student: { id: string; name: string; grade?: string | null; gender?: string | null } | null
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
      <Avatar size={32} icon={<UserOutlined />} style={{ background: isTeacher ? 'var(--color-success-action)' : 'var(--color-primary)', flexShrink: 0 }} />
      <div style={{ maxWidth: '70%' }}>
        <div style={{ fontSize: 12, color: 'var(--color-ink-subtle)', marginBottom: 4, textAlign: isTeacher ? 'right' : 'left' }}>
          {reply.authorName} · {fmtDateTime(reply.createdAt)}
        </div>
        <div style={{
          background: isTeacher ? 'var(--color-success-action)' : '#fff',
          color: isTeacher ? '#fff' : '#1a1201',
          border: isTeacher ? 'none' : '1px solid rgba(0,0,0,.08)',
          borderRadius: isTeacher ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
          boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          <StickerMessageContent content={reply.content} animated style={{ width: 150, maxWidth: '100%', borderRadius: 12 }} />
          {reply.attachments && reply.attachments.length > 0 && (
            <div style={{ marginTop: reply.content ? 8 : 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reply.attachments.map((att, i) => (
                <img key={i} src={att.url} alt={att.name || '图片'}
                  style={{ maxWidth: '100%', borderRadius: 10, cursor: 'pointer', display: 'block' }}
                  onClick={() => window.open(att.url, '_blank')} />
              ))}
            </div>
          )}
        </div>
        {isTeacher && (
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-ink-subtle)', textAlign: 'right' }}>
            {reply.isReadByParent ? '家长已查看' : '家长未查看'}
          </div>
        )}
        {!isTeacher && (
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-ink-subtle)' }}>
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
  const [submitting, setSubmitting] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showSticker, setShowSticker] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)

  const { data, mutate, isLoading, error } = usePausableSWR('/api/messages', fetcher, {
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
  const messages = allMessages.filter(m => {
    const key = m.student?.id || m.parent.id
    if (seenStudents.has(key)) return false
    seenStudents.add(key)
    return true
  })
  const active = activeDetail?.id === activeId
    ? activeDetail
    : allMessages.find(m => m.id === activeId) || null

  useEffect(() => {
    if (!activeId) return
    const t = setTimeout(() => {
      conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: 'smooth' })
    }, 100)
    return () => clearTimeout(t)
  }, [activeId, active?.replies.length])

  const handleSelect = (id: string) => {
    setActiveId(id)
    setShowEmoji(false)
    setShowSticker(false)
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
    }
    finally { setUploading(false) }
  }

  const handleReply = async (contentOverride?: string) => {
    const content = contentOverride ?? replyText.trim()
    if (!activeId || (!content && !pendingImage)) return
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
      if (!res.ok) { toast.error('发送失败'); return }
      if (contentOverride === undefined) setReplyText('')
      setPendingImage(null)
      setShowEmoji(false)
      setShowSticker(false)
      toast.success('回复已发送')
      mutate()
      void mutateActiveDetail()
    } catch { toast.error('网络错误') }
    finally { setSubmitting(false) }
  }

  if (isLoading) return <CardSkeleton rows={3} />
  if (error && !data) {
    return (
      <div role="alert" style={{ margin: 16, padding: 16, borderRadius: 14, background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)', color: 'var(--color-ink-muted)' }}>
        <div style={{ marginBottom: 10 }}>家校沟通加载失败，请检查网络后重试。</div>
        <button type="button" onClick={() => void mutate()} style={{ border: 0, borderRadius: 8, padding: '7px 12px', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer' }}>
          重新加载
        </button>
      </div>
    )
  }

  const studentName = active?.student?.name || active?.parent.name || ''

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* 顶部横幅 */}
      <div style={{
        background: 'linear-gradient(135deg, #0E2E2A 0%, #1D9E75 100%)',
        padding: '24px 20px 20px', borderRadius: '0 0 24px 24px', color: '#fff',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>家校沟通</div>
        <div style={{ fontSize: 13, opacity: .85 }}>家长发来的问题，及时回复保持沟通</div>
      </div>

      {/* 学生卡片列表 */}
      <div className="teacher-message-list">
        <Text strong style={{ fontSize: 14, color: '#5a4e3a', display: 'block' }}>
          家校沟通（{messages.length}）
        </Text>
        {messages.length === 0 ? (
          <BrandEmpty title="暂时没有沟通记录" hint="家长发来的问题会显示在这里" icon={<MessageOutlined />} />
        ) : messages.map(msg => {
          const unread = unreadCount(msg)
          const lastReply = msg.replies[msg.replies.length - 1]
          const subjectColor = msg.subject ? SUBJECT_COLORS[msg.subject] : null
          const sName = msg.student?.name || msg.parent.name
          const parentLabel = msg.parent.name.endsWith('家长') ? msg.parent.name : msg.parent.name + '家长'
          return (
            <button key={msg.student?.id || msg.parent.id} type="button"
              className="teacher-message-card"
              aria-label={'查看' + sName + (msg.student?.grade ? '，' + msg.student.grade : '') + '的家校沟通' + (unread ? '，' + unread + '条未读留言' : '')}
              onClick={() => handleSelect(msg.id)}>
              <Badge count={unread} size="small" color="var(--color-primary)" offset={[-3, 4]}>
                <StudentAvatar photoUrl={null} gender={msg.student?.gender} name={sName} size={54} />
              </Badge>
              <div className="teacher-message-card__content">
                <div className="teacher-message-card__heading">
                  <Text strong className="teacher-message-card__student">{sName}</Text>
                  <time className="teacher-message-card__date" dateTime={msg.updatedAt}>
                    {(msg.updatedAt || '').slice(5, 10)}
                  </time>
                </div>
                <div className="teacher-message-card__meta">
                  <span className={'teacher-message-card__grade' + (msg.student?.grade ? '' : ' is-empty')}>
                    {msg.student?.grade || '年级待补充'}
                  </span>
                  <span className="teacher-message-card__relation">{parentLabel}</span>
                  {msg.subject && subjectColor && (
                    <span className="teacher-message-card__subject" style={{ background: subjectColor.bg, color: subjectColor.color }}>
                      {msg.subject}
                    </span>
                  )}
                </div>
                <div className="teacher-message-card__preview">
                  <span className="teacher-message-card__speaker">{lastReply?.role === 'parent' ? '家长' : '我'}</span>
                  <span className="teacher-message-card__snippet">
                    {lastReply ? stickerPreview(lastReply.content) : '暂无沟通内容'}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 全屏聊天页 */}
      {active && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, bottom: 56, zIndex: 50,
          background: '#faf8f5', display: 'flex', flexDirection: 'column',
        }}>
          {/* 聊天头部 */}
          <div style={{
            padding: '12px 16px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,.07)',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <button onClick={() => setActiveId(null)} style={{
              border: 'none', background: '#f5f5f5', width: 32, height: 32, borderRadius: 10,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><LeftOutlined /></button>
            <StudentAvatar photoUrl={null} gender={active?.student?.gender} name={studentName} size={38} />
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 15 }}>{studentName}</Text>
              <div style={{ fontSize: 11, color: '#999' }}>牧哲学堂 · 家校沟通</div>
            </div>
          </div>

          {/* 沟通提醒横幅 */}
          <div style={{
            padding: '8px 16px', background: '#FFF8E1', fontSize: 12, color: '#8D6E63', flexShrink: 0,
          }}>
            温馨提醒：请通过本平台与家长沟通，避免私下交易或私下约课，保障双方权益。
          </div>

          {/* 消息列表 */}
          <div ref={conversationRef} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {activeDetailError && activeDetail?.id !== activeId ? (
              <div role="alert" style={{ margin: '24px auto', maxWidth: 320, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                <div style={{ marginBottom: 10 }}>完整对话加载失败，请检查网络后重试。</div>
                <Button onClick={() => void mutateActiveDetail()}>重新加载</Button>
              </div>
            ) : activeDetailLoading && activeDetail?.id !== activeId ? (
              <div role="status" aria-live="polite" style={{ padding: 24, textAlign: 'center', color: 'var(--color-ink-subtle)' }}>正在加载完整对话…</div>
            ) : active.replies.map((reply) => <ChatBubble key={reply.id} reply={reply} />)}
          </div>

          {/* 待发送图片预览 */}
          {pendingImage && (
            <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid rgba(0,0,0,.07)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <img src={pendingImage} alt="待发送图片预览" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
              <span style={{ fontSize: 12, color: '#666' }}>图片待发送</span>
              <button onClick={() => setPendingImage(null)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#999', cursor: 'pointer' }}><CloseOutlined /></button>
            </div>
          )}

          {/* 表情面板 */}
          {showEmoji && (
            <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid rgba(0,0,0,.07)', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
              {['😀','😄','😊','🥰','😅','🤔','👍','🙏','❤️','✨','🎉','💪','📚','✅','💡'].map(e => (
                <button key={e} onClick={() => { setReplyText(t => t + e); setShowEmoji(false) }}
                  style={{ fontSize: 20, border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>{e}</button>
              ))}
            </div>
          )}
          {showSticker && active.status !== 'CLOSED' && (
            <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid rgba(0,0,0,.07)', flexShrink: 0 }}>
              <StickerPanel compact onPick={(sticker) => { setShowSticker(false); void handleReply(STICKER_MARK(sticker.id)) }} />
            </div>
          )}

          {/* 输入栏 */}
          {active.status !== 'CLOSED' && (
            <div style={{
              padding: '10px 12px', background: '#fff', borderTop: '1px solid rgba(0,0,0,.07)',
              display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
            }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(f); e.target.value = '' }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: '#f5f5f5', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>
                {uploading ? '...' : '🖼️'}
              </button>
              <button onClick={() => { setShowEmoji(v => !v); setShowSticker(false) }}
                style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: '#f5f5f5', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>😊</button>
              <button onClick={() => { setShowSticker(v => !v); setShowEmoji(false) }}
                aria-label="发送小羊表情"
                style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: showSticker ? 'var(--color-primary-bg)' : '#f5f5f5', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>🐑</button>
              <input value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
                placeholder="回复家长..." style={{
                  flex: 1, border: '1px solid rgba(0,0,0,.1)', borderRadius: 10,
                  padding: '8px 12px', fontSize: 14, outline: 'none',
                }} />
              <button onClick={() => handleReply()} disabled={submitting || (!replyText.trim() && !pendingImage)}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: 'none',
                  background: '#1D9E75', color: '#fff', cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><SendOutlined /></button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
