'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Image, Input, Space, Tag, Typography, Alert, message as antdMessage } from 'antd'
import { ArrowLeftOutlined, BookOutlined, CameraOutlined, ReloadOutlined } from '@ant-design/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import { fmtDateTime } from '@/lib/format-date'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import type { FeedbackImageVariant } from '@/lib/file-asset-variants'
import { getParentFeedbackDisplaySections } from '@/lib/classroom-feedback/parent-feedback-content'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { KnowledgePointDetail } from '@/components/Feedback/KnowledgePointDetail'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'

const { Title, Text, Paragraph } = Typography

type HomeworkItem = string | { title?: string; content?: string }
type FeedbackDetail = {
  resolvedSubject?: string
  displayStudentName?: string | null
  id: string
  status: string
  parentReadAt?: string | null
  parentReply?: string | null
  parentRepliedAt?: string | null
  createdAt: string
  lessonContent?: string | null
  summary?: string | null
  overallComment?: string | null
  studentRating?: unknown
  knowledgePoints: string[]
  knowledgeCard?: unknown
  tags?: string[]
  homework: HomeworkItem[]
  imageUrls: string[]
  images: FeedbackImageVariant[]
  signedThumbnails?: Record<string, string>
  teacher?: {
    id?: string
    name?: string
    subjects?: string | null
    avatar?: string | null
    gender?: string | null
    tierLevel?: string | null
    bio?: string | null
    university?: string | null
    major?: string | null
  } | null
  classLesson?: {
    lessonDate?: string | null
    startTime?: string | null
    endTime?: string | null
    group?: {
      course?: { name?: string | null; subject?: string | null }
      room?: { name?: string | null }
    } | null
  } | null
}

/** 学科徽章映射（与列表一致） */
const SUBJECT_STYLES: Record<string, { badgeClass: string; glyph: string; tagColor: string }> = {
  数学: { badgeClass: 'is-math', glyph: '数', tagColor: '#0E5E4E' },
  英语: { badgeClass: 'is-english', glyph: '英', tagColor: '#2B4E8C' },
  物理: { badgeClass: 'is-physics', glyph: '物', tagColor: '#A5823C' },
  化学: { badgeClass: 'is-chemistry', glyph: '化', tagColor: '#C96F3A' },
  语文: { badgeClass: 'is-chinese', glyph: '语', tagColor: '#B55445' },
  生物: { badgeClass: 'is-biology', glyph: '生', tagColor: '#2F6B4F' },
}
const DEFAULT_SUBJECT_STYLE = { badgeClass: 'is-default', glyph: '课', tagColor: '#0E5E4E' }
function subjectStyle(subject: string) {
  return SUBJECT_STYLES[subject] || DEFAULT_SUBJECT_STYLE
}

function feedbackSubject(feedback: FeedbackDetail) {
  return feedback.resolvedSubject || feedback.classLesson?.group?.course?.subject || '课堂反馈'
}

export function FeedbackDetailClient({ feedback }: { feedback: FeedbackDetail }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId') || undefined
  const isMobile = useIsMobile() ?? false
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [localReply, setLocalReply] = useState<string | null>(feedback.parentReply || null)
  const [conversation, setConversation] = useState<{ id: string; replies: Array<{ id: string; authorName: string; role: string; content: string; createdAt: string }> } | null>(null)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [loadingConversation, setLoadingConversation] = useState(false)

  // 学科与教师 HERO 卡数据
  const subject = feedbackSubject(feedback)
  const subjectMeta = subjectStyle(subject)
  const teacher = feedback.teacher
  const tierKey = resolveTier(teacher?.tierLevel ?? 'NEW')
  const tierTheme = TIER_THEME[tierKey]
  const avatarSrc = getTeacherAvatarUrl(teacher?.avatar, teacher?.gender, teacher?.id ?? teacher?.name)
  const course = feedback.classLesson?.group?.course
  const room = feedback.classLesson?.group?.room
  const lessonTime = feedback.classLesson?.lessonDate
    ? `${fmtDateOnly(feedback.classLesson.lessonDate)} ${feedback.classLesson.startTime || ''}-${feedback.classLesson.endTime || ''}`
    : ''
  const imageUrls = Array.isArray(feedback.imageUrls) ? feedback.imageUrls : []
  const images = Array.isArray(feedback.images) && feedback.images.length === imageUrls.length
    ? feedback.images
    : imageUrls.map((url: string) => ({ originalUrl: url, previewUrl: url, thumbnailUrl: url }))
  const { urls: signedThumbnails, error: thumbnailError, refresh: retryThumbnails } = useSignedUrls(images.map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl), feedback.signedThumbnails)
  const { urls: signedPreviews, error: previewError, refresh: retryPreviews } = useSignedUrls(imagePreviewOpen
    ? images.map((image) => image.previewUrl || image.thumbnailUrl || image.originalUrl)
    : [])
  // 学习内容与掌握情况只保留在课堂反馈正文中，家长展示只渲染完整的课堂反馈模块。
  const sections = getParentFeedbackDisplaySections({ ...feedback, studentName: feedback.displayStudentName })
  const knowledgeCard = parseStoredKnowledgeCard(feedback.knowledgeCard)
  const sectionItems = (content: string) => content
    .split(/\n+|[；;]/)
    .map((item) => item.replace(/^[-•\d.、\s]+/, '').trim())
    .filter(Boolean)

  useEffect(() => {
    if (feedback.parentReadAt || feedback.status !== 'PUBLISHED') return
    void fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: feedback.id, markRead: true }),
    })
  }, [feedback.id, feedback.parentReadAt, feedback.status])

  // 加载家校沟通记录
  useEffect(() => {
    let cancelled = false
    setLoadingConversation(true)
    void fetch(`/api/feedback/${feedback.id}/messages`)
      .then((res) => res.json())
      .then((data: { conversation?: { id: string; replies: Array<{ id: string; authorName: string; role: string; content: string; createdAt: string }> } | null }) => {
        if (cancelled) return
        if (data.conversation) setConversation(data.conversation)
        setConversationError(null)
      })
      .catch(() => { if (!cancelled) setConversationError('沟通记录加载失败，请稍后重试') })
      .finally(() => { if (!cancelled) setLoadingConversation(false) })
    return () => { cancelled = true }
  }, [feedback.id])

  const handleReply = async () => {
    if (!replyText.trim()) return
    setReplying(true)
    try {
      const res = await fetch(`/api/feedback/${feedback.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText }),
      })
      const data = await res.json()
      if (!res.ok) { void antdMessage.error(data.error || '回复失败'); return }
      setLocalReply(replyText)
      setConversation(data.conversation)
      setReplyText('')
    } catch { void antdMessage.error('网络错误，请稍后重试') }
    finally { setReplying(false) }
  }

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/parent/class-feedback')}
        style={{ marginBottom: 16, padding: 0, color: '#5a4e3a' }}
      >
        返回课堂反馈
      </Button>

      {/* 学科 Hero：徽章 + 老师 + 课程信息（鎏金深绿横幅） */}
      <div style={{
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid rgba(201,164,92,.6)',
        background: 'linear-gradient(150deg,#17352F 0%,#0E5E4E 62%,#0B4B40 100%)',
        padding: 16,
        color: '#F5F1E8',
        marginBottom: 12,
        boxShadow: '0 8px 20px rgba(18,60,53,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`pf-badge ${subjectMeta.badgeClass}`} style={{ width: 48, height: 48, fontSize: 19, borderRadius: 14 }} aria-hidden="true">
            {subjectMeta.glyph}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 16, fontWeight: 800, color: '#F6ECD2' }}>{teacher?.name || '老师'}</strong>
              <span style={{
                padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                color: '#F2E3B6', background: 'rgba(201,164,92,.16)', border: '1px solid rgba(201,164,92,.5)',
              }}>{subject}</span>
              <span style={{
                padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                color: '#E6F4EF', background: 'rgba(242,227,182,.1)', border: '1px solid rgba(242,227,182,.35)',
              }}>{feedback.status === 'PUBLISHED' ? '已发布' : feedback.status}</span>
            </div>
            <div style={{ marginTop: 5, fontSize: 12, color: 'rgba(245,241,232,.72)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
              {[course?.name, lessonTime, room?.name].filter(Boolean).join(' · ') || '课堂反馈'}
            </div>
          </div>
          <time style={{ flexShrink: 0, fontSize: 10.5, color: 'rgba(245,241,232,.6)', whiteSpace: 'nowrap' }}>
            {fmtDateTime(feedback.createdAt)}
          </time>
        </div>
      </div>

      {/* 教师 HERO 卡：头像 + 姓名 + 等级标签 + 学科，卡片颜色随教师等级 */}
      <div style={{
        display: 'flex', gap: 13, alignItems: 'center',
        padding: 14, marginBottom: 12,
        background: tierTheme.bg,
        border: `1.5px solid ${tierTheme.border}`,
        borderRadius: 16,
        boxShadow: '0 4px 14px rgba(58,50,39,.08)',
      }}>
        <CachedAvatarImage
          src={avatarSrc}
          fallbackSrc={getTeacherAvatarUrl(null, teacher?.gender, teacher?.id ?? teacher?.name)}
          alt={teacher?.name || '老师'}
          style={{ width: 56, height: 56, borderRadius: 999, objectFit: 'cover', flexShrink: 0, border: `2px solid ${tierTheme.border}`, background: '#F8F3E7' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <Text strong style={{ fontSize: 16, color: tierTheme.accent }}>{teacher?.name || '老师'}</Text>
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
              background: tierTheme.bg, border: `1px solid ${tierTheme.border}`, color: tierTheme.accent,
            }}>{tierTheme.label}</span>
            <span className="parent-feedback-subject" style={{ color: subjectMeta.tagColor, background: `${subjectMeta.tagColor}14`, border: `1px solid ${subjectMeta.tagColor}33` }}>
              {subject}
            </span>
          </div>
          {(teacher?.university || teacher?.major) && (
            <div style={{ marginTop: 4, fontSize: 12, color: tierTheme.accent, opacity: 0.75 }}>
              {[teacher?.university, teacher?.major].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      <Card bordered={false} style={{ borderRadius: 14, background: '#fff', border: '1px solid rgba(201,164,92,.3)', boxShadow: '0 2px 10px rgba(58,50,39,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <BookOutlined style={{ color: '#0E5E4E', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>课堂反馈</Title>
        </div>

        {/* 去本节知识题库：直接带学科与知识点跳转 */}
        {childId && subject !== '课堂反馈' && (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams()
              if (childId) params.set('childId', childId)
              params.set('source', 'feedback')
              params.set('subject', subject)
              const pts = (feedback.knowledgePoints || []).slice(0, 6)
              pts.forEach((point, i) => { if (i === 0) params.set('topic', point); else params.append('point', point) })
              router.push(`/parent/practice?${params.toString()}`)
            }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '13px 14px', borderRadius: 14, border: '1px solid rgba(201,164,92,.5)',
              background: 'linear-gradient(135deg,#0E5E4E 0%,#123C35 100%)',
              boxShadow: '0 6px 16px rgba(18,60,53,.18)', cursor: 'pointer', textAlign: 'left',
              marginBottom: 16,
            }}
          >
            <span className="pf-badge is-default" style={{ width: 42, height: 42, fontSize: 17, borderRadius: 12, flexShrink: 0 }} aria-hidden="true">练</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 800, fontSize: 14, color: '#F6ECD2' }}>去本节知识题库练习</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'rgba(245,241,232,.78)' }}>{subject} · 用练习巩固本节知识点</span>
            </span>
            <span style={{ flexShrink: 0, fontWeight: 700, fontSize: 13, color: '#F2E3B6' }}>开始练习 ›</span>
          </button>
        )}

        {/* Put the high-signal learning tags before media and long-form comments. */}
        {feedback.knowledgePoints?.length > 0 && (
          <div style={{ background: '#FFFDF8', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid rgba(201,164,92,.3)' }}>
            <Text strong style={{ display: 'block', marginBottom: 10 }}>本节知识点</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {feedback.knowledgePoints.map((kp: string, i: number) => (
                <Tag style={{ borderRadius: 9999, fontSize: 12, margin: 0, border: '1px solid rgba(201,164,92,.4)', color: '#8A6D3B', background: 'rgba(201,164,92,.1)' }} key={i}>{kp}</Tag>
              ))}
            </div>
          </div>
        )}

        {knowledgeCard && (
          <div style={{ marginBottom: 16 }}>
            <KnowledgePointDetail card={knowledgeCard} audience="parent" defaultOpen />
          </div>
        )}

        {/* Images */}
        {imageUrls.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 12 }}><CameraOutlined style={{ marginRight: 6, color: '#C9A45C' }} />课堂照片</Text>
            {(thumbnailError || previewError) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 10,
                padding: '10px 12px',
                borderRadius: 10,
                background: '#FFF4DE',
                color: '#8A5B00',
                fontSize: 12,
              }}>
                <span>图片连接暂时失败，文字反馈不受影响。</span>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => { retryThumbnails(); retryPreviews() }}>重新加载</Button>
              </div>
            )}
            <Image.PreviewGroup preview={{ onVisibleChange: setImagePreviewOpen }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {images.map((image, i: number) => (
                  <Image
                    key={i}
                    src={signedThumbnails[i]}
                    loading="lazy"
                    preview={{ src: signedPreviews[i] || signedThumbnails[i] }}
                    alt={`资料 ${i + 1}`}
                    width="100%"
                    height={isMobile ? 120 : 140}
                    style={{ objectFit: 'cover', borderRadius: 10, border: '1px solid #F0DDD2' }}
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {sections.map((section) => {
            // "课堂反馈"为完整文章（含换行段落），整段展示；其余短卡按条目拆分
            const isLongForm = section.label === '课堂反馈'
            const items = isLongForm ? [] : sectionItems(section.content)
            return (
              <section key={section.label} style={{ background: '#FFFBF7', borderRadius: 14, padding: 16, border: '1px solid #F0DDD2' }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>{section.label}</Text>
                {isLongForm || items.length <= 1 ? (
                  <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                    {section.content}
                  </Paragraph>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#4B5563', fontSize: 14, lineHeight: 1.8 }}>
                    {items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </section>
            )
          })}
        </div>

        {/* 家校沟通记录 */}
        <div style={{ borderTop: '1px solid rgba(201,164,92,.3)', paddingTop: 14, marginTop: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 10 }}>家校沟通记录</Text>
          {conversationError && (
            <Alert type="error" showIcon message={conversationError} style={{ marginBottom: 10 }} />
          )}
          {loadingConversation && !conversation ? (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>加载中...</Text>
          ) : null}
          {(conversation?.replies || []).map((reply) => {
            const isParent = reply.role === 'parent'
            return (
              <div key={reply.id} style={{ display: 'flex', justifyContent: isParent ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{ maxWidth: '85%', background: isParent ? '#FFF3E8' : '#F7F3EA', border: '1px solid rgba(201,164,92,.2)', borderRadius: 12, padding: '8px 12px' }}>
                  <Text style={{ display: 'block', fontSize: 11, color: '#8A6D3B', marginBottom: 3 }}>
                    {isParent ? '家长' : reply.authorName || '老师'} · {fmtDateTime(reply.createdAt)}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#1a1201', whiteSpace: 'pre-wrap' }}>{reply.content}</Text>
                </div>
              </div>
            )
          })}
          {(conversation?.replies || []).length === 0 && localReply ? (
            <div style={{ background: '#FFF3E8', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid rgba(232,120,74,.25)' }}>
              <Text style={{ fontSize: 13, color: '#4B5563' }}>{localReply}</Text>
              {feedback.parentRepliedAt && (
                <div style={{ fontSize: 11, color: '#B0B8C1', marginTop: 4 }}>已回复 · {fmtDateTime(feedback.parentRepliedAt)}</div>
              )}
            </div>
          ) : (conversation?.replies || []).length === 0 ? (
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
            style={{ marginTop: 8, background: '#0E5E4E', border: 'none', borderRadius: 8 }}
          >
            发送留言
          </Button>
        </div>
      </Card>
    </div>
  )
}

/** 简化日期：MM月DD日 */
function fmtDateOnly(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
