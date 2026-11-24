'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Input, Space, Tag, Typography, Alert, message as antdMessage } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { isParentUnreadCountsCacheKey } from '@/lib/parent-unread-cache'
import { fmtDateTime } from '@/lib/format-date'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import type { FeedbackImageVariant } from '@/lib/file-asset-variants'
import { getOverallEvaluationContent, getParentFeedbackDisplaySections } from '@/lib/classroom-feedback/parent-feedback-content'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { ParentFeedbackReportContent } from '@/components/Feedback/ParentFeedbackReportContent'
import { ParentClassroomFeedbackEvaluation } from '@/components/Feedback/ParentClassroomFeedbackEvaluation'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import type { KnowledgeProgressEntry } from '@/lib/classroom-feedback/knowledge-progress'
import { normalizeFollowupReview, normalizePracticeCheckin, type StudentFollowupReview, type ParentPracticeCheckin } from '@/lib/classroom-feedback/feedback-followup'
import {
  buildPersonalizedLearningFallback,
  getTeacherSupportTags,
  normalizePersonalizedLearningExtension,
  type PersonalizedLearningExtension,
} from '@/lib/classroom-feedback/personalized-learning'

const { Text } = Typography

type HomeworkItem = string | { title?: string; content?: string }
type ParentLearningSnapshot = {
  performance: string | null
  mastery: string | null
  tags: string[]
  teachingActions: string[]
  teacherRemark: string | null
  nextLessonFocus: string | null
  personalizedLearning: PersonalizedLearningExtension | null
  followupReview: StudentFollowupReview | null
  practiceCheckin: ParentPracticeCheckin | null
}
type FeedbackDetail = {
  resolvedSubject?: string
  consecutiveSessionLabel?: string | null
  displayStudentName?: string | null
  selectedStudentId?: string | null
  interaction?: {
    pickCount: number
    correctCount: number
    partialCount: number
    needsWorkCount: number
    items: Array<{
      id: string
      result: string | null
      resultLabel: string
      comment: string | null
      tags?: string[]
      questionLabel: string | null
      createdAt: string
    }>
  } | null
  knowledgeProgressEntries?: KnowledgeProgressEntry[]
  id: string
  status: string
  isSingleSession?: boolean
  subjectSnapshot?: string | null
  sessionDate?: string | null
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

const STUDENT_PERFORMANCE_LABELS: Record<string, string> = {
  GREAT: '表现积极',
  OKAY: '状态平稳',
  NEEDS_IMPROVEMENT: '需要更多引导',
}

function readParentLearningSnapshot(
  value: unknown,
  context: { topic?: string; overallComment?: string; homework?: string[] } = {},
): ParentLearningSnapshot {
  const candidate = Array.isArray(value) ? value[0] : value
  const record = candidate && typeof candidate === 'object'
    ? candidate as Record<string, unknown>
    : null
  const rating = typeof candidate === 'string'
    ? candidate
    : typeof record?.rating === 'string' ? record.rating : ''
  const tags = Array.isArray(record?.tags)
    ? record.tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())).slice(0, 30)
    : []

  const mastery = typeof record?.masteryLevel === 'string' && record.masteryLevel.trim()
      ? record.masteryLevel.trim()
      : null
  const nextLessonFocus = typeof record?.nextLessonFocus === 'string' && record.nextLessonFocus.trim()
    ? record.nextLessonFocus.trim().slice(0, 120)
    : null
  const personalizedLearning = normalizePersonalizedLearningExtension(record?.personalizedLearning)
    || buildPersonalizedLearningFallback({
      topic: context.topic,
      mastery,
      tags,
      overallComment: context.overallComment,
      nextLessonFocus,
      homework: context.homework,
    })
  const teachingActions = getTeacherSupportTags(tags)
  return {
    performance: STUDENT_PERFORMANCE_LABELS[rating] || null,
    mastery,
    tags: tags.filter((tag) => !teachingActions.includes(tag)),
    teachingActions,
    teacherRemark: typeof record?.teacherRemark === 'string' && record.teacherRemark.trim()
      ? record.teacherRemark.trim().slice(0, 350)
      : null,
    nextLessonFocus,
    personalizedLearning,
    followupReview: normalizeFollowupReview(record?.followupReview),
    practiceCheckin: normalizePracticeCheckin(record?.practiceCheckin),
  }
}

function normalizeHomeworkItems(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (typeof item === 'string') return item.trim()
    if (!item || typeof item !== 'object') return ''
    const record = item as Record<string, unknown>
    const content = typeof record.content === 'string' ? record.content.trim() : ''
    const title = typeof record.title === 'string' ? record.title.trim() : ''
    return content || title
  }).filter(Boolean).slice(0, 30)
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
  return feedback.resolvedSubject || feedback.subjectSnapshot || feedback.classLesson?.group?.course?.subject || '课堂反馈'
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
  const [conversationRetry, setConversationRetry] = useState(0)
  const [readStateError, setReadStateError] = useState<string | null>(null)
  const [readStateRetry, setReadStateRetry] = useState(0)
  const { mutate: mutateSWR } = useSWRConfig()

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
    : feedback.isSingleSession && feedback.sessionDate
      ? `${fmtDateOnly(feedback.sessionDate)} · 单次课程`
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
  const sections = getParentFeedbackDisplaySections({ ...feedback, summary: null, studentName: feedback.displayStudentName })
  const classroomFeedbackContent = sections.find((section) => section.label === '课堂反馈')?.content || ''
  const feedbackParagraphs = classroomFeedbackContent
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const overallEvaluation = getOverallEvaluationContent(feedback.overallComment) || feedbackParagraphs[0] || ''
  const classroomFollowup = overallEvaluation
    ? feedbackParagraphs.slice(1).join('\n\n')
    : classroomFeedbackContent
  const additionalSections = sections.filter((section) => section.label !== '课堂反馈')
  const knowledgeCard = parseStoredKnowledgeCard(feedback.knowledgeCard)
  const homeworkItems = normalizeHomeworkItems(feedback.homework)
  const learningTopic = feedback.knowledgePoints?.find((point) => point.trim()) || knowledgeCard?.topic || ''
  const learningSnapshot = readParentLearningSnapshot(feedback.studentRating, {
    topic: learningTopic,
    overallComment: feedback.overallComment || '',
    homework: homeworkItems,
  })
  useEffect(() => {
    if (feedback.status !== 'PUBLISHED') return
    let cancelled = false
    void (async () => {
      let markedRead = Boolean(feedback.parentReadAt)
      try {
        if (!feedback.parentReadAt) {
          const response = await fetch('/api/feedback', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: feedback.id, markRead: true }),
          })
          const data = await response.json().catch(() => null) as { error?: string } | null
          if (!response.ok) throw new Error(data?.error || '阅读状态同步失败')
          markedRead = true
        }
        // 服务端页面可能已先写入已读状态，仍刷新聚合计数，避免侧栏角标停留在旧值。
        await mutateSWR(isParentUnreadCountsCacheKey)
        if (!cancelled) setReadStateError(null)
      } catch (error) {
        if (!cancelled) {
          setReadStateError(markedRead
            ? '反馈已标记为已读，但未读角标刷新失败，请重试'
            : error instanceof Error ? error.message : '阅读状态同步失败，请重试')
        }
      }
    })()
    return () => { cancelled = true }
  }, [feedback.id, feedback.parentReadAt, feedback.status, readStateRetry, mutateSWR])

  // 加载家校沟通记录
  useEffect(() => {
    let cancelled = false
    setLoadingConversation(true)
    void fetch(`/api/feedback/${feedback.id}/messages`)
      .then(async (res) => {
        const data = await res.json().catch(() => null) as {
          conversation?: { id: string; replies: Array<{ id: string; authorName: string; role: string; content: string; createdAt: string }> } | null
          error?: string
        } | null
        if (!res.ok) throw new Error(data?.error || `沟通记录加载失败（${res.status}）`)
        return data
      })
      .then((data) => {
        if (cancelled) return
        setConversation(data?.conversation || null)
        setConversationError(null)
        void mutateSWR(isParentUnreadCountsCacheKey).catch(() => {
          if (!cancelled) void antdMessage.warning('沟通记录已加载，但未读角标暂时无法同步')
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) setConversationError(error instanceof Error ? error.message : '沟通记录加载失败，请重试')
      })
      .finally(() => { if (!cancelled) setLoadingConversation(false) })
    return () => { cancelled = true }
  }, [feedback.id, conversationRetry, mutateSWR])

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
        className="mobile-shell-back"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/parent/class-feedback')}
        style={{ marginBottom: 16, padding: 0, color: '#5a4e3a' }}
      >
        返回课堂反馈
      </Button>
      {readStateError && (
        <Alert
          type="warning"
          showIcon
          message={readStateError}
          action={<Button size="small" icon={<ReloadOutlined />} onClick={() => setReadStateRetry((value) => value + 1)}>重试</Button>}
          style={{ marginBottom: 12, borderRadius: 10 }}
        />
      )}

      {/* 学科 Hero：孩子姓名 + 日期星期 + 学科与老师 + 连堂课时标记（鎏金深绿横幅） */}
      {(() => {
        const lessonDateRaw = feedback.classLesson?.lessonDate || feedback.sessionDate || feedback.createdAt
        const dateObj = new Date(lessonDateRaw)
        const weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
        const weekdayLabel = !isNaN(dateObj.getTime()) ? weekdayNames[dateObj.getDay()] : ''
        const dateYmd = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : ''
        const bannerDateLabel = dateYmd ? `${dateYmd} · ${weekdayLabel}` : ''
        return (
          <div className="parent-entry-stagger" style={{
            borderRadius: 18,
            overflow: 'hidden',
            border: '1.5px solid rgba(201,164,92,.65)',
            background: 'linear-gradient(150deg,#17352F 0%,#0E5E4E 62%,#0B4B40 100%)',
            padding: '16px 18px',
            color: '#F5F1E8',
            marginBottom: 12,
            boxShadow: '0 8px 22px rgba(18,60,53,.22)',
            '--entry-stagger-index': 0,
          } as React.CSSProperties}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, color: '#F2E3B6', fontWeight: 600, letterSpacing: 0.5 }}>
                  {feedback.displayStudentName ? `${feedback.displayStudentName} · 课堂学习反馈` : '课堂学习反馈'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', marginTop: 3 }}>
                  {bannerDateLabel} {feedback.consecutiveSessionLabel ? `· ${feedback.consecutiveSessionLabel}` : '· 1节课堂反馈'}
                </div>
              </div>
              <Tag style={{
                borderRadius: 9999,
                fontSize: 11.5,
                padding: '2px 10px',
                background: 'rgba(242,227,182,.18)',
                border: '1px solid rgba(242,227,182,.45)',
                color: '#F6ECD2',
                fontWeight: 700,
              }}>
                {feedback.status === 'PUBLISHED' ? '已结清 ✓' : feedback.status}
              </Tag>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: 'rgba(245,241,232,.92)' }}>
              <span style={{
                padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                color: '#14574D', background: '#F6ECD2',
              }}>{subject}</span>
              <strong style={{ color: '#F6ECD2' }}>{teacher?.name || '任课老师'}</strong>
              <span>·</span>
              <span>{course?.name || (feedback.isSingleSession ? `${subject}单次强化` : '学科冲刺')}</span>
              {lessonTime && <span>({lessonTime})</span>}
            </div>
          </div>
        )
      })()}

      {/* 教师 HERO 卡：头像 + 姓名 + 等级标签 + 学科，卡片颜色随教师等级 */}
      <div className="parent-entry-stagger" style={{
        display: 'flex', gap: 13, alignItems: 'center',
        padding: 14, marginBottom: 12,
        background: tierTheme.bg,
        border: `1.5px solid ${tierTheme.border}`,
        borderRadius: 16,
        boxShadow: '0 4px 14px rgba(58,50,39,.08)',
        '--entry-stagger-index': 1,
      } as React.CSSProperties}>
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

      <Card bordered={false} className="parent-entry-stagger" style={{ borderRadius: 14, background: '#fff', border: '1px solid rgba(201,164,92,.3)', boxShadow: '0 2px 10px rgba(58,50,39,.05)', '--entry-stagger-index': 2 } as React.CSSProperties}>
        <ParentFeedbackReportContent
          childId={childId}
          subject={subject}
          knowledgePoints={feedback.knowledgePoints || []}
          knowledgeCard={knowledgeCard}
          images={images.map((image, index) => ({
            id: image.originalUrl || String(index),
            thumbnailUrl: signedThumbnails[index] || image.thumbnailUrl || image.previewUrl || image.originalUrl,
            previewUrl: signedPreviews[index] || signedThumbnails[index] || image.previewUrl || image.thumbnailUrl || image.originalUrl,
          }))}
          isMobile={isMobile}
          imageError={thumbnailError || previewError}
          onRetryImages={() => { retryThumbnails(); retryPreviews() }}
          onImagePreviewVisibilityChange={setImagePreviewOpen}
          overallEvaluation={overallEvaluation}
          classroomFollowup={classroomFollowup}
          additionalSections={additionalSections}
          homeworkItems={homeworkItems}
          homeworkCheckin={feedback.status === 'PUBLISHED' && homeworkItems.length > 0 && feedback.selectedStudentId
            ? { feedbackId: feedback.id, studentId: feedback.selectedStudentId }
            : null}
          learning={{
            studentName: feedback.displayStudentName,
            topic: learningTopic,
            mastery: learningSnapshot.mastery,
            performance: learningSnapshot.performance,
            tags: [
              ...learningSnapshot.tags,
              ...learningSnapshot.teachingActions,
              ...(feedback.interaction?.items.flatMap((item) => item.tags || []) || []),
            ],
            teacherRemark: learningSnapshot.teacherRemark,
            overallComment: feedback.overallComment,
            nextLessonFocus: learningSnapshot.nextLessonFocus,
            homework: homeworkItems,
            extension: learningSnapshot.personalizedLearning,
          }}
          progressEntries={feedback.knowledgeProgressEntries || []}
          followupReview={learningSnapshot.followupReview}
          showPracticeButton={Boolean(feedback.selectedStudentId)}
          practiceCheckin={feedback.status === 'PUBLISHED' && feedback.selectedStudentId ? {
            feedbackId: feedback.id,
            studentId: feedback.selectedStudentId,
            initialValue: learningSnapshot.practiceCheckin,
          } : null}
          onOpenPractice={() => {
            const params = new URLSearchParams()
            params.set('childId', childId || '')
            params.set('source', 'feedback')
            params.set('subject', subject)
            const points = (feedback.knowledgePoints || []).slice(0, 6)
            points.forEach((point, index) => { if (index === 0) params.set('topic', point); else params.append('point', point) })
            router.push('/parent/practice?' + params.toString())
          }}
        />

        {/* 本节课课堂提问与随堂互动：将教师端记录的作答表现与教学深度评语标签完整呈现 */}
        {feedback.interaction && feedback.interaction.pickCount > 0 && (
          <div
            className="parent-interaction-section"
            style={{
              marginTop: 18,
              padding: '14px 16px',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF8F4 100%)',
              border: '1px solid rgba(20, 87, 77, 0.12)',
              borderRadius: 14,
              boxShadow: '0 2px 8px rgba(20, 60, 50, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>🎯</span>
                <Text strong style={{ fontSize: 14.5, color: '#14574D' }}>本节随堂提问与深度点评</Text>
              </div>
              <span style={{ fontSize: 11.5, color: '#8b7f6b', fontWeight: 500 }}>
                共提问 {feedback.interaction.pickCount} 次
                {feedback.interaction.correctCount > 0 ? ` · 答对 ${feedback.interaction.correctCount} 次` : ''}
                {feedback.interaction.partialCount > 0 ? ` · 部分对 ${feedback.interaction.partialCount} 次` : ''}
                {feedback.interaction.needsWorkCount > 0 ? ` · 需订正 ${feedback.interaction.needsWorkCount} 次` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {feedback.interaction.items.map((item, index) => {
                const tone = item.result === 'CORRECT'
                  ? { bg: '#edf6f1', border: '#cfe7db', color: '#2e7d5b', mark: '🎯' }
                  : item.result === 'PARTIAL'
                    ? { bg: '#fdf7ec', border: '#e6d3ac', color: '#a4711c', mark: '💡' }
                    : item.result === 'NEEDS_WORK'
                      ? { bg: '#fdf3f0', border: '#e8c4bb', color: '#b4452f', mark: '⚠️' }
                      : { bg: '#f1f5f9', border: '#cbd5e1', color: '#475569', mark: '🌱' }
                const tags = item.tags && item.tags.length > 0
                  ? item.tags
                  : (item.comment ?? '').split(/[、\n]/).map((t) => t.trim()).filter(Boolean)

                return (
                  <div
                    key={item.id}
                    className="stagger-item"
                    style={{
                      padding: '11px 13px',
                      background: '#FFFFFF',
                      border: '1px solid rgba(20, 87, 77, 0.08)',
                      borderRadius: 11,
                      animationDelay: `${Math.min(index, 8) * 40}ms`,
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#5C503D', fontVariantNumeric: 'tabular-nums' }}>
                          第 {index + 1} 次提问
                        </span>
                        {item.resultLabel ? (
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8.5px', borderRadius: 999,
                            background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color,
                          }}>
                            {tone.mark} {item.resultLabel}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10.5, color: '#a49884', padding: '2px 8px', borderRadius: 999, background: '#faf8f5', border: '1px solid #eee7e1' }}>
                            已记录作答
                          </span>
                        )}
                        {item.questionLabel ? (
                          <span style={{ fontSize: 11, color: '#8b7f6b', background: '#F5F1E9', padding: '1px 6px', borderRadius: 4 }}>
                            {item.questionLabel}
                          </span>
                        ) : null}
                      </div>
                      <span style={{ fontSize: 10.5, color: '#A09483' }}>
                        {fmtDateTime(item.createdAt)}
                      </span>
                    </div>

                    {/* 教学深度评语标签卡片 */}
                    {tags.length > 0 ? (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {tags.map((tagText, tIdx) => (
                          <div
                            key={tIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 7,
                              padding: '8px 11px',
                              borderRadius: 8,
                              background: tone.bg,
                              border: `1px solid ${tone.border}`,
                              fontSize: 12.5,
                              lineHeight: 1.6,
                              color: '#2C2416',
                            }}
                          >
                            <span style={{ color: tone.color, fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: -1 }}>“</span>
                            <span style={{ flex: 1, wordBreak: 'break-word', fontWeight: 500 }}>{tagText}</span>
                          </div>
                        ))}
                      </div>
                    ) : item.comment ? (
                      <div
                        style={{
                          marginTop: 8,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 7,
                          padding: '8px 11px',
                          borderRadius: 8,
                          background: tone.bg,
                          border: `1px solid ${tone.border}`,
                          fontSize: 12.5,
                          lineHeight: 1.6,
                          color: '#2C2416',
                        }}
                      >
                        <span style={{ color: tone.color, fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: -1 }}>“</span>
                        <span style={{ flex: 1, wordBreak: 'break-word', fontWeight: 500 }}>{item.comment}</span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#8C7E6A', lineHeight: 1.6 }}>
              💡 仅展示孩子本人的随堂提问与专业点评标签，帮助家长及时跟进孩子在课堂上的思考与作答状态。
            </div>
          </div>
        )}

        {feedback.status === 'PUBLISHED' && <ParentClassroomFeedbackEvaluation feedbackId={feedback.id} />}
        {/* 家校沟通记录 */}
        <div style={{ borderTop: '1px solid rgba(201,164,92,.3)', paddingTop: 14, marginTop: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 10 }}>家校沟通记录</Text>
          {conversationError && (
            <Alert
              type="error"
              showIcon
              message={conversationError}
              action={<Button size="small" icon={<ReloadOutlined />} onClick={() => setConversationRetry((value) => value + 1)}>重新加载</Button>}
              style={{ marginBottom: 10 }}
            />
          )}
          {loadingConversation && !conversation ? (
            <div role="status" aria-live="polite" aria-label="正在加载沟通记录" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div className="mz-skeleton" style={{ width: '58%', maxWidth: '85%', height: 34, borderRadius: 12 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div className="mz-skeleton" style={{ width: '42%', maxWidth: '85%', height: 34, borderRadius: 12 }} />
              </div>
            </div>
          ) : null}
          {(conversation?.replies || []).map((reply, replyIndex) => {
            const isParent = reply.role === 'parent'
            return (
              <div key={reply.id} className="stagger-item" style={{ display: 'flex', justifyContent: isParent ? 'flex-end' : 'flex-start', marginBottom: 8, animationDelay: `${Math.min(replyIndex, 8) * 40}ms` }}>
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
