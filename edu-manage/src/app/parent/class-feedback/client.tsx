'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button, Tag, Typography } from 'antd'
import { CameraOutlined, MessageOutlined, RightOutlined } from '@ant-design/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatFriendlyTime } from '@/lib/date/relative'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { isParentUnreadCountsCacheKey } from '@/lib/parent-unread-cache'
import { ChildSwitcher } from '@/components/Parent/ChildSwitcher'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { ParentCard } from '@/components/Parent/ParentCard'
import { PullToRefresh } from '@/components/PullToRefresh'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { getTeacherAvatarUrl, DEFAULT_TEACHER_AVATAR } from '@/lib/teacher-avatars'
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
  consecutiveSessionLabel?: string | null
  isSingleSession?: boolean
  subjectSnapshot?: string | null
  studentNameSnapshot?: string | null
  displayStudentName?: string | null
  sessionDate?: string | null
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
  teacher?: { id: string; name: string; subjects?: string | null; avatar?: string | null; gender?: string | null } | null
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

const SUBJECT_STYLES: Record<string, { glyph: string; tagColor: string; tagBg: string }> = {
  数学: { glyph: '数', tagColor: '#0E5E4E', tagBg: 'rgba(14,94,78,.12)' },
  英语: { glyph: '英', tagColor: '#2B4E8C', tagBg: 'rgba(43,78,140,.12)' },
  物理: { glyph: '物', tagColor: '#8A6517', tagBg: 'rgba(138,101,23,.12)' },
  化学: { glyph: '化', tagColor: '#C96F3A', tagBg: 'rgba(201,111,58,.12)' },
  语文: { glyph: '语', tagColor: '#B55445', tagBg: 'rgba(181,84,69,.12)' },
  生物: { glyph: '生', tagColor: '#2F6B4F', tagBg: 'rgba(47,107,79,.12)' },
  历史: { glyph: '历', tagColor: '#6B4226', tagBg: 'rgba(107,66,38,.12)' },
  地理: { glyph: '地', tagColor: '#3D6B5E', tagBg: 'rgba(61,107,94,.12)' },
  政治: { glyph: '政', tagColor: '#A83B3B', tagBg: 'rgba(168,59,59,.12)' },
}

const DEFAULT_SUBJECT_STYLE = { glyph: '学', tagColor: '#0E5E4E', tagBg: 'rgba(14,94,78,.10)' }

function subjectStyle(subject: string) {
  return SUBJECT_STYLES[subject] || DEFAULT_SUBJECT_STYLE
}

function inferSubjectFromText(text?: string | null): string {
  if (!text) return ''
  const match = text.match(/(数学|英语|物理|化学|语文|生物|历史|地理|政治|道德与法治)/)
  return match ? match[1] : ''
}

function resolveFeedbackSubject(feedback: FeedbackItem): string {
  const candidate = (feedback.resolvedSubject || feedback.subjectSnapshot || '').trim()
  if (candidate && candidate !== '课堂反馈') return candidate

  const lessonSubject = (feedback.classLesson?.subject || '').trim()
  if (lessonSubject && lessonSubject !== '课堂反馈') return lessonSubject

  const cardSubject = (feedback.knowledgeDetail?.subject || '').trim()
  if (cardSubject && cardSubject !== '课堂反馈') return cardSubject

  const fromCourse = inferSubjectFromText(feedback.classLesson?.group?.course?.name)
  if (fromCourse) return fromCourse

  const fromTeacher = inferSubjectFromText(feedback.teacher?.subjects)
  if (fromTeacher) return fromTeacher

  const fromLessonName = inferSubjectFromText(feedback.classLesson?.name)
  if (fromLessonName) return fromLessonName

  return ''
}

function formatTeacherDisplayName(teacherName?: string | null): string {
  const name = teacherName?.trim() || '任课'
  if (name.endsWith('老师') || name.endsWith('教练') || name.endsWith('助教')) {
    return name
  }
  return `${name}老师`
}

function resolveFeedbackDisplayContent(feedback: FeedbackItem, unread: boolean): { summary: string; topic: string } {
  const topic = (feedback.knowledgeDetail?.topic || feedback.knowledgePoints?.[0] || '').trim()
  const rawSummary = (feedback.summary || '').trim()
  if (rawSummary) {
    return { summary: rawSummary, topic }
  }
  const lessonContent = (feedback.lessonContent || '').trim()
  if (lessonContent) {
    return { summary: lessonContent, topic }
  }
  const comment = (feedback.overallComment || '').trim()
  if (comment) {
    return { summary: comment, topic }
  }
  if (topic) {
    return { summary: `本节课重点学习了【${topic}】，点击查看详细掌握情况与作业。`, topic }
  }
  return {
    summary: unread ? '老师已发送本节课的学情记录，请点击查看。' : '老师已发布本节学情记录与课堂表现，点击查看详情。',
    topic,
  }
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
  const { mutate: mutateSWR } = useSWRConfig()
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
      await mutateSWR(isParentUnreadCountsCacheKey).catch(() => {
        toast.warning('反馈已标记为已读，但未读角标暂时无法同步')
      })
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
        void persistFeedbackReadState(highlightedFeedback.id)
          .then(() => mutateSWR(isParentUnreadCountsCacheKey).catch(() => {
            toast.warning('反馈已标记为已读，但未读角标暂时无法同步')
          }))
          .catch((error: unknown) => {
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
  }, [activeChildId, highlightedFeedback, mutateSWR, router])

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
            <div className="parent-feedback-list">{group.items.map((f, rowIndex) => {
              const subject = resolveFeedbackSubject(f)
              const subjectMeta = subject ? subjectStyle(subject) : null
              const unread = !f.parentReadAt && f.status === 'PUBLISHED' && !locallyReadIds.has(f.id)
              const teacherDisplayName = formatTeacherDisplayName(f.teacher?.name)
              const { summary, topic } = resolveFeedbackDisplayContent(f, unread)
              const courseLabel = f.classLesson?.group?.course?.name || ''
              const singleSessionLabel = f.isSingleSession
                ? `单次课程${f.sessionDate ? ` · ${new Date(f.sessionDate).toLocaleDateString('zh-CN')}` : ''}`
                : ''
              return <button type="button" key={f.id} className="parent-feedback-row stagger-item" style={{ animationDelay: `${Math.min(rowIndex, 8) * 40}ms` }} onClick={() => openDetail(f)}>
                <div className="parent-feedback-avatar-col">
                  <div className="parent-feedback-avatar-wrapper">
                    <CachedAvatarImage
                      src={getTeacherAvatarUrl(f.teacher?.avatar, f.teacher?.gender, f.teacher?.name)}
                      alt={teacherDisplayName}
                      className="parent-feedback-avatar-img"
                      style={{ width: 44, height: 44 }}
                      fallbackSrc={DEFAULT_TEACHER_AVATAR}
                    />
                    {unread && <span className="parent-feedback-unread-badge" aria-label="未读" />}
                  </div>
                </div>
                <span className="parent-feedback-body">
                  <span className="parent-feedback-heading">
                    <span className="parent-feedback-heading-left">
                      <strong>{teacherDisplayName}</strong>
                      {subject && (
                        <span className="parent-feedback-subject" style={{ color: subjectMeta?.tagColor, background: subjectMeta?.tagBg, borderColor: `${subjectMeta?.tagColor}33` }}>
                          {subject}
                        </span>
                      )}
                      {f.consecutiveSessionLabel ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: 'rgba(232, 120, 74, 0.12)', color: '#C2572C', border: '1px solid rgba(232, 120, 74, 0.3)',
                        }}>
                          {f.consecutiveSessionLabel}
                        </span>
                      ) : (
                        <span className="parent-feedback-type-badge">📖 课堂反馈</span>
                      )}
                    </span>
                    <time>{formatFriendlyTime(f.createdAt)}</time>
                  </span>
                  {topic && (
                    <span className="parent-feedback-topic-pill">
                      <span className="topic-icon">🎯</span>
                      <span className="topic-text">知识点：{topic}</span>
                    </span>
                  )}
                  <span className="parent-feedback-summary" title={summary}>{summary}</span>
                  <span className="parent-feedback-footer">
                    <span className="parent-feedback-extras">
                      {f.displayStudentName && <span>学员：{f.displayStudentName}</span>}
                      {courseLabel && <span>{courseLabel}</span>}
                      {f.term?.name && <span>{f.term.name.replace(/^牧哲学堂/, '').replace(/批次$/, '')}</span>}
                      {singleSessionLabel && <span>{singleSessionLabel}</span>}
                      {f.imageUrls?.length > 0 && <span><CameraOutlined /> {f.imageUrls.length}张照片</span>}
                      {f.parentReply && <span><MessageOutlined /> 已回复</span>}
                    </span>
                    <span className="parent-feedback-action-btn">
                      <span>查看完整反馈</span>
                      <RightOutlined style={{ fontSize: 9 }} />
                    </span>
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
