'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button, Tag, Typography, Modal, Input, Descriptions, Image, Space } from 'antd'
import { BookOutlined, CameraOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { fmtDate, fmtDateTime } from '@/lib/format-date'
import { formatFriendlyTime } from '@/lib/date/relative'
import { toast } from 'sonner'
import { ChildSwitcher } from '@/components/Parent/ChildSwitcher'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { ParentCard } from '@/components/Parent/ParentCard'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { usePausableSWR } from '@/lib/use-pausable-swr'
import type { FeedbackImageVariant } from '@/lib/file-asset-variants'
import { groupByRelativeDate } from '@/lib/date/group-relative'

const { Title, Text, Paragraph } = Typography
const fetcher = (url: string) => fetch(url).then((response) => response.json())

function parentMasteryLabel(value: unknown) {
  const raw = value && typeof value === 'object' && 'rating' in value
    ? (value as { rating?: unknown }).rating
    : value
  if (typeof raw !== 'string') return ''
  return ({ GREAT: '掌握良好', OKAY: '基本掌握', NEEDS_IMPROVEMENT: '需要加强' } as Record<string, string>)[raw] || raw
}

type FeedbackConversationReply = {
  id: string
  authorName: string
  role: string
  content: string
  createdAt: string
}

type FeedbackConversation = {
  id: string
  replies: FeedbackConversationReply[]
}

type HomeworkItem = string | { content?: string; title?: string }
type FeedbackItem = {
  id: string
  createdAt: string
  status: string
  notifySent?: boolean
  parentReadAt?: string | null
  parentReply?: string | null
  parentRepliedAt?: string | null
  adminReply?: string | null
  lessonContent?: string | null
  summary?: string | null
  overallComment?: string | null
  knowledgePoints: string[]
  homework: HomeworkItem[]
  imageUrls: string[]
  images: FeedbackImageVariant[]
  studentRating?: unknown
  teacher?: { id: string; name: string; subjects?: string | null } | null
  parentMessages?: FeedbackConversation[]
  classLesson?: {
    name?: string | null
    subject?: string | null
    lessonDate?: string | null
    startTime?: string | null
    endTime?: string | null
    group?: {
      course?: { name?: string | null; subject?: string | null }
      room?: { name?: string | null }
      teacherAssignments?: Array<{ teacherId: string; subject?: string | null }>
    } | null
  } | null
}

const SUBJECT_STYLES: Record<string, { background: string; color: string }> = {
  数学: { background: 'var(--color-primary-bg)', color: 'var(--color-primary-focus)' },
  英语: { background: 'var(--color-surface-3)', color: 'var(--color-chart-6)' },
  物理: { background: 'var(--color-success-bg)', color: 'var(--color-success)' },
  化学: { background: 'var(--color-surface-3)', color: 'var(--color-warning-text)' },
}

function feedbackSubject(feedback: FeedbackItem) {
  const assignedSubject = feedback.classLesson?.group?.teacherAssignments
    ?.find(assignment => assignment.teacherId === feedback.teacher?.id)?.subject
  return feedback.classLesson?.subject || assignedSubject || feedback.classLesson?.group?.course?.subject || '综合'
}

export function ClassFeedbackClient({ feedbacks, highlightedFeedback }: { feedbacks: FeedbackItem[]; highlightedFeedback: FeedbackItem | null }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [detailModal, setDetailModal] = useState<FeedbackItem | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [localReply, setLocalReply] = useState<string | null>(null)
  const [conversation, setConversation] = useState<FeedbackConversation | null>(null)
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(() => new Set())
  const [recentCutoff] = useState(() => new Date(Date.now() - 7 * 86400000))
  const detailImageUrls = Array.isArray(detailModal?.imageUrls) ? detailModal.imageUrls : []
  const detailImages = Array.isArray(detailModal?.images) && detailModal.images.length === detailImageUrls.length
    ? detailModal.images
    : detailImageUrls.map((url: string) => ({ originalUrl: url, previewUrl: url, thumbnailUrl: url }))
  const { urls: signedDetailThumbnails, error: thumbnailError, refresh: retryThumbnails } = useSignedUrls(detailImages.map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl))
  const { urls: signedDetailPreviews, error: previewError, refresh: retryPreviews } = useSignedUrls(imagePreviewOpen
    ? detailImages.map((image) => image.previewUrl || image.thumbnailUrl || image.originalUrl)
    : [])
  const { data: liveConversation, mutate: mutateConversation } = usePausableSWR<{ conversation: FeedbackConversation | null }>(
    detailModal?.id ? `/api/feedback/${detailModal.id}/messages` : null,
    fetcher,
    { refreshInterval: 5_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  const conversationReplies = Array.isArray(conversation?.replies) ? conversation.replies : []
  const feedbackGroups = useMemo(
    () => groupByRelativeDate(feedbacks, feedback => feedback.createdAt, 'today-yesterday-earlier'),
    [feedbacks],
  )

  useEffect(() => {
    if (liveConversation?.conversation) setConversation(liveConversation.conversation)
  }, [liveConversation])

  const markAsRead = async (feedback: FeedbackItem) => {
    if (feedback.parentReadAt || feedback.status !== 'PUBLISHED' || locallyReadIds.has(feedback.id)) return
    setLocallyReadIds(current => new Set(current).add(feedback.id))
    await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: feedback.id, markRead: true }),
    })
  }

  // Auto-open detail if highlightedFeedback is present (from notification click)
  useEffect(() => {
    if (highlightedFeedback) {
      setImagePreviewOpen(false)
      setDetailModal(highlightedFeedback)
      setConversation(highlightedFeedback.parentMessages?.[0] || null)
      if (!highlightedFeedback.parentReadAt && highlightedFeedback.status === 'PUBLISHED') {
        setLocallyReadIds(current => new Set(current).add(highlightedFeedback.id))
        void fetch('/api/feedback', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: highlightedFeedback.id, markRead: true }),
        })
      }
    }
  }, [highlightedFeedback])

  const handleReply = async () => {
    if (!replyText.trim() || !detailModal) return
    setReplying(true)
    try {
      const res = await fetch(`/api/feedback/${detailModal.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || '回复失败'); return }
      toast.success('回复已发送，老师会收到提醒')
      setLocalReply(replyText)
      setConversation(data.conversation)
      void mutateConversation({ conversation: data.conversation }, { revalidate: false })
      setReplyText('')
    } catch { toast.error('网络错误') }
    finally { setReplying(false) }
  }

  const openDetail = (f: FeedbackItem) => {
    setImagePreviewOpen(false)
    setDetailModal(f)
    setReplyText('')
    setLocalReply(f.parentReply || null)
    setConversation(f.parentMessages?.[0] || null)
    void markAsRead(f)
  }

  return (
    <PullToRefresh onRefresh={async () => { router.refresh(); await new Promise((resolve) => setTimeout(resolve, 500)) }}>
    <div>
      <ChildSwitcher />
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ marginBottom: 4 }}>课堂反馈</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          查看老师发送的课堂表现、学习内容、作业与照片
        </Text>
      </div>

      {/* Unread indicator */}
      {feedbacks.filter(f => !f.notifySent || new Date(f.createdAt) > recentCutoff).length > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#FFF3E8', border: '1px solid #FDD5B5', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageOutlined style={{ color: '#E8784A' }} />
          <Text style={{ fontSize: 13, color: '#D46B3A' }}>
            近期有 {feedbacks.filter(f => new Date(f.createdAt) > recentCutoff).length} 条新反馈
          </Text>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <ParentCard style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandEmpty title="还没有课堂反馈" hint="老师发布的小班课、周末课课堂内容、掌握情况和照片会显示在这里，帮助你看懂孩子每节课的表现。" actionText="看看课程表" onAction={() => router.push('/parent/schedule')} />
        </ParentCard>
      ) : (
        <div className="parent-feedback-groups">
          {feedbackGroups.map(group => <section key={group.key} className="parent-feedback-group">
            <div className="parent-record-divider">{group.label}</div>
            <div className="parent-feedback-list">{group.items.map((f) => {
              const subject = feedbackSubject(f)
              const subjectStyle = SUBJECT_STYLES[subject] || { background: 'var(--color-surface-3)', color: 'var(--color-ink-muted)' }
              const unread = !f.parentReadAt && f.status === 'PUBLISHED' && !locallyReadIds.has(f.id)
              const summary = f.summary || f.lessonContent || f.overallComment || '老师已发布本次课堂反馈'
              return <button type="button" key={f.id} className={`parent-feedback-row${detailModal?.id === f.id ? ' is-active' : ''}`} onClick={() => openDetail(f)}>
                <span className="parent-feedback-icon" style={subjectStyle}>{subject.slice(0, 1)}</span>
                <span className="parent-feedback-body">
                  <span className="parent-feedback-heading">
                    <strong>{f.teacher?.name || '老师'}</strong>
                    <span className="parent-feedback-subject" style={subjectStyle}>{subject}</span>
                    {unread && <span className="parent-feedback-unread" aria-label="未读" />}
                    <time>{formatFriendlyTime(f.createdAt)}</time>
                  </span>
                  <span className="parent-feedback-summary" title={summary}>{summary}</span>
                </span>
                <span className="parent-feedback-extras">
                  {f.imageUrls?.length > 0 && <span><CameraOutlined /> {f.imageUrls.length}</span>}
                  {f.parentReply && <span><MessageOutlined /> 已回复</span>}
                </span>
              </button>
            })}</div>
          </section>)}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!detailModal}
        onCancel={() => { setImagePreviewOpen(false); setDetailModal(null) }}
        footer={null}
        width={isMobile ? '100%' : 640}
        style={isMobile ? { top: 0, maxWidth: '100vw', margin: 0 } : {}}
        styles={isMobile ? { body: { padding: 16, maxHeight: '90vh', overflow: 'auto' } } : {}}
        centered={!isMobile}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOutlined style={{ color: '#534AB7' }} />
            <span>课堂反馈详情</span>
          </div>
        }
      >
        {detailModal && (
          <div>
            {/* Basic info */}
            <Descriptions column={isMobile ? 1 : 2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="老师">{detailModal.teacher?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="发布时间">
                {formatFriendlyTime(detailModal.createdAt)}
              </Descriptions.Item>
              {detailModal.classLesson?.group?.course && (
                <>
                  <Descriptions.Item label="课程">
                    <BookOutlined style={{ marginRight: 4 }} />
                    {detailModal.classLesson.group.course.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="教室">
                    {detailModal.classLesson.group.room?.name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="上课时间">
                    {detailModal.classLesson.lessonDate ? fmtDate(detailModal.classLesson.lessonDate) : '-'} {detailModal.classLesson.startTime}-{detailModal.classLesson.endTime}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="状态">
                <Tag color="purple" style={{ borderRadius: 9999 }}>
                  {detailModal.status === 'PUBLISHED' ? '已发布' : detailModal.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {detailModal.lessonContent && (
              <div style={{ background: '#FFFBF7', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>本节课学习内容</Text>
                <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                  {detailModal.lessonContent}
                </Paragraph>
              </div>
            )}

            {/* Knowledge points */}
            {detailModal.knowledgePoints?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>今日知识点</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {detailModal.knowledgePoints.map((kp: string, i: number) => (
                    <Tag key={i} style={{ borderRadius: 9999, fontSize: 12 }}>{kp}</Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {(detailModal.summary || parentMasteryLabel(detailModal.studentRating)) && (
              <div style={{ background: '#FFFBF7', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>孩子掌握情况</Text>
                <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                  {detailModal.summary || parentMasteryLabel(detailModal.studentRating)}
                </Paragraph>
              </div>
            )}

            {/* Overall comment */}
            {detailModal.overallComment && (
              <div style={{ background: '#F5F2EE', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>课堂反馈</Text>
                <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                  {detailModal.overallComment}
                </Paragraph>
              </div>
            )}

            {/* Homework */}
            {detailModal.homework?.length > 0 && (
              <div style={{ background: '#F7F4F0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>📚 课后作业</Text>
                {detailModal.homework.map((hw, i: number) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 4, color: '#4B5563' }}>
                    {i + 1}. {typeof hw === 'string' ? hw : hw.content || hw.title || ''}
                  </div>
                ))}
              </div>
            )}

            {/* Images */}
            {detailModal.imageUrls?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>🖼 课堂照片</Text>
                {(thumbnailError || previewError) && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, padding: '9px 10px', borderRadius: 10, background: '#FFF4DE', color: '#8A5B00', fontSize: 12 }}>
                    <span>图片加载暂时失败</span>
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => { retryThumbnails(); retryPreviews() }}>重试</Button>
                  </div>
                )}
                <Image.PreviewGroup preview={{ onVisibleChange: setImagePreviewOpen }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 8 }}>
                    {detailImages.map((image, i: number) => (
                      <Image
                        key={i}
                        src={signedDetailThumbnails[i]}
                        loading="lazy"
                        preview={{ src: signedDetailPreviews[i] || signedDetailThumbnails[i] }}
                        alt={`课堂照片 ${i + 1}`}
                        width="100%"
                        height={isMobile ? 100 : 120}
                        style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #F0DDD2' }}
                        fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjgwIiB5PSI2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTkiIGZvbnQtc2l6ZT0iMTIiPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4="
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              </div>
            )}

            {/* Parent reply section */}
            <div style={{ borderTop: '1px solid #F0DDD2', paddingTop: 14, marginTop: 8 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>家校沟通记录</Text>
              {conversationReplies.map((reply) => {
                const isParent = reply.role === 'parent'
                return (
                  <div key={reply.id} style={{ display: 'flex', justifyContent: isParent ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                    <div style={{ maxWidth: '85%', background: isParent ? '#fff3ec' : '#f5f2ee', borderRadius: 10, padding: '8px 12px' }}>
                      <Text style={{ display: 'block', fontSize: 12, color: '#5a4e3a', marginBottom: 3 }}>
                        {isParent ? '家长' : reply.authorName || '老师'} · {fmtDateTime(reply.createdAt)}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#1a1201', whiteSpace: 'pre-wrap' }}>{reply.content}</Text>
                    </div>
                  </div>
                )
              })}
              {conversationReplies.length === 0 && (localReply || detailModal.parentReply) ? (
                <div style={{ background: '#FFF3E8', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, color: '#4B5563' }}>{localReply || detailModal.parentReply}</Text>
                  <div style={{ fontSize: 11, color: '#B0B8C1', marginTop: 4 }}>
                    已回复{detailModal.parentRepliedAt ? ` · ${fmtDateTime(detailModal.parentRepliedAt)}` : ''}
                  </div>
                </div>
              ) : conversationReplies.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
                  老师期待你的回复，帮助孩子更好地成长
                </Text>
              ) : null}
              <Space.Compact style={{ width: '100%' }}>
                <Input.TextArea
                  rows={2}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="输入你对本次课堂反馈的回复..."
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </Space.Compact>
              <Button
                type="primary"
                size="small"
                loading={replying}
                disabled={!replyText.trim()}
                onClick={handleReply}
                style={{ marginTop: 8, background: '#E8784A', border: 'none', borderRadius: 8 }}
              >
                发送留言
              </Button>
            </div>

            {/* Admin reply */}
            {detailModal.adminReply && (
              <div style={{ borderTop: '1px solid #F0DDD2', paddingTop: 12, marginTop: 8 }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>👩‍🏫 老师/管理员回复</Text>
                <div style={{ background: '#E8F4FD', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 13, color: '#4B5563' }}>{detailModal.adminReply}</Text>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
    </PullToRefresh>
  )
}
