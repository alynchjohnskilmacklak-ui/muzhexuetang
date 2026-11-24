'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Image, Spin, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, BookOutlined, CheckCircleOutlined, FileTextOutlined, HeartFilled, MessageOutlined, TrophyOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { formatFriendlyTime } from '@/lib/date/relative'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import type { FeedbackImageVariant } from '@/lib/file-asset-variants'
import { getArchiveEntryTransitionName, getHeartReactionState, runDocumentViewTransition } from '@/lib/ui-motion'

const { Text, Paragraph } = Typography

type TimelineImage = string | FeedbackImageVariant

type EntryDetail = {
  knowledgePoints?: string[]
  knowledgeCard?: unknown
  homework?: string[]
  summary?: string | null
  tags?: string[]
  badge?: string | null
}

type EntryItem = {
  title?: string
  sub?: string | null
  date?: string | Date | null
  refType?: string
  refId?: string
  teacher?: string | null
  teacherSubject?: string | null
  images?: TimelineImage[]
  detail?: EntryDetail
}

type StoredEntry = { item: EntryItem; studentId?: string | null; transitionName?: string }

const STORAGE_KEY = 'muzhe-archive-entry'

function normalizeTimelineImage(image: TimelineImage) {
  return typeof image === 'string'
    ? { originalUrl: image, previewUrl: image, thumbnailUrl: image }
    : image
}

function formatTeacherLabel(item?: EntryItem) {
  if (!item?.teacher) return ''
  return `${item.teacher} 老师${item.teacherSubject ? ` · ${item.teacherSubject}` : ''}`
}

function FeedbackDetail({ detail }: { detail?: EntryDetail }) {
  if (!detail) return null
  const kCard = detail.knowledgeCard ? parseStoredKnowledgeCard(detail.knowledgeCard) : null
  return (
    <div className="parent-growth-feedback-detail">
      {!!detail.knowledgePoints?.length && (
        <section>
          <Text strong><BookOutlined />知识点</Text>
          <div>{detail.knowledgePoints.map((item: string) => <Tag key={item} color="green">{item}</Tag>)}</div>
        </section>
      )}
      {kCard && (
        <section style={{ background: '#FFFDF7', border: '1px solid #EFE7D3', borderRadius: 10, padding: '10px 12px', marginTop: 8 }}>
          <Text strong style={{ display: 'block', marginBottom: 6 }}><BookOutlined />知识点详解</Text>
          {kCard.topic && <div style={{ fontSize: 12, fontWeight: 600, color: '#8A6D3B', marginBottom: 6 }}>{kCard.topic}</div>}
          {(kCard.formulas?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8A6D3B', marginBottom: 3 }}>公式或方法</div>
              {kCard.formulas.map((formula, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.7, color: '#4B5563', whiteSpace: 'pre-wrap' }}>{formula}</div>
              ))}
            </div>
          )}
          {kCard.definition && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8A6D3B', marginBottom: 3 }}>知识讲解</div>
              <Paragraph style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>{kCard.definition}</Paragraph>
            </div>
          )}
          {kCard.tips && kCard.tips.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8A6D3B', marginBottom: 3 }}>易错点与学习建议</div>
              {kCard.tips.map((tip, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.7, color: '#4B5563', marginBottom: 2 }}>· {tip}</div>
              ))}
            </div>
          )}
          {kCard.example && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8A6D3B', marginBottom: 3 }}>示例</div>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: '#4B5563' }}>
                {kCard.example.question && <div style={{ marginBottom: 3 }}>题目：{kCard.example.question}</div>}
                {(kCard.example.steps?.length ?? 0) > 0 && kCard.example.steps.map((step, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>{i + 1}. {step}</div>
                ))}
                {kCard.example.answer && <div style={{ marginTop: 3 }}>答案：{kCard.example.answer}</div>}
              </div>
            </div>
          )}
        </section>
      )}
      {!!detail.homework?.length && (
        <section><Text strong><CheckCircleOutlined />作业</Text><ol>{detail.homework.map((item: string, index: number) => <li key={`${item}-${index}`}>{item}</li>)}</ol></section>
      )}
      {detail.summary && <section><Text strong><FileTextOutlined />课堂小结</Text><Paragraph>{detail.summary}</Paragraph></section>}
      {!!detail.tags?.length && (
        <section><Text strong><MessageOutlined />表现标签</Text><div>{detail.tags.map((item: string) => <Tag key={item} color="orange">{item}</Tag>)}</div></section>
      )}
      {detail.badge && <section><Text strong><TrophyOutlined />徽章</Text><div><Tag color="gold">{detail.badge}</Tag></div></section>}
    </div>
  )
}

export function ArchiveEntryClient() {
  const router = useRouter()
  const { data: session } = useSession()
  const [entry, setEntry] = useState<StoredEntry | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [heartState, setHeartState] = useState({ count: 0, liked: false })
  const [reactionLoading, setReactionLoading] = useState(false)
  const [reactionSaving, setReactionSaving] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const heartBurstTimer = useRef<number | null>(null)
  const parentUserId = (session?.user as { id?: string } | undefined)?.id

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) { setNotFound(true); return }
      const parsed = JSON.parse(raw) as StoredEntry
      if (!parsed?.item) { setNotFound(true); return }
      setEntry(parsed)
    } catch { setNotFound(true) }
  }, [])

  const item = entry?.item
  const transitionName = item
    ? entry?.transitionName || getArchiveEntryTransitionName(item.refType, item.refId, item.title, item.date)
    : undefined

  const returnToArchive = () => {
    let navigationStarted = false
    const transitioned = runDocumentViewTransition(async () => {
      navigationStarted = true
      router.back()
      let frames = 0
      while (frames < 108) {
        if (transitionName && document.querySelector(`[data-archive-entry-source="${transitionName}"]`)) return
        frames += 1
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      }
    })
    if (!transitioned && !navigationStarted) router.back()
  }
  useEffect(() => {
    if (item?.refType !== 'post' || !item.refId || !parentUserId) return
    const controller = new AbortController()
    setReactionLoading(true)
    fetch(`/api/performance/${encodeURIComponent(item.refId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('reaction state unavailable')
        return response.json() as Promise<{ reactions?: Array<{ type?: string; userId?: string }> }>
      })
      .then((post) => setHeartState(getHeartReactionState(post.reactions ?? [], parentUserId)))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') toast.error('点赞状态暂时无法读取')
      })
      .finally(() => {
        if (!controller.signal.aborted) setReactionLoading(false)
      })
    return () => controller.abort()
  }, [item?.refType, item?.refId, parentUserId])

  useEffect(() => () => {
    if (heartBurstTimer.current !== null) window.clearTimeout(heartBurstTimer.current)
  }, [])

  const toggleHeart = async () => {
    if (!item?.refId || item.refType !== 'post' || !parentUserId || reactionSaving || reactionLoading) return
    const nextLiked = !heartState.liked
    setReactionSaving(true)
    try {
      const response = await fetch(`/api/performance/${encodeURIComponent(item.refId)}/react${nextLiked ? '' : '?type=HEART'}`, {
        method: nextLiked ? 'POST' : 'DELETE',
        ...(nextLiked ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'HEART' }) } : {}),
      })
      if (!response.ok) throw new Error('reaction update failed')
      setHeartState((current) => ({ count: Math.max(0, current.count + (nextLiked ? 1 : -1)), liked: nextLiked }))
      if (nextLiked) {
        setHeartBurst(true)
        if (heartBurstTimer.current !== null) window.clearTimeout(heartBurstTimer.current)
        heartBurstTimer.current = window.setTimeout(() => setHeartBurst(false), 320)
      }
    } catch {
      toast.error('点赞暂时未完成，请稍后重试')
    } finally {
      setReactionSaving(false)
    }
  }

  const images: ReturnType<typeof normalizeTimelineImage>[] = Array.isArray(item?.images)
    ? (item.images as TimelineImage[]).map(normalizeTimelineImage)
    : []
  const { urls: signedThumbnails } = useSignedUrls(images.map(image => image.thumbnailUrl || image.previewUrl || image.originalUrl))
  const { urls: signedPreviews } = useSignedUrls(images.map(image => image.previewUrl || image.thumbnailUrl || image.originalUrl))

  if (notFound) {
    return (
      <div className="parent-archive-entry-page" style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>
        <Button type="text" className="mobile-shell-back" icon={<ArrowLeftOutlined />} onClick={() => router.push('/parent/archive')} style={{ marginBottom: 16, padding: 0 }}>
          返回成长档案
        </Button>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9A8E7A', fontSize: 14 }}>
          记录不存在或已失效，请从成长档案重新打开。
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="parent-archive-entry-page" style={{ padding: '16px 14px 32px', maxWidth: 640, margin: '0 auto' }}>
      <Button type="text" className="mobile-shell-back" icon={<ArrowLeftOutlined />} onClick={returnToArchive} style={{ marginBottom: 16, padding: 0, color: '#5a4e3a' }}>
        返回成长档案
      </Button>

      {/* 记录标题卡 */}
      <div className="parent-archive-entry-hero" style={{
        borderRadius: 16, padding: 16, marginBottom: 14,
        background: 'linear-gradient(150deg,#17352F 0%,#0E5E4E 62%,#0B4B40 100%)',
        border: '1px solid rgba(201,164,92,.55)',
        color: '#F5F1E8',
        boxShadow: '0 8px 20px rgba(18,60,53,.18)',
        viewTransitionName: transitionName || 'none',
      } as React.CSSProperties} data-archive-entry-transition-ready={transitionName}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: 'rgba(242,227,182,.8)', marginBottom: 6 }}>
          {item.refType === 'paper' ? '试卷记录' : item.refType === 'feedback' ? '课堂反馈' : item.refType === 'post' ? '成长反馈' : item.refType === 'badge' ? '徽章' : item.refType === 'grade' ? '成绩' : '成长记录'}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#F6ECD2', lineHeight: 1.4 }}>{item.title || '成长记录'}</div>
        {formatTeacherLabel(item) && <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(245,241,232,.8)' }}>{formatTeacherLabel(item)}</div>}
        {item.date && <div style={{ marginTop: 6, fontSize: 11.5, color: 'rgba(245,241,232,.65)' }}>{formatFriendlyTime(item.date)}</div>}
      </div>

      {images.length > 0 && (
        <div className="parent-entry-stagger" style={{ '--entry-stagger-index': 1, background: '#FFFDF8', border: '1px solid rgba(201,164,92,.3)', borderRadius: 14, padding: 14, marginBottom: 12 } as React.CSSProperties}>
          <Text strong style={{ display: 'block', marginBottom: 10 }}>照片记录</Text>
          <Image.PreviewGroup>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {images.map((image, i: number) => (
                <Image
                  key={`${image.originalUrl}-${i}`}
                  src={signedThumbnails[i]}
                  preview={{ src: signedPreviews[i] }}
                  alt=""
                  style={{ borderRadius: 8, objectFit: 'cover', width: '100%', height: 120 }}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='120'%3E%3Crect width='140' height='120' fill='%23f5f2ee'/%3E%3Ctext x='70' y='60' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='12'%3E图片加载失败%3C/text%3E%3C/svg%3E"
                />
              ))}
            </div>
          </Image.PreviewGroup>
        </div>
      )}

      <div className="parent-archive-entry-content parent-entry-stagger" style={{ '--entry-stagger-index': 2, background: '#fff', border: '1px solid rgba(201,164,92,.3)', borderRadius: 14, padding: 16, boxShadow: '0 2px 10px rgba(58,50,39,.05)' } as React.CSSProperties}>
        <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 0 }}>{item.sub || item.title}</Paragraph>
        <FeedbackDetail detail={item.detail} />
        {item.refType === 'post' && item.refId && (
          <div className="parent-feedback-reaction-row">
            <button
              type="button"
              className={`parent-feedback-like${heartState.liked ? ' is-liked' : ''}${heartBurst ? ' is-burst' : ''}`}
              aria-label={heartState.liked ? `取消点赞，${heartState.count} 个赞` : `点赞，${heartState.count} 个赞`}
              aria-pressed={heartState.liked}
              disabled={!parentUserId || reactionLoading || reactionSaving}
              onClick={() => void toggleHeart()}
            >
              <HeartFilled aria-hidden="true" />
              <span>{heartState.liked ? '已点赞' : '点赞'}</span>
              <span className="parent-feedback-like__count">{heartState.count}</span>
              {heartBurst && (
                <span className="parent-heart-burst" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => <i key={index} style={{ '--spark-angle': `${index * 60}deg` } as React.CSSProperties} />)}
                </span>
              )}
            </button>
            <span className="parent-feedback-reaction-caption">给这条成长记录一个回应</span>
          </div>
        )}
        {item.refType === 'paper' && item.refId && (
          <Button
            type="primary"
            onClick={() => router.push(`/parent/archive?tab=grades${entry?.studentId ? `&studentId=${entry.studentId}` : ''}`)}
            style={{ padding: '0 16px', marginTop: 12, background: '#0E5E4E', border: 'none', borderRadius: 10 }}
          >
            查看试卷详情
          </Button>
        )}
      </div>
    </div>
  )
}
