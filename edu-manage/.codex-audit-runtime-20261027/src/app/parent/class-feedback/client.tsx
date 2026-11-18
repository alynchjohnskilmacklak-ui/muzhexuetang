'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button, Tag, Typography } from 'antd'
import { CameraOutlined, MessageOutlined } from '@ant-design/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatFriendlyTime } from '@/lib/date/relative'
import { toast } from 'sonner'
import { ChildSwitcher } from '@/components/Parent/ChildSwitcher'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { ParentCard } from '@/components/Parent/ParentCard'
import { PullToRefresh } from '@/components/PullToRefresh'
import type { FeedbackImageVariant } from '@/lib/file-asset-variants'
import { groupByRelativeDate } from '@/lib/date/group-relative'

const { Title, Text } = Typography

async function persistFeedbackReadState(feedbackId: string) {
  const response = await fetch('/api/feedback', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: feedbackId, markRead: true }),
  })
  const data = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(data.error || '标记已读失败，请稍后重试')
}

type HomeworkItem = string | { content?: string; title?: string }
type FeedbackItem = {
  resolvedSubject?: string
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
  signedThumbnails?: Record<string, string>
  studentRating?: unknown
  teacher?: { id: string; name: string; subjects?: string | null } | null
  term?: { name: string; status: string } | null
  knowledgeDetail?: {
    edition?: string
    grade?: string
    subject?: string
    topic?: string
    definition?: string
    formulas?: string[]
    example?: { question?: string; steps?: string[]; answer?: string }
    tips?: string[]
  } | null
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

const SUBJECT_STYLES: Record<string, { badgeClass: string; glyph: string; tagColor: string; tagBg: string }> = {
  数学: { badgeClass: 'is-math', glyph: '数', tagColor: '#0E5E4E', tagBg: 'rgba(14,94,78,.12)' },
  英语: { badgeClass: 'is-english', glyph: '英', tagColor: '#2B4E8C', tagBg: 'rgba(43,78,140,.12)' },
  物理: { badgeClass: 'is-physics', glyph: '物', tagColor: '#A5823C', tagBg: 'rgba(165,130,60,.14)' },
  化学: { badgeClass: 'is-chemistry', glyph: '化', tagColor: '#C96F3A', tagBg: 'rgba(201,111,58,.14)' },
  语文: { badgeClass: 'is-chinese', glyph: '语', tagColor: '#B55445', tagBg: 'rgba(181,84,69,.12)' },
  生物: { badgeClass: 'is-biology', glyph: '生', tagColor: '#2F6B4F', tagBg: 'rgba(47,107,79,.12)' },
}

const DEFAULT_SUBJECT_STYLE = { badgeClass: 'is-default', glyph: '课', tagColor: '#0E5E4E', tagBg: 'rgba(14,94,78,.12)' }

function subjectStyle(subject: string) {
  return SUBJECT_STYLES[subject] || DEFAULT_SUBJECT_STYLE
}

function feedbackSubject(feedback: FeedbackItem) {
  return feedback.resolvedSubject || '课堂反馈'
}

type LinkedChild = { id: string; name: string; grade: string | null; membershipLevel: string | null }

export function ClassFeedbackClient({
  feedbacks,
  highlightedFeedback,
  linkedChildren,
  activeChildId,
  invalidChild,
  page,
  hasMore,
}: {
  feedbacks: FeedbackItem[]
  highlightedFeedback: FeedbackItem | null
  linkedChildren: LinkedChild[]
  activeChildId: string
  invalidChild: boolean
  page: number
  hasMore: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile() ?? false
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(() => new Set())
  const [recentCutoff] = useState(() => new Date(Date.now() - 7 * 86400000))
  const feedbackGroups = useMemo(
    () => groupByRelativeDate(feedbacks, feedback => feedback.createdAt, 'today-yesterday-earlier'),
    [feedbacks],
  )
  const recentCount = page === 1 ? feedbacks.filter(f => new Date(f.createdAt) > recentCutoff).length : 0

  const goToPage = (target: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('studentId')
    params.delete('feedbackId')
    if (activeChildId) params.set('childId', activeChildId)
    if (target > 1) params.set('page', String(target))
    else params.delete('page')
    router.push(`/parent/class-feedback?${params.toString()}`)
  }

  const markAsRead = async (feedback: FeedbackItem) => {
    if (feedback.parentReadAt || feedback.status !== 'PUBLISHED' || locallyReadIds.has(feedback.id)) return
    setLocallyReadIds(current => new Set(current).add(feedback.id))
    try {
      await persistFeedbackReadState(feedback.id)
    } catch (error) {
      setLocallyReadIds(current => {
        const next = new Set(current)
        next.delete(feedback.id)
        return next
      })
      toast.error(error instanceof Error ? error.message : '标记已读失败，请检查网络后重试')
    }
  }

  // Auto-open detail if highlightedFeedback is present (from notification click)
  useEffect(() => {
    if (highlightedFeedback) {
      if (!highlightedFeedback.parentReadAt && highlightedFeedback.status === 'PUBLISHED') {
        setLocallyReadIds(current => new Set(current).add(highlightedFeedback.id))
        void persistFeedbackReadState(highlightedFeedback.id).catch((error: unknown) => {
          setLocallyReadIds(current => {
            const next = new Set(current)
            next.delete(highlightedFeedback.id)
            return next
          })
          toast.error(error instanceof Error ? error.message : '标记已读失败，请检查网络后重试')
        })
      }
      const target = `/parent/class-feedback/${highlightedFeedback.id}${activeChildId ? `?childId=${encodeURIComponent(activeChildId)}` : ''}`
      router.replace(target)
    }
  }, [highlightedFeedback])

  const openDetail = (f: FeedbackItem) => {
    void markAsRead(f)
    const target = `/parent/class-feedback/${f.id}${activeChildId ? `?childId=${encodeURIComponent(activeChildId)}` : ''}`
    router.push(target)
  }

  return (
    <PullToRefresh onRefresh={async () => { router.refresh(); await new Promise((resolve) => setTimeout(resolve, 500)) }}>
    <div>
      <ChildSwitcher linkedChildren={linkedChildren} activeChildId={activeChildId} allowAll />
      <div className="parent-theme-title" style={{ marginBottom: 20 }}>
        <Title level={4} style={{ marginBottom: 4 }}>课堂反馈</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          查看老师发送的课堂表现、学习内容、作业与照片
        </Text>
      </div>
      {/* Unread indicator */}
      {invalidChild && (
        <div role="alert" style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--color-primary-bg)', color: 'var(--color-ink)' }}>
          未找到所选孩子的记录，请在上方重新选择。
        </div>
      )}
      {recentCount > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#FFF3E8', border: '1px solid #FDD5B5', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageOutlined style={{ color: '#E8784A' }} />
          <Text style={{ fontSize: 13, color: '#D46B3A' }}>
            近期有 {recentCount} 条新反馈
          </Text>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <ParentCard style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandEmpty title={page > 1 ? '这一页没有反馈' : '还没有课堂反馈'} hint={page > 1 ? '可以返回上一页继续查看。' : '老师发布的小班课、周末课课堂内容、掌握情况和照片会显示在这里，帮助你看懂孩子每节课的表现。'} actionText={page > 1 ? '返回上一页' : '看看课程表'} onAction={() => page > 1 ? goToPage(page - 1) : router.push('/parent/schedule')} />
        </ParentCard>
      ) : (
        <div className="parent-feedback-groups">
          {feedbackGroups.map(group => <section key={group.key} className="parent-feedback-group">
            <div className="parent-record-divider">{group.label}</div>
            <div className="parent-feedback-list">{group.items.map((f) => {
              const subject = feedbackSubject(f)
              const subjectMeta = subjectStyle(subject)
              const unread = !f.parentReadAt && f.status === 'PUBLISHED' && !locallyReadIds.has(f.id)
              // 权限过滤后直接展示老师写的课堂摘要（两三行），照片张数在右侧已有；全文留在详情页
              const rawSummary = (f.summary || '').trim()
              const summary = rawSummary || (unread ? '新课堂反馈，请点击查看' : '课堂反馈已发布，请点击查看')
              const courseLabel = f.classLesson?.group?.course?.name || ''
              return <button type="button" key={f.id} className="parent-feedback-row" onClick={() => openDetail(f)}>
                <span className={`pf-badge ${subjectMeta.badgeClass}`} aria-hidden="true">
                  {subjectMeta.glyph}
                  {unread && <span className="pf-badge-sub">!</span>}
                </span>
                <span className="parent-feedback-body">
                  <span className="parent-feedback-heading">
                    <strong>{f.teacher?.name || '老师'}</strong>
                    <span className="parent-feedback-subject" style={{ color: subjectMeta.tagColor, background: subjectMeta.tagBg, borderColor: `${subjectMeta.tagColor}33` }}>{subject}</span>
                    {f.term?.name && <span className="parent-feedback-term">{f.term.name.replace(/^牧哲学堂/, '').replace(/批次$/, '')}</span>}
                    {unread && <span className="parent-feedback-unread" aria-label="未读" />}
                    <time>{formatFriendlyTime(f.createdAt)}</time>
                  </span>
                  <span className="parent-feedback-summary" title={summary}>{summary}</span>
                  <span className="parent-feedback-extras">
                    {courseLabel && <span>{courseLabel}</span>}
                    {f.imageUrls?.length > 0 && <span><CameraOutlined /> {f.imageUrls.length}张课堂照片</span>}
                    {f.parentReply && <span><MessageOutlined /> 已回复</span>}
                  </span>
                </span>
              </button>
            })}</div>
          </section>)}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <nav aria-label="课堂反馈分页" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '20px 0' }}>
          <Button disabled={page <= 1} onClick={() => goToPage(page - 1)}>上一页</Button>
          <span aria-live="polite">第 {page} 页</span>
          <Button disabled={!hasMore} onClick={() => goToPage(page + 1)}>下一页</Button>
        </nav>
      )}

    </div>
    </PullToRefresh>
  )
}
