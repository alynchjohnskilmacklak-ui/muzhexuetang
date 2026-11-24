'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import NextImage from 'next/image'
import { Button, Card, Segmented, Select, Tag, Typography, Progress, Spin, Space } from 'antd'
import {
  FileTextOutlined, MessageOutlined, HeartOutlined, TrophyOutlined,
  RiseOutlined, FlagOutlined, BookOutlined, CheckCircleOutlined,
  DownloadOutlined, LeftOutlined, RightOutlined, ClockCircleOutlined,
  CalendarOutlined, BarChartOutlined, FolderOpenOutlined, HistoryOutlined,
  SmileOutlined, MinusOutlined, WarningOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import useSWR, { useSWRConfig } from 'swr'
import { isParentUnreadCountsCacheKey } from '@/lib/parent-unread-cache'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import type { StudentProfile } from '@/lib/student-profile'
import type { FeedbackArchiveResult } from '@/lib/classroom-feedback/archive'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { fmtDate } from '@/lib/format-date'
import type { FeedbackImageVariant } from '@/lib/file-asset-variants'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { HoursLeaderboard } from '@/components/Parent/HoursLeaderboard'
import { ParentLessonPreviewHistory } from '@/components/Parent/ParentLessonPreviewHistory'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { MOOD_META, PERFORMANCE_BADGES } from '@/lib/mood-meta'
import { formatRemaining } from '@/lib/lesson-units'
import { exportReportPdf } from '@/lib/export-report-pdf'
import { resolveTeacherSubjectList } from '@/lib/classroom-feedback/parent-pdf'
import { consumeNdjsonStream } from '@/lib/student-growth/consume-ndjson-stream'
import { MathText } from '@/app/parent/materials/MathText'
import { BrandModal } from '@/components/Common/BrandModal'
import { PersonalizedLearningPath } from '@/components/Feedback/PersonalizedLearningPath'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import { getArchiveEntryTransitionName, getTiltSurfacePosition, resolveTrendIndex, runDocumentViewTransition } from '@/lib/ui-motion'
import { shouldSearchChoices, shouldUseInlineChoices } from '@/lib/choice-thresholds'
import { distinctChoiceLabels } from '@/lib/distinct-choice-labels'

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div aria-label="图表加载中" style={{ height: 200, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }} />,
})

const { Title, Text, Paragraph } = Typography

const TYPE_ICON: Record<string, React.ReactNode> = {
  paper: <FileTextOutlined />, feedback: <MessageOutlined />, post: <HeartOutlined />,
  badge: <TrophyOutlined />, grade: <RiseOutlined />, goal: <FlagOutlined />,
}
const TYPE_COLOR: Record<string, string> = {
  paper: '#E8784A', feedback: '#534AB7', post: '#E8784A',
  badge: '#EF9F27', grade: '#1D9E75', goal: '#534AB7',
}
const TIMELINE_LABEL: Record<string, string> = {
  paper: '试卷', feedback: '课堂反馈', post: '成长反馈', badge: '徽章', grade: '成绩', goal: '学习目标',
}

const FILTER_CHIPS = [
  { key: '', label: '全部' },
  { key: 'study', label: '学习', types: ['paper'] },
  { key: 'habit', label: '课堂', types: ['feedback'] },
  { key: 'record', label: '成长', types: ['post', 'grade'] },
  { key: 'case', label: '目标', types: ['badge', 'goal'] },
]

const TABS = [
  { key: 'overview', label: '概览', icon: '📊', hint: '总览' },
  { key: 'timeline', label: '时间线', icon: '🗓', hint: '记录' },
  { key: 'grades', label: '学习分析', icon: '📚', hint: '课时' },
]

const TREND_PRESENTATION = {
  IMPROVING: { label: '↑ 持续进步', icon: <RiseOutlined />, color: 'var(--color-success)', background: 'var(--color-success-bg)' },
  STABLE: { label: '→ 保持稳定', icon: <MinusOutlined />, color: 'var(--color-primary)', background: 'var(--color-primary-bg)' },
  NEEDS_ATTENTION: { label: '△ 需要关注', icon: <WarningOutlined />, color: 'var(--color-warning-text)', background: 'var(--color-surface-3)' },
} as const


type InitialData = { children: { id: string; name: string; grade: string | null; recordIds: string[] }[]; activeStudentId: string | null; profile: StudentProfile | null; parentId?: string | null }
type TimelineItem = StudentProfile['record']['timeline'][number]
type FeedbackReportDay = { dateKey: string; items: TimelineItem[] }
type FeedbackReportWeek = { startKey: string; endKey: string; days: FeedbackReportDay[] }
type FeedbackDetailData = TimelineItem['detail']
type Paper = { id: string; title: string; subject?: string | null; paperDate?: string | null; student?: { id?: string; name?: string } | null; questions?: Array<{ topic?: string | null; mastery?: string | null }> }
type Enrollment = { id: string; totalHours?: number | null; remainHours?: number | null; group?: { id: string; name?: string | null; intensiveMode?: string | null; lessonMinutes?: number | null; course?: { id: string; name?: string | null; type?: string | null } | null } | null }
type HourRecord = { id: string; status: string; hoursDeducted?: number | null; approvedTeachingHours?: number | null; isIntensiveApproved?: boolean; date?: string | null; courseName?: string | null; teacherName?: string | null; courseType?: string | null; lessonMinutes?: number | null; type?: string | null }
type ReportSummary = {
  overview: string
  strengths: string[]
  focusAreas: string[]
  nextSteps: string[]
  period?: { from: string; to: string }
}
type LearningReportEvent =
  | { type: 'profile'; profile: StudentProfile; summary: ReportSummary; period: { from: string; to: string } }
  | { type: 'summary'; summary: ReportSummary; period: { from: string; to: string } }
type LearningReportCacheEntry = { profile: StudentProfile; summary: ReportSummary }

const fetcher = (url: string) => fetch(url).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || '请求失败'); return d })

function formatTeacherLabel(item?: { teacher?: string; teacherSubject?: string }) {
  if (!item?.teacher) return ''
  return `${item.teacher} 老师${item.teacherSubject ? ` · ${item.teacherSubject}` : ''}`
}

// 老师等级标签映射
const TEACHER_TIER_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  ELITE: { label: '牧哲学堂专属教师', bg: 'linear-gradient(135deg,#C9A45C,#A8873D)', color: '#fff' },
  SENIOR: { label: '资深教师', bg: '#5B8DEF', color: '#fff' },
  EXPERIENCED: { label: '骨干教师', bg: '#52A867', color: '#fff' },
  NEW: { label: '新教师', bg: '#98A2B3', color: '#fff' },
}

function TeacherNameWithTag({ name, tier }: { name: string; tier?: string | null }) {
  const tierInfo = tier ? TEACHER_TIER_LABEL[tier] : null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
      <span>{name} 老师</span>
      {tierInfo && (
        <span style={{
          background: tierInfo.bg,
          color: tierInfo.color,
          borderRadius: 999,
          fontSize: 10,
          padding: '1px 7px',
          lineHeight: '16px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          {tierInfo.label}
        </span>
      )}
    </span>
  )
}

function timelineKey(item: { type?: string; refId?: string; id?: string }, index: number) {
  return `${item.type || 'item'}-${item.refId || item.id || index}`
}

const REPORT_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function localDateKey(value: Date | string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDateKey(dateKey: string, amount: number) {
  const date = new Date(dateKey + 'T12:00:00')
  date.setDate(date.getDate() + amount)
  return localDateKey(date)
}

function getReportWeekStart(dateKey: string) {
  const date = new Date(dateKey + 'T12:00:00')
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return localDateKey(date)
}

function formatReportMonthDay(dateKey: string) {
  const date = new Date(dateKey + 'T12:00:00')
  return (date.getMonth() + 1) + '月' + date.getDate() + '日'
}

function reportWeekday(dateKey: string) {
  const date = new Date(dateKey + 'T12:00:00')
  return REPORT_WEEKDAYS[(date.getDay() + 6) % 7]
}

function fmtDateOnly(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function FeedbackDetail({ detail }: { detail?: FeedbackDetailData }) {
  if (!detail) return null
  const kCard = detail.knowledgeCard ? parseStoredKnowledgeCard(detail.knowledgeCard) : null
  return (
    <div className="parent-growth-feedback-detail">
      {!!detail.knowledgePoints?.length && <section><Text strong><BookOutlined />知识点</Text><div>{detail.knowledgePoints.map((item: string) => <Tag key={item} color="green">{item}</Tag>)}</div></section>}
      {kCard && (
        <section style={{ background: '#FFFDF7', border: '1px solid #EFE7D3', borderRadius: 10, padding: '10px 12px', marginTop: 8 }}>
          <Text strong style={{ display: 'block', marginBottom: 6 }}><BookOutlined />知识点详解</Text>
          {kCard.topic && <div style={{ fontSize: 12, fontWeight: 600, color: '#8A6D3B', marginBottom: 6 }}>{kCard.topic}</div>}
          {(kCard.formulas?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8A6D3B', marginBottom: 3 }}>公式或方法</div>
              {kCard.formulas.map((formula, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.7, color: '#4B5563', whiteSpace: 'pre-wrap' }}><MathText text={formula} /></div>
              ))}
            </div>
          )}
          {kCard.definition && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8A6D3B', marginBottom: 3 }}>知识讲解</div>
              <div style={{ fontSize: 12, lineHeight: 1.8, color: '#4B5563' }}><MathText text={kCard.definition} /></div>
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
                {kCard.example.question && <div style={{ marginBottom: 3 }}>题目：<MathText text={kCard.example.question} /></div>}
                {(kCard.example.steps?.length ?? 0) > 0 && kCard.example.steps.map((step, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>{i + 1}. <MathText text={step} /></div>
                ))}
                {kCard.example.answer && <div style={{ marginTop: 3 }}>答案：<MathText text={kCard.example.answer} /></div>}
              </div>
            </div>
          )}
        </section>
      )}
      {!!detail.homework?.length && <section><Text strong><CheckCircleOutlined />作业</Text><ol>{detail.homework.map((item: string, index: number) => <li key={`${item}-${index}`}>{item}</li>)}</ol></section>}
      {detail.summary && <section><Text strong><FileTextOutlined />课堂小结</Text><Paragraph>{detail.summary}</Paragraph></section>}
      {!!detail.tags?.length && <section><Text strong><MessageOutlined />表现标签</Text><div>{detail.tags.map((item: string) => <Tag key={item} color="orange">{item}</Tag>)}</div></section>}
      {detail.badge && <section><Text strong><TrophyOutlined />徽章</Text><div><Tag color="gold">{detail.badge}</Tag></div></section>}
    </div>
  )
}

type TimelineImage = string | FeedbackImageVariant

function normalizeTimelineImage(image: TimelineImage) {
  return typeof image === 'string'
    ? { originalUrl: image, previewUrl: image, thumbnailUrl: image }
    : image
}

function TimelineImageStrip({ images }: { images: TimelineImage[] }) {
  const visibleImages = images.slice(0, 3).map(normalizeTimelineImage)
  const { urls } = useSignedUrls(visibleImages.map(image => image.thumbnailUrl || image.previewUrl || image.originalUrl))
  return (
    <div className="parent-growth-history-images">
      {visibleImages.map((image, imageIndex: number) => (
        <NextImage key={`${image.originalUrl}-${imageIndex}`} src={urls[imageIndex]} alt="课堂记录" width={48} height={48} unoptimized />
      ))}
      {images.length > 3 && <span>+{images.length - 3}张</span>}
    </div>
  )
}

function ReportFeedback({ item, signedUrls, imagesLoading, studentName, onImageError }: { item: TimelineItem; signedUrls: Record<string, string>; imagesLoading: boolean; studentName: string; onImageError: () => void }) {
  const photos = (item.images || []).map(normalizeTimelineImage)
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(() => new Set())
  const knowledgeCard = item.detail?.knowledgeCard ? parseStoredKnowledgeCard(item.detail.knowledgeCard) : null
  const unresolvedPhotos = photos.some((photo) => !signedUrls[photo.originalUrl] || failedPhotos.has(photo.originalUrl))
  const imagesPending = photos.length > 0 && (imagesLoading || unresolvedPhotos)
  const feedbackBody = item.detail?.comment || item.detail?.summary || item.sub || ''

  return <section data-report-pending={imagesPending ? 'true' : 'false'} style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.8, overflowWrap: 'anywhere' }}>
    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1B4A3D', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span>📅 {fmtDate(item.date)}</span>
      <span>·</span>
      <span style={{ color: '#E8784A' }}>{item.teacherSubject || '课堂反馈'}</span>
      <span>·</span>
      <span>{item.teacher || '任课老师'}</span>
    </h3>

    {feedbackBody && (
      <div style={{ background: '#FFFDF9', border: '1.5px solid rgba(232, 120, 74, 0.22)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ background: '#E8784A', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>01</span>
          <strong style={{ color: '#1B4A3D', fontSize: 14 }}>教师课堂反馈</strong>
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.85, color: '#2C3E50', whiteSpace: 'pre-wrap', margin: 0, fontFamily: '"Times New Roman", Times, "SimSun", "Songti SC", serif' }}>
          {feedbackBody}
        </p>
      </div>
    )}

    <FeedbackDetail detail={item.detail} />
    {item.detail && (
      <PersonalizedLearningPath
        compact
        posterMode
        studentName={studentName}
        topic={item.detail.knowledgePoints?.[0] || knowledgeCard?.topic}
        mastery={item.detail.studentMastery}
        performance={item.detail.studentPerformance}
        tags={item.detail.studentTags || []}
        overallComment={item.detail.comment}
        nextLessonFocus={item.detail.nextLessonFocus}
        homework={item.detail.homework || []}
        extension={item.detail.personalizedLearning}
        knowledgeCard={knowledgeCard}
      />
    )}
    {!item.detail && <p>{item.sub}</p>}
    {photos.length > 0 && imagesPending && (
      <div role={imagesLoading ? 'status' : 'alert'} style={{ padding: '10px 12px', marginTop: 10, borderRadius: 10, color: imagesLoading ? 'var(--color-ink-muted)' : 'var(--color-error)', background: imagesLoading ? 'var(--color-surface-2)' : 'var(--color-error-bg)', fontSize: 12 }}>
        {imagesLoading ? '正在读取本节课堂照片…' : '本节课堂照片暂时无法完整读取，请重试后再下载报告。'}
      </div>
    )}
    {photos.map((photo, index) => {
      const url = signedUrls[photo.originalUrl]
      if (!url || failedPhotos.has(photo.originalUrl)) return null
      return <NextImage key={`${photo.originalUrl}-${index}`} src={url} alt={`课堂照片 ${index + 1}`} width={800} height={600} unoptimized loading="lazy" decoding="async" data-report-optional-image="true" data-report-image-required="true" onError={() => { setFailedPhotos((current) => new Set(current).add(photo.originalUrl)); onImageError() }} style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 380, objectFit: 'contain', marginBlock: 10 }} />
    })}
  </section>
}



export function ParentArchiveClient({ initial }: { initial: InitialData }) {
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportRef = useRef<HTMLDivElement>(null)
  const timelineRefs = useRef<Record<string, HTMLElement | null>>({})
  const [studentId, setStudentId] = useState(() => initial.children.find((child) => child.recordIds.includes(searchParams.get('studentId') || ''))?.id || initial.activeStudentId || '')
  const [months, setMonths] = useState(1)
  const [timeFilter, setTimeFilter] = useState('')
  const [showAllTimeline, setShowAllTimeline] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [selectedReportDate, setSelectedReportDate] = useState('')
  const [reportPhotoFailedDate, setReportPhotoFailedDate] = useState('')
  const [reportImageRetryVersion, setReportImageRetryVersion] = useState(0)
  const reportSelectionInitialized = useRef('')
  const [reportDataState, setReportDataState] = useState<(LearningReportCacheEntry & { key: string }) | null>(null)
  const [reportSummaryLoading, setReportSummaryLoading] = useState(false)
  const [reportSummaryError, setReportSummaryError] = useState('')
  const [reportSummaryRefresh, setReportSummaryRefresh] = useState(0)
  const reportDataCache = useRef(new Map<string, LearningReportCacheEntry>())
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') && TABS.some(t => t.key === searchParams.get('tab')) ? (searchParams.get('tab') as string) : 'overview')
  const [selectedGrade, setSelectedGrade] = useState('初一')
  const [activeTrendIndex, setActiveTrendIndex] = useState(-1)
  const { mutate: mutateGlobal } = useSWRConfig()

  const reportKey = studentId ? [studentId, months].join(':') : ''
  const currentReportData = reportDataState?.key === reportKey ? reportDataState : null
  const reportProfile = currentReportData?.profile || null
  const reportSummary = currentReportData?.summary || null
  const reportWeeks = useMemo<FeedbackReportWeek[]>(() => {
    const byDate = new Map<string, TimelineItem[]>()
    for (const item of reportProfile?.record.reportFeedbacks || []) {
      const dateKey = localDateKey(item.date)
      if (!dateKey) continue
      byDate.set(dateKey, [...(byDate.get(dateKey) || []), item])
    }
    const byWeek = new Map<string, Map<string, TimelineItem[]>>()
    for (const [dateKey, items] of byDate) {
      const startKey = getReportWeekStart(dateKey)
      const week = byWeek.get(startKey) || new Map<string, TimelineItem[]>()
      week.set(dateKey, items)
      byWeek.set(startKey, week)
    }
    return Array.from(byWeek, ([startKey, days]) => ({
      startKey,
      endKey: shiftDateKey(startKey, 6),
      days: Array.from({ length: 7 }, (_, index) => {
        const dateKey = shiftDateKey(startKey, index)
        return { dateKey, items: days.get(dateKey) || [] }
      }),
    })).sort((left, right) => left.startKey.localeCompare(right.startKey))
  }, [reportProfile])
  const reportDays = reportWeeks.flatMap((week) => week.days.filter((day) => day.items.length > 0))
  const latestReportDateKey = reportDays[reportDays.length - 1]?.dateKey || ''
  const selectedReportDateKey = reportDays.some((day) => day.dateKey === selectedReportDate)
    ? selectedReportDate
    : latestReportDateKey
  const selectedReportWeekIndex = reportWeeks.findIndex((week) => week.startKey === getReportWeekStart(selectedReportDateKey))
  const selectedReportWeek = reportWeeks[selectedReportWeekIndex] || null
  const selectedReportDay = selectedReportWeek?.days.find((day) => day.dateKey === selectedReportDateKey) || null
  const selectedReportItems = useMemo(() => selectedReportDay?.items || [], [selectedReportDay])
  const selectedReportHasImages = selectedReportItems.some((item) => (item.images?.length || 0) > 0)
  const reportPhotoFailed = reportPhotoFailedDate === reportKey + '|' + selectedReportDateKey
  useEffect(() => {
    if (!reportOpen || !reportProfile || !reportKey || reportSelectionInitialized.current === reportKey) return
    setSelectedReportDate(latestReportDateKey)
    reportSelectionInitialized.current = reportKey
  }, [reportOpen, reportProfile, reportKey, latestReportDateKey])
  const query = studentId ? `/api/parent/profile?studentId=${studentId}&months=${months}` : null
  const { data, isLoading } = useSWR<{ children: InitialData['children']; activeStudentId: string; profile: StudentProfile | null }>(query, fetcher, {
    revalidateOnFocus: true, dedupingInterval: 30_000,
    onError: () => toast.error('加载档案失败，请刷新重试'),
  })

  const hoursQuery = studentId ? `/api/parent/hours-leaderboard?studentId=${studentId}` : null
  const { data: hoursData, isLoading: hoursLoading } = useSWR(hoursQuery, fetcher, { revalidateOnFocus: true, dedupingInterval: 60_000 })
  const leaderboardData = hoursData as
    | { studentName: string; mineHours: number; classmates: Array<{ maskedName: string; hours: number }>; hasData: boolean }
    | undefined

  const growthQuery = studentId ? `/api/parent/students/${studentId}/growth-report` : null
  const { data: growthData } = useSWR(growthQuery, fetcher, { revalidateOnFocus: true, dedupingInterval: 60_000 })
  const growth = growthData as {
    student: { name: string; grade?: string | null }
    period: { startDate?: string | null; endDate?: string | null }
    overview: { feedbackCount: number; attendanceRate: number | null; remainingHours: number }
    trend: { type: keyof typeof TREND_PRESENTATION; description: string }
    stageSummary: string
    focusAreas: string[]
    learningStrengths: string[]
    improvements: string[]
    recentFeedback: Array<{ id: string; subject: string; date: string; teacher: string; summary: string }>
    teacherSuggestions: string[]
    availability: { hasFeedback: boolean; hasGrades: boolean; hasAttendance: boolean }
  } | undefined

  useEffect(() => {
    if (!reportOpen || !studentId) return
    const cacheKey = [studentId, months].join(':')
    const cached = reportDataCache.current.get(cacheKey)
    if (cached) {
      setReportDataState({ key: cacheKey, ...cached })
      setReportSummaryError('')
      setReportSummaryLoading(false)
      return
    }

    const controller = new AbortController()
    setReportDataState(null)
    setReportSummaryError('')
    setReportSummaryLoading(true)
    let streamedProfile: StudentProfile | null = null
    let receivedSummary = false
    fetch('/api/parent/students/' + encodeURIComponent(studentId) + '/learning-report?months=' + months, {
      method: 'POST',
      signal: controller.signal,
    }).then(async (response) => {
      await consumeNdjsonStream<LearningReportEvent>(response, (event) => {
        if (!event || typeof event !== 'object') throw new Error('报告内容读取异常，请重试')
        if (event.type === 'profile') {
          if (!event.profile || !event.summary) throw new Error('报告资料不完整，请重试')
          streamedProfile = event.profile
          setReportDataState({
            key: cacheKey,
            profile: event.profile,
            summary: { ...event.summary, period: event.period || event.summary.period },
          })
          setReportSummaryError('')
          return
        }
        if (event.type === 'summary') {
          if (!streamedProfile || !event.summary) throw new Error('报告概览缺失，请重试')
          const entry = {
            profile: streamedProfile,
            summary: { ...event.summary, period: event.period || event.summary.period },
          }
          reportDataCache.current.set(cacheKey, entry)
          setReportDataState({ key: cacheKey, ...entry })
          receivedSummary = true
          setReportSummaryLoading(false)
          return
        }
        throw new Error('报告内容读取异常，请重试')
      })
      if (!streamedProfile || !receivedSummary) throw new Error('报告未完整生成，请重试')
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setReportSummaryError(error instanceof Error ? error.message : '阶段总结暂时无法加载')
        setReportSummaryLoading(false)
      }
    }).finally(() => {
      if (!controller.signal.aborted && receivedSummary) setReportSummaryLoading(false)
    })

    return () => controller.abort()
  }, [reportOpen, reportSummaryRefresh, studentId, months])

  const moodQuery = activeTab === 'overview' && studentId ? `/api/performance?studentId=${studentId}&limit=50` : null
  const { data: moodData } = useSWR<{
    posts?: Array<{ id: string; mood: string; createdAt: string; isReadByParent: boolean }>
  }>(moodQuery, fetcher, { revalidateOnFocus: true, dedupingInterval: 60_000 })
  const moodPosts = useMemo(() => Array.isArray(moodData?.posts) ? moodData.posts : [], [moodData])

  const selectedStudentRecordIds = useMemo(() => (
    data?.children.find((child) => child.id === studentId)?.recordIds
      || initial.children.find((child) => child.id === studentId)?.recordIds
      || (studentId ? [studentId] : [])
  ), [data?.children, initial.children, studentId])
  const papersQuery = activeTab === 'grades' && studentId
    ? `/api/exam-papers?mine=true&studentId=${encodeURIComponent(studentId)}`
    : null
  const { data: papersData } = useSWR<{ papers: Paper[] }>(papersQuery, fetcher, { revalidateOnFocus: true, dedupingInterval: 60_000 })
  const allPapers: Paper[] = useMemo(() => Array.isArray((papersData as { papers?: Paper[] } | undefined)?.papers) ? (papersData as { papers: Paper[] }).papers : [], [papersData])
  const studentPapers = useMemo(() => allPapers.filter(p => selectedStudentRecordIds.includes(p.student?.id || '')), [allPapers, selectedStudentRecordIds])
  const paperStats = useMemo(() => {
    const allQ = studentPapers.flatMap(p => p.questions || [])
    const mastered = allQ.filter(q => q.mastery === 'MASTERED').length
    const review = allQ.filter(q => q.mastery === 'NEEDS_REVIEW').length
    const practice = allQ.filter(q => q.mastery === 'NEEDS_PRACTICE').length
    return { totalPapers: studentPapers.length, totalQuestions: allQ.length, masteredRate: allQ.length ? Math.round((mastered / allQ.length) * 100) : 0, mastered, review, practice }
  }, [studentPapers])
  const weakTopics = useMemo(() => {
    const counts = new Map<string, number>()
    studentPapers.forEach(p => (p.questions || []).filter(q => q.mastery === 'NEEDS_PRACTICE').forEach(q => counts.set(q.topic || '未分类', (counts.get(q.topic || '未分类') || 0) + 1)))
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [studentPapers])

  const hoursRecordsQuery = studentId && (activeTab === 'overview' || activeTab === 'hours') ? `/api/parent/hour-records?studentId=${studentId}` : null
  const { data: hoursData2 } = useSWR<{ students: Array<{ id: string; name: string; enrollments?: Enrollment[] }>; records: HourRecord[] }>(hoursRecordsQuery, fetcher, { revalidateOnFocus: true, dedupingInterval: 60_000 })
  const hourRecords: HourRecord[] = useMemo(() => Array.isArray(hoursData2?.records) ? hoursData2.records : [], [hoursData2])
  const hourStudents: Array<{ id: string; name: string; enrollments?: Enrollment[] }> = useMemo(() => Array.isArray(hoursData2?.students) ? hoursData2.students : [], [hoursData2])
  const selectedStudentEnrollments = useMemo(() => hourStudents.find(s => s.id === studentId)?.enrollments || [], [hourStudents, studentId])
  const hourStats = useMemo(() => {
    const count = (status: string) => hourRecords.filter(r => r.status === status).length
    const prepaidLines = selectedStudentEnrollments
      .filter(en => en.group?.intensiveMode !== 'INTENSIVE')
      .map(en => {
        const group = en.group
        const name = group?.course?.name || group?.name || '课程'
        return `${name}：${formatRemaining(Number(en.remainHours || 0), group?.course?.type || null, Number(group?.lessonMinutes || 40)).text} / ${formatRemaining(Number(en.totalHours || 0), group?.course?.type || null, Number(group?.lessonMinutes || 40)).text}`
      })
    return { present: count('PRESENT'), leave: count('LEAVE'), absent: count('ABSENT'), makeup: count('MAKEUP'), adjustment: count('ADJUSTMENT'), lines: prepaidLines, total: hourRecords.length }
  }, [hourRecords, selectedStudentEnrollments])

  const materialsQuery = activeTab === 'timeline' || activeTab === 'materials' ? `/api/parent/materials?grade=${encodeURIComponent(selectedGrade || '初一')}` : null
  const { data: materialsData, isLoading: materialsLoading } = useSWR<{ materials: Array<{ id: string; title: string; grade: string; subject: string; fileName: string; fileType: string; description?: string | null; teacher?: { id: string; name: string } | null; createdAt: string }> }>(materialsQuery, fetcher, { revalidateOnFocus: true, dedupingInterval: 60_000 })
  const materials: Array<{ id: string; title: string; grade: string; subject: string; fileName: string; fileType: string; description?: string | null; teacher?: { id: string; name: string } | null; createdAt: string }> = Array.isArray(materialsData?.materials) ? materialsData.materials : []

  const children = data?.children || initial.children
  const childChoiceLabels = useMemo(() => distinctChoiceLabels(
    children,
    (child) => [child.name, child.grade].filter(Boolean).join(' · '),
  ), [children])
  const profile = data?.profile as StudentProfile | null | undefined
  const reportImageKeys = useMemo(() => reportOpen
    ? [...new Set(selectedReportItems.flatMap((item) => (item.images || []).map((image) => normalizeTimelineImage(image).originalUrl)))]
    : [], [reportOpen, selectedReportItems])
  const { loading: reportImagesLoading, error: reportImagesError, urlMap: reportImageUrlMap, refresh: refreshReportImages } = useSignedUrls(reportImageKeys)
  const retryReportImages = () => {
    setReportPhotoFailedDate('')
    setReportImageRetryVersion((version) => version + 1)
    refreshReportImages()
  }

  // 概览「学习趋势」迷你折线：按日期聚合各科掌握率平均（无成绩数据时保持原状态卡）
  const overviewTrendSeries = useMemo(() => {
    if (!profile?.record?.trendBySubject?.length) return null
    const byDate = new Map<string, { sum: number; count: number }>()
    profile.record.trendBySubject.forEach((subject) => {
      ;(subject.points || []).forEach((point) => {
        const raw: unknown = point.date
        const key = typeof raw === 'string' ? raw.slice(0, 10) : raw instanceof Date ? raw.toISOString().slice(0, 10) : ''
        if (!key) return
        const current = byDate.get(key) || { sum: 0, count: 0 }
        current.sum += point.pct
        current.count += 1
        byDate.set(key, current)
      })
    })
    const dates = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    if (!dates.length) return null
    return {
      dates: dates.map(([key]) => key),
      values: dates.map(([, value]) => Math.round((value.sum / value.count) * 10) / 10),
    }
  }, [profile])

  useEffect(() => {
    setActiveTrendIndex(overviewTrendSeries?.values.length ? overviewTrendSeries.values.length - 1 : -1)
  }, [overviewTrendSeries])

  const handleOverviewTrendPointer = useCallback((event: unknown) => {
    if (!overviewTrendSeries) return
    const payload = event as { axesInfo?: Array<{ axisDim?: string; value?: string | number }> }
    const axis = payload.axesInfo?.find((item) => item.axisDim === 'x')
    if (axis?.value === undefined) return
    const index = resolveTrendIndex(axis.value, overviewTrendSeries.dates)
    if (index >= 0) setActiveTrendIndex(index)
  }, [overviewTrendSeries])

  const updateTrendCardTilt = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const position = getTiltSurfacePosition(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())
    event.currentTarget.classList.add('is-tilting')
    event.currentTarget.style.setProperty('--mz-tilt-x', `${position.rotateX}deg`)
    event.currentTarget.style.setProperty('--mz-tilt-y', `${position.rotateY}deg`)
    event.currentTarget.style.setProperty('--mz-light-x', `${position.lightX}%`)
    event.currentTarget.style.setProperty('--mz-light-y', `${position.lightY}%`)
  }

  const resetTrendCardTilt = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.classList.remove('is-tilting')
    event.currentTarget.style.setProperty('--mz-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--mz-tilt-y', '0deg')
    event.currentTarget.style.setProperty('--mz-light-x', '50%')
    event.currentTarget.style.setProperty('--mz-light-y', '50%')
  }

  const weeklyHours = profile?.record?.weeklyHours?.length ? profile.record.weeklyHours : null

  // 焦点定位：从课堂反馈 / 成长动态 / 考勤日期跳转进来时，自动切到「时间线」并滚动到对应记录
  const feedbackId = searchParams.get('feedbackId')
  const postId = searchParams.get('postId')
  const focusDate = searchParams.get('date')
  const openEntryDetail = useCallback((item: TimelineItem) => {
    if (item.refId && (item.refType === 'post' || item.refType === 'paper')) {
      const refId = item.refId
      const markViewed = async () => {
        const response = item.refType === 'post'
          ? await fetch('/api/performance/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postIds: [refId] }),
            })
          : await fetch(`/api/exam-papers/${encodeURIComponent(refId)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isReadByParent: true }),
            })
        if (!response.ok) throw new Error('read status update failed')
      }
      void markViewed()
        .then(() => mutateGlobal(isParentUnreadCountsCacheKey))
        .catch(() => toast.error('内容已打开，但已读状态同步失败，请刷新后重试'))
    }
    const transitionName = getArchiveEntryTransitionName(item.refType || item.type, item.refId, item.title, item.date)
    try {
      sessionStorage.setItem('muzhe-archive-entry', JSON.stringify({ item, studentId: studentId || null, transitionName }))
    } catch { /* sessionStorage 不可用时忽略 */ }
    const navigate = () => router.push('/parent/archive/entry')
    let navigationStarted = false
    const transitioned = runDocumentViewTransition(async () => {
      navigationStarted = true
      navigate()
      let frames = 0
      while (frames < 120) {
        if (document.querySelector(`[data-archive-entry-transition-ready="${transitionName}"]`)) return
        frames += 1
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      }
    })
    if (!transitioned && !navigationStarted) navigate()
  }, [mutateGlobal, router, studentId])
  useEffect(() => {
    const timeline = profile?.record?.timeline || []
    if (!timeline.length) return

    const targetIndex = timeline.findIndex((item) => {
      if (feedbackId && item.refId === feedbackId) return true
      if (postId && item.refId === postId) return true
      if (focusDate && localDateKey(item.date) === focusDate) return true
      return false
    })
    if (targetIndex < 0) return
    const target = timeline[targetIndex]
    const key = timelineKey(target, targetIndex)
    setActiveTab('timeline')
    setTimeFilter('')
    const timer = window.setTimeout(() => {
      timelineRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (feedbackId && target.refType === 'feedback' && target.refId) {
        router.push(`/parent/class-feedback/${target.refId}${studentId ? `?childId=${studentId}` : ''}`)
        return
      }
      if (postId) openEntryDetail(target)
    }, 160)
    return () => window.clearTimeout(timer)
  }, [feedbackId, postId, focusDate, profile, openEntryDetail, router, studentId])

  const handleTimelineClick = (item: TimelineItem) => {
    if (item.refType === 'feedback' && item.refId) { router.push(`/parent/class-feedback/${item.refId}${studentId ? `?childId=${studentId}` : ''}`); return }
    openEntryDetail(item)
  }

  const switchTab = (key: string) => {
    setActiveTab(key)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', key)
    if (studentId) params.set('studentId', studentId)
    if (key === 'timeline') { params.delete('feedbackId'); params.delete('postId'); params.delete('date') }
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }

  const downloadReport = useCallback(async () => {
    if (!reportProfile) return
    setDownloading(true)
    try {
      const [{ buildAdminLearningReport }, { renderParentFeedbackPdf }] = await Promise.all([
        import('@/lib/student-growth/admin-report'),
        import('@/lib/classroom-feedback/parent-pdf'),
      ])

      const rawItems = (reportProfile.record.reportFeedbacks && reportProfile.record.reportFeedbacks.length > 0)
        ? reportProfile.record.reportFeedbacks
        : selectedReportItems.length > 0
          ? selectedReportItems
          : reportProfile.record.timeline.filter((t) => t.type === 'feedback')

      const archiveItems = rawItems.map((item, index) => {
        const detail = item.detail
        const images = (item.images || []).map((img) => {
          const url = typeof img === 'string' ? img : img.originalUrl
          return { assetId: null, thumbnailUrl: url, previewUrl: url }
        })
        return {
          id: item.refId || `item-${index}`,
          date: new Date(item.date).toISOString(),
          teacher: { id: `teacher-${index}`, name: item.teacher || '任课教师' },
          subject: item.teacherSubject || '学科辅导',
          course: null,
          className: null,
          lessonContent: detail?.lessonContent || item.sub || null,
          overallComment: detail?.comment || null,
          summary: detail?.summary || null,
          knowledgePoints: detail?.knowledgePoints || [],
          knowledgeCard: detail?.knowledgeCard && typeof detail.knowledgeCard === 'object' && !Array.isArray(detail.knowledgeCard)
            ? detail.knowledgeCard as Record<string, unknown>
            : null,
          homework: detail?.homework || [],
          tags: detail?.tags || [],
          badge: detail?.badge || null,
          studentRating: detail?.studentPerformance || null,
          images,
          parentReply: null,
          replyTime: null,
          teacherReply: null,
          teacherReplyTime: null,
          createdAt: new Date(item.date).toISOString(),
        }
      })

      const archive: FeedbackArchiveResult = {
        student: {
          id: reportProfile.identity.id,
          name: reportProfile.identity.name,
          grade: reportProfile.identity.grade,
        },
        summary: {
          totalCount: archiveItems.length,
          subjectCount: new Set(archiveItems.map((i) => i.subject)).size || 1,
          teacherCount: new Set(archiveItems.map((i) => i.teacher.name)).size || 1,
          firstFeedbackDate: archiveItems[archiveItems.length - 1]?.date || null,
          latestFeedbackDate: archiveItems[0]?.date || null,
        },
        pagination: {
          page: 1,
          pageSize: archiveItems.length || 10,
          totalCount: archiveItems.length,
          totalPages: 1,
        },
        items: archiveItems,
      }

      const reportStudent = {
        name: reportProfile.identity.name,
        grade: reportProfile.identity.grade,
        school: reportProfile.identity.school,
        gender: null,
        status: 'ACTIVE',
        parentName: null,
        mainTeacher: reportProfile.identity.mainTeacher ? { name: reportProfile.identity.mainTeacher } : null,
        enrollments: [],
      }

      const stageSummaries = reportProfile.profileCase.teacherSummary
        ? [{
            summary: reportProfile.profileCase.teacherSummary.summary,
            suggestions: reportProfile.profileCase.teacherSummary.suggestions,
            periodStart: reportProfile.profileCase.teacherSummary.periodStart,
            periodEnd: reportProfile.profileCase.teacherSummary.periodEnd,
            teacher: reportProfile.profileCase.teacherSummary.teacherName ? { name: reportProfile.profileCase.teacherSummary.teacherName } : null,
          }]
        : []

      const periodRange = reportSummary?.period || {
        from: new Date(Date.now() - months * 30 * 86400000).toISOString(),
        to: new Date().toISOString(),
      }

      const learningReport = buildAdminLearningReport(
        reportStudent,
        reportProfile,
        periodRange,
        { totalCount: archive.summary.totalCount, subjectCount: archive.summary.subjectCount },
        stageSummaries,
      )

      const imageLoader = async (req: { feedbackId: string; imageIndex: number; assetId: string | null }) => {
        const targetItem = archiveItems.find((i) => i.id === req.feedbackId)
        const img = targetItem?.images[req.imageIndex]
        const rawUrl = img?.previewUrl || img?.thumbnailUrl || ''
        const targetUrl = reportImageUrlMap?.[rawUrl] || rawUrl
        if (!targetUrl) throw new Error('图片链接失效')
        const response = await fetch(targetUrl, { credentials: 'include' })
        if (!response.ok) throw new Error('图片加载失败')
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        try {
          const image = new Image()
          image.decoding = 'async'
          image.src = objectUrl
          await image.decode()
          return { image, dispose: () => URL.revokeObjectURL(objectUrl) }
        } catch (err) {
          URL.revokeObjectURL(objectUrl)
          throw err
        }
      }

      const { blob, embeddedImages, skippedImages } = await renderParentFeedbackPdf(archive, {
        learningReport,
        imageLoader,
      })

      const blobUrl = URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = `${reportProfile.identity.name}_个性化学情成长与诊断报告_A4.pdf`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(blobUrl)

      if (skippedImages > 0) {
        toast.success(`学情报告已下载（包含 ${archive.summary.totalCount} 节反馈与 ${embeddedImages} 张照片，部分照片已自动优化）`)
      } else {
        toast.success('个性化学情成长与诊断报告（标准A4版）已成功下载')
      }
    } catch (error) {
      try {
        if (reportRef.current && reportProfile) {
          await exportReportPdf(reportRef.current, `${reportProfile.identity.name}-个性化学情报告-${selectedReportDateKey || 'A4'}.pdf`, { header: false })
          toast.success('学情报告已下载')
          return
        }
      } catch {
        // Fallback failed
      }
      toast.error(error instanceof Error ? error.message : '生成报告失败，请重试')
    } finally {
      setDownloading(false)
    }
  }, [reportProfile, reportSummary, months, selectedReportItems, reportImageUrlMap, selectedReportDateKey])

  const refreshReportSummary = () => {
    if (studentId) reportDataCache.current.delete([studentId, months].join(':'))
    setReportDataState(null)
    setReportSummaryError('')
    setReportSummaryRefresh((value) => value + 1)
  }

  const reportTeacherDisplay = useMemo(() => {
    if (!reportProfile) return ''
    const items = (reportProfile.record?.timeline || [])
      .filter((item) => item.type === 'feedback')
      .map((item) => ({
        id: item.refId || '',
        date: item.date,
        subject: item.teacherSubject || item.sub || '',
        teacher: { name: item.teacher || reportProfile.identity.mainTeacher || '' },
        course: reportProfile.identity.grade || '',
        images: [],
      }))
    return resolveTeacherSubjectList(items, reportProfile.identity.mainTeacher).display
  }, [reportProfile])

  const loadingMask = isLoading && <CardSkeleton rows={3} />

  // P32 档案夹标签层叠：前页 scale(1)/translateY(0)，后页依次缩小上移、z-index 递减；仅活动页可交互
  const tabOrder = TABS.map(tab => tab.key)
  const activeTabIndex = Math.max(0, tabOrder.indexOf(activeTab))
  const panelLayerStyle = (key: string): React.CSSProperties => {
    const panelIndex = Math.max(0, tabOrder.indexOf(key))
    const distance = Math.abs(panelIndex - activeTabIndex)
    const isActive = distance === 0
    return {
      position: isActive ? 'relative' : 'absolute',
      inset: isActive ? undefined : '0',
      width: '100%',
      zIndex: isActive ? 30 : Math.max(10, 20 - distance * 10),
      transform: isActive ? 'none' : `translateY(${distance * -10}px) scale(${1 - distance * 0.04})`,
      transformOrigin: 'top center',
      opacity: isActive ? 1 : 0,
      visibility: isActive ? 'visible' : 'hidden',
      pointerEvents: isActive ? 'auto' : 'none',
      background: isActive ? undefined : 'var(--color-surface-1)',
      border: isActive ? undefined : '1px solid var(--color-hairline)',
      borderRadius: isActive ? undefined : 14,
      boxShadow: isActive ? undefined : 'var(--shadow-card)',
      transition: 'transform .38s cubic-bezier(.16,1,.3,1), opacity .25s ease',
    }
  }

  const reportWeeklyHours = reportProfile?.record?.weeklyHours?.length ? reportProfile.record.weeklyHours : null
  const reportTrendOption = reportProfile?.record.trendBySubject.length ? {
    tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontSize: 9, color: '#333' } },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'time' as const, axisLabel: { fontSize: 8, formatter: '{MM}-{dd}', color: '#333' } },
    yAxis: { type: 'value' as const, min: 0, max: 100, axisLabel: { fontSize: 8, formatter: '{value}%', color: '#333' } },
    series: reportProfile.record.trendBySubject.map((subj, idx) => ({ name: subj.subject, type: 'line' as const, smooth: true, data: subj.points.map(p => [p.date, p.pct]), symbol: 'circle' as const, symbolSize: 3, lineStyle: { width: 2 }, color: ['#1D9E75','#E8784A','#534AB7','#EF9F27'][idx % 4] })),
  } : null

  const subjectInsights = profile ? [...profile.record.timeline
    .filter((item) => item.type === 'feedback')
    .reduce((map, item) => {
      const subject = item.teacherSubject || '综合'
      const existing = map.get(subject)
      if (!existing) map.set(subject, { subject, latest: item, count: 1 })
      else existing.count += 1
      return map
    }, new Map<string, { subject: string; latest: StudentProfile['record']['timeline'][number]; count: number }>()).values()] : []
  const highlights = profile?.growth.highlights
  const hasHighlights = Boolean(highlights && (highlights.badgeTotal > 0 || highlights.praiseCount > 0 || highlights.topTags.length > 0))
  const trendPres = growth?.trend ? TREND_PRESENTATION[growth.trend.type] || TREND_PRESENTATION.STABLE : null

  const moodWeek = useMemo(() => {
    const days: Array<{ key: string; day: number; mood: { color: string; label: string; icon?: string } | null }> = []
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const post = moodPosts.find(item => new Date(item.createdAt).toISOString().slice(0, 10) === key)
      days.push({ key, day: date.getDate(), mood: post ? (MOOD_META[post.mood as keyof typeof MOOD_META] || null) : null })
    }
    return days
  }, [moodPosts])

  const earnedBadgeTypes = new Set((highlights?.badgesByType || []).map(item => item.type))
  if (!initial.children.length) {
    return <Card variant="borderless" style={{ borderRadius: 14, textAlign: 'center', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <GuidedEmpty title="还没有绑定孩子" description="绑定孩子后，课堂反馈、成绩和成长记录会汇总到这里，方便长期查看变化。" actionLabel="去个人中心核对" onAction={() => router.push('/parent/profile')} />
    </Card>
  }

  return (
    <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 860, margin: '0 auto', padding: '0 4px' }}>
      <style>{`
        #mobile-root.parent-page--svip .parent-theme-title .archive-select .ant-select-selector,
        #mobile-root.parent-page--svip .parent-page-heading .archive-select .ant-select-selector {
          background: #fff !important; border-radius: 999px !important; border: 1px solid #e8ddd0 !important;
        }
        #mobile-root.parent-page--svip .parent-theme-title .archive-select .ant-select-selection-item,
        #mobile-root.parent-page--svip .parent-page-heading .archive-select .ant-select-selection-item {
          color: #1a1201 !important; font-weight: 500 !important;
        }
        #mobile-root.parent-page--svip .parent-theme-title .archive-select .ant-select-arrow,
        #mobile-root.parent-page--svip .parent-page-heading .archive-select .ant-select-arrow {
          color: #9a8e7a !important;
        }
      `}</style>
      {/* Top bar */}
      <div className="parent-theme-title" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: 10, marginBottom: 12 }}>
        <div><Title level={4} style={{ margin: 0, fontSize: 19 }}>学生成长档案</Title><Text type="secondary" style={{ fontSize: 13 }}>记录孩子每一次成长的足迹</Text></div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, alignItems: isMobile ? 'stretch' : 'center', flexWrap: isMobile ? 'nowrap' : 'wrap', width: isMobile ? '100%' : 'auto', minWidth: 0 }}>
          {children.length > 1 && (shouldUseInlineChoices(children.length) ? (
            <div
              role="group"
              aria-label="选择孩子"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : children.length}, minmax(0, 1fr))`, gap: 6, width: isMobile ? '100%' : 'fit-content', maxWidth: '100%', minWidth: 0 }}
            >
              {children.map((child: InitialData['children'][number]) => {
                const label = childChoiceLabels.get(child.id) || child.name
                const detail = label.startsWith(child.name)
                  ? label.slice(child.name.length).replace(/^\s*·\s*/, '')
                  : ''
                const selected = studentId === child.id
                return (
                  <button
                    key={child.id}
                    type="button"
                    aria-label={`选择${label}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setStudentId(child.id)
                      const params = new URLSearchParams(window.location.search)
                      params.set('studentId', child.id)
                      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      width: '100%', minWidth: 0, minHeight: 44, padding: '6px 10px',
                      borderRadius: 12,
                      border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-hairline-strong)'}`,
                      background: selected ? 'var(--color-primary-bg)' : 'var(--color-surface-1)',
                      color: selected ? 'var(--color-primary)' : 'var(--color-ink-muted)',
                      textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'block', minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, lineHeight: 1.35, fontWeight: selected ? 650 : 500 }}>{child.name}</span>
                      {detail && <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1, color: selected ? 'var(--color-primary)' : 'var(--color-ink-subtle)', fontSize: 11, lineHeight: 1.3 }}>{detail}</span>}
                    </span>
                    {selected && <CheckCircleOutlined aria-hidden="true" style={{ flex: '0 0 auto', fontSize: 14 }} />}
                  </button>
                )
              })}
            </div>
          ) : (
            <Select
              size={isMobile ? 'middle' : 'small'}
              aria-label="选择孩子"
              className="archive-select"
              value={studentId}
              onChange={(value) => {
                setStudentId(value)
                const params = new URLSearchParams(window.location.search)
                params.set('studentId', value)
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
              }}
              showSearch={shouldSearchChoices(children.length)}
              optionFilterProp="label"
              placement="bottomLeft"
              listHeight={240}
              style={{ width: isMobile ? '100%' : undefined, minWidth: isMobile ? 0 : 110, maxWidth: '100%' }}
              options={children.map((child: InitialData['children'][number]) => ({ label: childChoiceLabels.get(child.id) || child.name, value: child.id }))}
            />
          ))}
          <Segmented
            aria-label="成长档案时间范围"
            size={isMobile ? 'small' : 'middle'}
            block={isMobile}
            value={months}
            onChange={(value) => setMonths(Number(value))}
            options={[{ label: '近1个月', value: 1 }, { label: '近3个月', value: 3 }, { label: '近6个月', value: 6 }, { label: '近12个月', value: 12 }]}
            style={{ width: isMobile ? '100%' : undefined, maxWidth: '100%' }}
          />
        </div>
      </div>

      {/* Tab bar：卡片式 Tab，选中墨绿高亮，带一句微说明 */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0 14px', scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button key={tab.key} type="button" onClick={() => switchTab(tab.key)} aria-pressed={activeTab === tab.key}
            style={{
              flexShrink: 0, border: '1px solid', padding: '8px 14px', borderRadius: 14, fontSize: 13, cursor: 'pointer',
              background: activeTab === tab.key ? '#ffffff' : 'rgba(255,255,255,0.7)',
              borderColor: activeTab === tab.key ? '#14574D' : 'rgba(60,80,72,0.14)',
              color: activeTab === tab.key ? '#14574D' : '#6B6560',
              fontWeight: activeTab === tab.key ? 700 : 500,
              boxShadow: activeTab === tab.key ? '0 4px 14px rgba(20,87,77,0.14)' : '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .18s cubic-bezier(.2,.8,.2,1)',
            }}>
            <span>{tab.icon}</span>{tab.label}
            <small style={{ fontSize: 10.5, color: activeTab === tab.key ? '#8A6517' : 'var(--color-ink-subtle)', fontWeight: activeTab === tab.key ? 600 : 400 }}>{tab.hint}</small>
          </button>
        ))}
      </div>

      {loadingMask}
      {!profile && !isLoading && <Card variant="borderless" style={{ borderRadius: 14, textAlign: 'center', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GuidedEmpty title="还没有成长档案" description="老师更新课堂反馈、成绩和成长记录后会显示在这里，帮助你连续了解孩子的变化。" actionLabel="给老师留言" onAction={() => router.push('/parent/messages')} /></Card>}

      {profile && (
        <>
          <div className="parent-archive-tab-stack" style={{ position: 'relative' }}>
          {/* ============ 概览 Tab ============ */}
          <div className="parent-archive-tab-panel" style={panelLayerStyle('overview')}>
          {activeTab === 'overview' && (
            <div>
              <Card variant="borderless" className="parent-growth-overview" style={{ marginBottom: 13 }}>
                <div className="parent-growth-identity">
                  <div>
                    <Text strong style={{ fontSize: 20 }}>{profile.identity.name}</Text>
                    <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                      {profile.identity.grade && <Tag style={{ borderRadius: 9999, fontSize: 11 }}>{profile.identity.grade}</Tag>}
                      {reportTeacherDisplay ? (
                        <TeacherNameWithTag name={reportTeacherDisplay} tier={(profile.identity as { mainTeacherTier?: string }).mainTeacherTier} />
                      ) : profile.identity.mainTeacher ? (
                        <TeacherNameWithTag name={profile.identity.mainTeacher} tier={(profile.identity as { mainTeacherTier?: string }).mainTeacherTier} />
                      ) : null}
                    </div>
                  </div>
                  <div className="parent-growth-identity-stats">
                    <Text type="secondary">累计课时</Text>
                    <div><Text strong>{profile.identity.totalHours}</Text><Text type="secondary">h</Text></div>
                    <Text type="secondary">{profile.overview.attendanceRate === null ? '出勤待记录' : `本期出勤 ${profile.overview.attendanceRate}%`}</Text>
                  </div>
                </div>
                <Button type="primary" icon={<FileTextOutlined />} onClick={() => setReportOpen(true)}
                  style={{ borderRadius: 10, background: 'var(--color-primary)', border: 'none', padding: '8px 20px', fontSize: 13.5, height: 'auto', width: '100%', marginTop: 13 }}>
                  查看本期学情报告
                </Button>
              </Card>

              {/* 学习概况 */}
              <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><CalendarOutlined style={{ color: '#E8784A' }} />学习概况</Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginTop: 11 }}>
                  {[
                    { label: '累计课堂反馈', value: growth?.overview ? `${growth.overview.feedbackCount} 次` : '—' },
                    { label: '出勤率', value: growth?.overview?.attendanceRate != null ? `${growth.overview.attendanceRate}%` : '—' },
                    { label: '剩余课时', value: growth?.overview ? `${growth.overview.remainingHours} 小时` : '—' },
                    { label: '学习周期', value: growth?.period?.startDate ? `${fmtDateOnly(growth.period.startDate)}起` : '—' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', background: '#FAF8F5', border: '1px solid #F0E7DE', borderRadius: 12, padding: '11px 5px' }}>
                      <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: '#E8784A', fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                      <div style={{ fontSize: 10.5, color: '#9A8E7A', marginTop: 3 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 学习趋势 */}
              <Card
                variant="borderless"
                className="parent-growth-trend-card parent-growth-glow-card"
                onPointerMove={updateTrendCardTilt}
                onPointerLeave={resetTrendCardTilt}
                onPointerCancel={resetTrendCardTilt}
                style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><RiseOutlined style={{ color: '#534AB7' }} />{overviewTrendSeries ? '学习趋势' : '本月课时趋势'}</Text>
                  {overviewTrendSeries && trendPres && <span style={{ fontSize: 12, fontWeight: 700, color: trendPres.color, background: trendPres.background, padding: '3px 10px', borderRadius: 9999 }}>{trendPres.icon}{trendPres.label}</span>}
                </div>
                {overviewTrendSeries ? (
                  <>
                    {growth?.trend?.description && <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>{growth.trend.description}</Text>}
                    <div className="parent-growth-trend-readout">
                      <Text type="secondary">{overviewTrendSeries.dates[Math.max(0, Math.min(activeTrendIndex < 0 ? overviewTrendSeries.dates.length - 1 : activeTrendIndex, overviewTrendSeries.dates.length - 1))]?.slice(5) || '最近'}</Text>
                      <span><AnimatedNumber value={overviewTrendSeries.values[Math.max(0, Math.min(activeTrendIndex < 0 ? overviewTrendSeries.values.length - 1 : activeTrendIndex, overviewTrendSeries.values.length - 1))] || 0} precision={1} />%</span>
                    </div>
                    {overviewTrendSeries.dates.length > 1 ? (
                      <ReactECharts style={{ height: 150, marginTop: 4 }} onEvents={{ updateAxisPointer: handleOverviewTrendPointer }} option={{ tooltip: { trigger: 'axis', triggerOn: 'mousemove|click', axisPointer: { type: 'line', snap: true } }, axisPointer: { snap: true }, grid: { left: 34, right: 14, top: 18, bottom: 26 }, xAxis: { type: 'category', data: overviewTrendSeries.dates, axisPointer: { snap: true }, axisLabel: { fontSize: 9, formatter: (value: string) => value.slice(5) } }, yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 9, formatter: '{value}%' } }, series: [{ type: 'line', smooth: true, data: overviewTrendSeries.values, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#E8784A' }, itemStyle: { color: '#E8784A' }, areaStyle: { opacity: 0.08, color: '#E8784A' } }] }} opts={{ renderer: 'svg' }} />
                    ) : (
                      <div style={{ marginTop: 12, padding: '16px 0', textAlign: 'center', fontSize: 12.5, color: '#9A8E7A', background: '#FAF8F5', borderRadius: 10 }}>暂无足够成绩数据，积累后自动生成趋势图</div>
                    )}
                  </>
                ) : weeklyHours && weeklyHours.some(w => w.hours > 0) ? (
                  <>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>本月累计上课 {weeklyHours.reduce((a, w) => a + w.hours, 0).toFixed(2)} 小时，按周记录如下：</Text>
                    <ReactECharts style={{ height: 150, marginTop: 8 }} option={{ tooltip: { trigger: 'axis', formatter: (p: unknown) => { const i = Array.isArray(p) && typeof p[0]?.dataIndex === 'number' ? p[0].dataIndex : 0; const w = weeklyHours[i]; return `${w.week}（${w.range}）<br/>上课 ${w.hours} 小时` } }, grid: { left: 34, right: 12, top: 18, bottom: 26 }, xAxis: { type: 'category', data: weeklyHours.map(w => w.week), axisLabel: { fontSize: 9 } }, yAxis: { type: 'value', name: 'h', axisLabel: { fontSize: 9 } }, series: [{ type: 'bar', data: weeklyHours.map(w => w.hours), itemStyle: { color: '#534AB7', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 22 }] }} opts={{ renderer: 'svg' }} />
                  </>
                ) : (
                  <div style={{ marginTop: 12, padding: '16px 0', textAlign: 'center', fontSize: 12.5, color: '#9A8E7A', background: '#FAF8F5', borderRadius: 10 }}>本月暂无课时记录，上课后将自动生成趋势</div>
                )}
              </Card>

              {/* 本周情绪 */}
              <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><SmileOutlined style={{ color: '#EF9F27' }} />本周情绪 <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9A8E7A', fontWeight: 400, cursor: 'pointer' }} onClick={() => router.push('/parent/dashboard')}>查看整月 ›</span></Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginTop: 11 }}>
                  {['一', '二', '三', '四', '五', '六', '日'].map(day => <div key={day} style={{ textAlign: 'center', fontSize: 10, color: '#9A8E7A', padding: '3px 0' }}>{day}</div>)}
                  {moodWeek.map(day => (
                    <div key={day.key} title={day.mood?.label || '无记录'} style={{ aspectRatio: '1', borderRadius: 9, fontSize: 11.5, display: 'grid', placeItems: 'center', background: day.mood ? `${day.mood.color}26` : '#F5F2EE', color: day.mood ? day.mood.color : '#C4BAB0', border: `1px solid ${day.mood ? `${day.mood.color}44` : 'transparent'}`, outline: day.key === localDateKey(new Date()) ? '2px solid #E8784A' : 'none' }}>
                      {day.day}
                    </div>
                  ))}
                </div>
              </Card>

              {/* 最新课堂反馈 */}
              <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><MessageOutlined style={{ color: '#534AB7' }} />最新课堂反馈 <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9A8E7A', fontWeight: 400, cursor: 'pointer' }} onClick={() => router.push('/parent/class-feedback')}>查看全部 ›</span></Text>
                {growth && growth.recentFeedback.length > 0 ? (
                  <button type="button" onClick={() => router.push(`/parent/class-feedback/${growth.recentFeedback[0].id}`)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 4px', border: 0, borderBottom: '1px solid #F0E7DE', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Space size={6} wrap>
                        <Tag color="orange">{growth.recentFeedback[0].subject}</Tag>
                        <Text type="secondary" style={{ fontSize: 11.5 }}>{fmtDate(growth.recentFeedback[0].date)} · {growth.recentFeedback[0].teacher}</Text>
                      </Space>
                      <div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.7, color: '#5A4E3A', overflowWrap: 'anywhere' }}>{growth.recentFeedback[0].summary}</div>
                    </div>
                    <RightOutlined style={{ color: '#C4BAB0', flexShrink: 0 }} />
                  </button>
                ) : (
                  <div style={{ padding: '10px 0 2px', fontSize: 12.5, color: '#9A8E7A' }}>暂无课堂反馈，老师会在课后更新学习情况。</div>
                )}
                {subjectInsights.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>各科老师本期评价</Text>
                    <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
                      {subjectInsights.slice(0, 3).map(({ subject, latest, count }) => (
                        <div key={subject} style={{ padding: 10, borderRadius: 10, background: '#FAF8F5', border: '1px solid #F0E7DE' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                            <Text strong style={{ fontSize: 12.5 }}>{subject} · {latest.teacher || '任课'}老师</Text>
                            <Text type="secondary" style={{ fontSize: 10.5 }}>本期 {count} 次 · {fmtDate(latest.date)}</Text>
                          </div>
                          <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '5px 0 0', lineHeight: 1.65, fontSize: 12.5, color: '#5A4E3A' }}>
                            {latest.detail?.comment || latest.detail?.summary || latest.sub || '老师已记录本次课堂情况'}
                          </Paragraph>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* 课时榜（最多展示 10 名，不公开班级人数） */}
              {!hoursLoading && leaderboardData?.hasData && (
                <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                  <HoursLeaderboard studentName={leaderboardData.studentName} mineHours={leaderboardData.mineHours} classmates={leaderboardData.classmates} hasData={leaderboardData.hasData} />
                </Card>
              )}

              {/* 出勤概况 */}
              <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><ClockCircleOutlined style={{ color: '#E8784A' }} />出勤概况 <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9A8E7A', fontWeight: 400 }}>本月 · 按考勤结算口径</span></Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginTop: 11 }}>
                  {[
                    { label: '出勤', value: `${hourStats.present}`, color: '#1D9E75' },
                    { label: '请假', value: `${hourStats.leave}`, color: '#C77F00' },
                    { label: '旷课', value: `${hourStats.absent}`, color: '#E24B4A' },
                    { label: '补课', value: `${hourStats.makeup}`, color: '#534AB7' },
                    { label: '课时调整', value: `${hourStats.adjustment}`, color: '#8D806F' },
                    { label: '课时记录', value: `${hourStats.total} 条`, color: '#E8784A' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', background: '#FAF8F5', border: '1px solid #F0E7DE', borderRadius: 12, padding: '11px 5px' }}>
                      <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                      <div style={{ fontSize: 10.5, color: '#9A8E7A', marginTop: 3 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                {hourStats.lines.length > 0 && (
                  <div style={{ marginTop: 11, padding: '10px 12px', background: '#FFFBF7', border: '1px solid #F0E7DE', borderRadius: 10 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>当前课时余额</Text>
                    <div style={{ display: 'grid', gap: 4, marginTop: 5 }}>
                      {hourStats.lines.map(line => <div key={line} style={{ fontSize: 12.5, color: '#5A4E3A', fontWeight: 600 }}>{line}</div>)}
                    </div>
                  </div>
                )}
                {hourRecords.length > 0 && (
                  <Button type="link" style={{ padding: '8px 0 0', fontSize: 12.5 }} onClick={() => router.push('/parent/schedule')}>查看课时明细 ›</Button>
                )}
              </Card>

            </div>
          )}
          </div>

          {/* ============ 时间线 Tab ============ */}
          <div className="parent-archive-tab-panel" style={panelLayerStyle('timeline')}>
          {activeTab === 'timeline' && (
            <div>
              {hasHighlights && highlights && (
                <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><TrophyOutlined style={{ color: '#EF9F27' }} />成就徽章</Text>
                  <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 11 }}>
                    {PERFORMANCE_BADGES.map(badge => {
                      const earned = earnedBadgeTypes.has(badge.type)
                      return (
                        <div key={badge.type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, border: `1px solid ${earned ? 'rgba(245,166,35,.4)' : '#F0E7DE'}`, background: earned ? 'rgba(245,166,35,.10)' : '#FAF8F5', opacity: earned ? 1 : .45 }}>
                          <span style={{ fontSize: 18 }}>{badge.icon}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: earned ? '#C77F00' : '#9A8E7A' }}>{badge.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }}>
                {profile.record.timeline.length > 0 && (
                  <section className="parent-growth-history">
                    <div className="parent-growth-history-head">
                      <div><Text strong>成长记录</Text><Text type="secondary">按时间回看孩子的学习变化</Text></div>
                      <div className="parent-growth-filters" role="group" aria-label="成长记录筛选">
                        {FILTER_CHIPS.map(chip => <button key={chip.key} aria-pressed={timeFilter === chip.key} onClick={() => { setTimeFilter(chip.key); setShowAllTimeline(false) }}>{chip.label}</button>)}
                      </div>
                    </div>
                    {(() => {
                      const filtered = profile.record.timeline
                        .filter(item => !timeFilter || FILTER_CHIPS.find(chip => chip.key === timeFilter)?.types?.includes(item.type))
                      const visible = showAllTimeline ? filtered : filtered.slice(0, 3)
                      return filtered.length > 0 ? <>
                        <div className="parent-growth-history-list">{visible.map((item, index) => {
                          const key = timelineKey(item, index)
                          const isFocused = (feedbackId && item.refId === feedbackId) || (postId && item.refId === postId) || (focusDate && localDateKey(item.date) === focusDate)
                          const transitionName = getArchiveEntryTransitionName(item.refType || item.type, item.refId, item.title, item.date)
                          return <article key={key} ref={(node) => { timelineRefs.current[key] = node }} role="button" tabIndex={0} aria-label={`查看成长记录：${item.title || '成长记录'}`} data-motion-ignore="true" onClick={() => handleTimelineClick(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleTimelineClick(item) } }} className={`parent-growth-history-item is-clickable stagger-item${isFocused ? ' is-focused' : ''}`} data-archive-entry-source={transitionName} style={{ '--stagger-index': Math.min(index, 6), viewTransitionName: transitionName } as React.CSSProperties}>
                            <div className="parent-growth-history-icon" style={{ color: TYPE_COLOR[item.type], background: `${TYPE_COLOR[item.type]}12` }}>{TYPE_ICON[item.type]}</div>
                            <div className="parent-growth-history-body">
                              <div className="parent-growth-history-title"><div><Text strong>{item.title}</Text><Tag>{TIMELINE_LABEL[item.type] || '记录'}</Tag></div><Text type="secondary">{fmtDate(item.date)}</Text></div>
                              {item.teacher && <Text type="secondary" className="parent-growth-history-teacher">{formatTeacherLabel(item)}</Text>}
                              {item.sub && <Paragraph ellipsis={{ rows: 2 }} className="parent-growth-history-copy">{item.sub}</Paragraph>}
                              {!!item.images?.length && <TimelineImageStrip images={item.images} />}
                            </div>
                            {(item.images?.length || item.refType) && <RightOutlined className="parent-growth-history-arrow" />}
                          </article>
                        })}</div>
                        {filtered.length > visible.length && <Button type="text" block className="parent-growth-show-more" onClick={() => setShowAllTimeline(true)}>查看全部 {filtered.length} 条记录</Button>}
                        {showAllTimeline && filtered.length > 3 && <Button type="text" block className="parent-growth-show-more" onClick={() => setShowAllTimeline(false)}>收起记录</Button>}
                      </> : <GuidedEmpty title="这个分类暂时没有记录" description="可以切换到全部记录，查看老师已经发布的其他成长内容。" actionLabel="查看全部记录" onAction={() => setTimeFilter('')} compact />
                    })()}
                  </section>
                )}
                {profile.record.timeline.length === 0 && <GuidedEmpty title="还没有成长记录" description="老师的课堂反馈、试卷与徽章会按时间沉淀在这里。" compact />}
              </Card>

              {/* 学习资料（讲义预告 + 资料列表） */}
              <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13, overflow: 'hidden', marginTop: 13 }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 2px 4px' }}><HistoryOutlined style={{ color: '#534AB7' }} />下节课讲义预告</Text>
                <ParentLessonPreviewHistory />
              </Card>

              <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 11 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><FolderOpenOutlined style={{ color: '#E8784A' }} />学习资料</Text>
                  <Select size="small" value={selectedGrade} onChange={(value) => setSelectedGrade(value)} style={{ width: 110, borderRadius: 999, background: '#fff' }} options={['初一', '初二', '初三', '高一', '高二', '高三'].map(g => ({ label: g, value: g }))} />
                </div>
                {materialsLoading ? <CardSkeleton rows={3} /> : materials.length === 0 ? (
                  <GuidedEmpty title="这个年级还没有学习资料" description="老师准备的讲义和练习会显示在这里，帮助孩子课后复习。" actionLabel="看看课堂反馈" onAction={() => router.push('/parent/class-feedback')} compact />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {materials.slice(0, 30).map((material, index) => (
                      <div key={material.id} className="stagger-item" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', border: '1px solid #F0E7DE', borderRadius: 12, background: '#fff', animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0, color: '#E8784A', background: 'rgba(232,120,74,.10)' }}>
                          <FileTextOutlined />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis={{ tooltip: material.title }}>{material.title}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{material.subject} · {material.grade} · {fmtDate(material.createdAt)}</Text>
                        </div>
                        <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => window.open(`/api/materials/${material.id}/view?download=1`, '_blank')} style={{ background: 'var(--color-primary)', border: 'none', flexShrink: 0 }}>下载</Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
          </div>

          {/* ============ 学习分析 Tab ============ */}
          <div className="parent-archive-tab-panel" style={panelLayerStyle('grades')}>
          {activeTab === 'grades' && (
            <div>
              {/* 本月上课情况（课时趋势 4 周） */}
              {weeklyHours && weeklyHours.some(w => w.hours > 0) && (
                <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><ClockCircleOutlined style={{ color: '#E8784A' }} />本月上课情况</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>累计上课 {weeklyHours.reduce((a, w) => a + w.hours, 0).toFixed(2)} 小时，共 {weeklyHours.filter(w => w.hours > 0).length} 周有课。</Text>
                  <ReactECharts style={{ height: 200, marginTop: 8 }} option={{ tooltip: { trigger: 'axis', formatter: (p: unknown) => { const i = Array.isArray(p) && typeof p[0]?.dataIndex === 'number' ? p[0].dataIndex : 0; const w = weeklyHours[i]; return `${w.week}（${w.range}）<br/>上课 ${w.hours} 小时` } }, grid: { left: 36, right: 12, top: 18, bottom: 26 }, xAxis: { type: 'category', data: weeklyHours.map(w => w.week), axisLabel: { fontSize: 10 } }, yAxis: { type: 'value', name: 'h', axisLabel: { fontSize: 10 } }, series: [{ type: 'bar', data: weeklyHours.map(w => w.hours), itemStyle: { color: '#E8784A', borderRadius: [5, 5, 0, 0] }, barMaxWidth: 28 }] }} opts={{ renderer: 'svg' }} />
                </Card>
              )}

              {/* 知识掌握（profile 口径） */}
              {(profile.study.mastery.total > 0 || profile.study.weaknesses.length > 0) && (
                <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><BookOutlined style={{ color: '#534AB7' }} />知识掌握</Text>
                  {profile.study.mastery.total > 0 && <>
                    <Progress percent={profile.study.mastery.masteredPct} strokeColor="#1D9E75" trailColor="rgba(0,0,0,.05)" style={{ marginTop: 10 }} />
                    <Text type="secondary" style={{ fontSize: 11.5 }}>已掌握 {profile.study.mastery.masteredPct}% · 需复习 {profile.study.mastery.reviewPct}% · 薄弱 {profile.study.mastery.weakPct}%</Text>
                  </>}
                  {profile.study.weaknesses.length > 0 && <div className="parent-growth-weaknesses" style={{ marginTop: 8 }}><Text strong style={{ fontSize: 12 }}>薄弱知识点</Text><div>{profile.study.weaknesses.map((item, index) => <Tag key={`${item.topic}-${index}`} color={item.mistakeCount >= 3 ? 'red' : 'orange'}>{item.topic}{item.mistakeCount > 1 && ` ×${item.mistakeCount}`}</Tag>)}</div></div>}
                </Card>
              )}

              {/* 试卷统计 */}
              <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><BarChartOutlined style={{ color: '#E8784A' }} />试卷分析</Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginTop: 11 }}>
                  {[
                    { label: '试卷数', value: `${paperStats.totalPapers}`, color: '#E8784A' },
                    { label: '掌握率', value: `${paperStats.masteredRate}%`, color: '#1D9E75' },
                    { label: '待突破', value: `${paperStats.practice}`, color: '#E24B4A' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(232,120,74,.12), rgba(232,120,74,.06))', border: '1px solid rgba(232,120,74,.18)', borderRadius: 12, padding: '12px 6px' }}>
                      <div style={{ fontSize: isMobile ? 19 : 22, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                      <div style={{ fontSize: 10.5, color: '#9A8E7A', marginTop: 5 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                {weakTopics.length > 0 && (
                  <div style={{ marginTop: 11, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>需重点练习：</Text>
                    {weakTopics.map(([topic, count]) => <span key={topic} style={{ fontSize: 10.5, background: 'rgba(226,75,74,.10)', color: '#E24B4A', padding: '2px 9px', borderRadius: 9999 }}>{topic} ×{count}</span>)}
                  </div>
                )}
              </Card>

              {/* 成绩趋势 */}
              {profile.record.trendBySubject.length > 0 && (
                <Card variant="borderless" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><RiseOutlined style={{ color: '#534AB7' }} />成绩趋势</Text>
                  <ReactECharts style={{ height: 200 }} option={{ tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontSize: 10 } }, grid: { left: 40, right: 20, top: 20, bottom: 30 }, xAxis: { type: 'time', axisLabel: { fontSize: 9, formatter: '{MM}-{dd}' } }, yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 9, formatter: '{value}%' } }, series: profile.record.trendBySubject.map((subject, index) => ({ name: subject.subject, type: 'line', smooth: true, data: subject.points.map(point => [point.date, point.pct]), symbol: 'circle', symbolSize: 3, lineStyle: { width: 2 }, color: ['#1D9E75','#E8784A','#534AB7','#EF9F27'][index % 4] })) }} opts={{ renderer: 'svg' }} />
                </Card>
              )}

              {/* 试卷列表 */}
              <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, margin: '2px 2px 10px' }}><FolderOpenOutlined style={{ color: '#534AB7' }} />试卷与课堂反馈</Text>
              {studentPapers.length === 0 ? (
                <Card variant="borderless" style={{ borderRadius: 14, border: '1px dashed rgba(0,0,0,.10)', textAlign: 'center', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GuidedEmpty title="暂无试卷记录" description="机构课堂以课时记录与课堂反馈呈现学习情况，如有考试批改会展示在这里。" compact />
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {studentPapers.map((paper, index) => (
                    <Card key={paper.id} variant="borderless" className="parent-card stagger-item" style={{ borderRadius: 12, border: '1px solid #F0DDD2', cursor: 'pointer', animationDelay: `${Math.min(index, 8) * 40}ms` }} styles={{ body: { padding: 13 } }} onClick={() => router.push(`/parent/archive/${encodeURIComponent(paper.id)}`)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0, color: '#E8784A', background: 'rgba(232,120,74,.10)' }}>
                          <FileTextOutlined />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis={{ tooltip: paper.title }}>{paper.title}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{paper.subject || '试卷'}{paper.paperDate ? ` · ${fmtDate(paper.paperDate)}` : ''}</Text>
                        </div>
                        <RightOutlined style={{ color: '#C4BAB0', flexShrink: 0 }} />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
          </div>
        </>
      )}

      {/* C1+C2: Expanded report Modal with PDF download */}
      <BrandModal open={reportOpen} onCancel={() => setReportOpen(false)} width="min(700px, 94vw)" zIndex={1200} title={reportProfile ? reportProfile.identity.name + '同学的定制学情报告' : '个性化学情报告'}
        styles={{ body: { maxHeight: isMobile ? 'calc(100dvh - 150px)' : '76vh', overflowY: 'auto', padding: isMobile ? 10 : 16 } }}
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button onClick={() => setReportOpen(false)}>关闭</Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            disabled={!reportProfile || reportSummaryLoading}
            loading={downloading}
            onClick={downloadReport}
            style={{ background: '#0E5E4E', borderColor: '#0E5E4E', boxShadow: '0 2px 8px rgba(14,94,78,.25)' }}
          >
            {downloading ? '正在生成 A4 报告…' : '下载定制学情诊断报告 (标准A4版)'}
          </Button>
        </div>}>
        {!reportProfile && (
          <div role={reportSummaryError ? 'alert' : 'status'} aria-live="polite" aria-busy={reportSummaryLoading} style={{ minHeight: 132, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, color: reportSummaryError ? 'var(--color-error)' : 'var(--color-ink-muted)' }}>
            {reportSummaryError
              ? <><span>{reportSummaryError}</span><Button size="small" onClick={refreshReportSummary}>重试</Button></>
              : <><Spin size="small" />正在读取课堂反馈和学习资料…</>}
          </div>
        )}
        {reportProfile && (
          <div ref={reportRef} style={{ padding: isMobile ? 10 : 16, backgroundColor: '#ffffff', backgroundImage: "linear-gradient(rgba(255,255,255,.965), rgba(255,255,255,.965)), url('/brand/export-watermark.png')", backgroundRepeat: 'repeat', backgroundSize: 'auto, 260px auto', backgroundPosition: 'center, 28px 22px', color: 'var(--color-ink)', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'Microsoft YaHei', sans-serif" }}>
            <section style={{ display: 'flex', alignItems: 'center', gap: 14, padding: isMobile ? 14 : 20, marginBottom: 14, borderRadius: 14, border: '1px solid var(--color-hairline)', background: 'linear-gradient(135deg, #fffaf2 0%, #f4f8f5 100%)' }}>
              <div style={{ flex: '0 0 auto', padding: 7, borderRadius: 10, background: '#ffffff', border: '1px solid var(--color-hairline)' }}>
                <NextImage src="/brand/export-logo.png" alt="牧哲学堂" width={727} height={146} unoptimized style={{ display: 'block', width: isMobile ? 104 : 142, height: 'auto' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: '3px 0 5px', color: 'var(--color-ink)', fontSize: isMobile ? 17 : 22, lineHeight: 1.4, fontWeight: 750 }}>
                  牧哲学堂针对<strong style={{ color: 'var(--color-primary)' }}>{reportProfile.identity.name}</strong>同学定制个性化学情报告
                </h1>
                <div style={{ color: 'var(--color-ink-muted)', fontSize: 11, lineHeight: 1.6 }}>
                  {[
                    reportProfile.identity.grade,
                    reportProfile.identity.school,
                    reportSummary?.period
                      ? `统计范围：${fmtDateOnly(reportSummary.period.from)} 至 ${fmtDateOnly(reportSummary.period.to)}`
                      : `近 ${months} 个月`,
                    `生成日期：${fmtDateOnly(new Date().toISOString())}`,
                  ].filter(Boolean).join(' · ')}
                  {reportTeacherDisplay ? ' · 授课教师：' + reportTeacherDisplay : reportProfile.identity.mainTeacher ? ' · 主教师：' + reportProfile.identity.mainTeacher : ''}
                </div>
              </div>
            </section>

            <section aria-label="按周浏览课堂反馈" data-report-exclude-from-pdf="true" style={{ padding: isMobile ? 11 : 14, marginBottom: 14, borderRadius: 14, border: '1px solid var(--color-hairline)', background: 'var(--color-surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 11 }}>
                <div>
                  <h2 style={{ margin: 0, color: 'var(--color-ink)', fontSize: 15, fontWeight: 700 }}>课堂反馈按周查看</h2>
                  <p style={{ margin: '3px 0 0', color: 'var(--color-ink-subtle)', fontSize: 11 }}>选择有记录的日期，查看并下载当天学情报告</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Button aria-label="上一周" size="small" icon={<LeftOutlined />} disabled={selectedReportWeekIndex <= 0} onClick={() => {
                    const targetWeek = reportWeeks[selectedReportWeekIndex - 1]
                    const targetDay = targetWeek?.days.slice().reverse().find((day) => day.items.length > 0)
                    if (targetDay) setSelectedReportDate(targetDay.dateKey)
                  }} />
                  <strong style={{ minWidth: 112, textAlign: 'center', color: 'var(--color-ink)', fontSize: 12 }}>
                    {selectedReportWeek ? formatReportMonthDay(selectedReportWeek.startKey) + ' 至 ' + formatReportMonthDay(selectedReportWeek.endKey) : '暂无课堂反馈'}
                  </strong>
                  <Button aria-label="下一周" size="small" icon={<RightOutlined />} disabled={selectedReportWeekIndex < 0 || selectedReportWeekIndex >= reportWeeks.length - 1} onClick={() => {
                    const targetWeek = reportWeeks[selectedReportWeekIndex + 1]
                    const targetDay = targetWeek?.days.find((day) => day.items.length > 0)
                    if (targetDay) setSelectedReportDate(targetDay.dateKey)
                  }} />
                </div>
              </div>
              {selectedReportWeek ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + (isMobile ? 4 : 7) + ', minmax(0, 1fr))', gap: 6 }}>
                  {selectedReportWeek.days.map((day) => {
                    const hasFeedback = day.items.length > 0
                    const isSelected = day.dateKey === selectedReportDateKey && hasFeedback
                    const date = new Date(day.dateKey + 'T12:00:00')
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        disabled={!hasFeedback}
                        aria-pressed={isSelected}
                        aria-label={reportWeekday(day.dateKey) + ' ' + formatReportMonthDay(day.dateKey) + '，' + (hasFeedback ? day.items.length + '条课堂反馈' : '暂无课堂反馈')}
                        onClick={() => setSelectedReportDate(day.dateKey)}
                        style={{
                          minWidth: 0,
                          minHeight: 62,
                          padding: '7px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          borderRadius: 10,
                          border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-hairline)',
                          background: isSelected ? 'var(--color-primary)' : hasFeedback ? 'var(--color-surface-1)' : 'var(--color-surface-3)',
                          color: isSelected ? 'var(--color-on-primary)' : hasFeedback ? 'var(--color-ink)' : 'var(--color-ink-subtle)',
                          opacity: hasFeedback ? 1 : 0.62,
                          cursor: hasFeedback ? 'pointer' : 'not-allowed',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ fontSize: 10, lineHeight: 1.3 }}>{reportWeekday(day.dateKey)}</span>
                        <strong style={{ fontSize: 13, lineHeight: 1.3 }}>{date.getMonth() + 1}/{date.getDate()}</strong>
                        <span style={{ fontSize: 9, lineHeight: 1.3 }}>{hasFeedback ? day.items.length + '条' : '暂无'}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: 14, textAlign: 'center', color: 'var(--color-ink-subtle)', fontSize: 12, background: '#ffffff', borderRadius: 10 }}>统计范围内暂时没有课堂反馈记录</div>
              )}
            </section>

            <section aria-live="polite" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 9 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, color: 'var(--color-ink)', fontWeight: 750 }}>
                    {selectedReportDateKey ? formatReportMonthDay(selectedReportDateKey) + ' · ' + reportWeekday(selectedReportDateKey) + ' 学情报告' : '本日学情报告'}
                  </h2>
                  {selectedReportItems.length > 0 && (
                    <p style={{ margin: '4px 0 0', color: 'var(--color-ink-muted)', fontSize: 11 }}>
                      {Array.from(new Set(selectedReportItems.map((item) => item.teacherSubject || '课堂反馈'))).join('、')} · {selectedReportItems.length} 条反馈
                    </p>
                  )}
                </div>
                {selectedReportItems.length > 0 && <Tag color="green">{selectedReportItems.length} 条记录</Tag>}
              </div>
              {selectedReportHasImages && reportImagesLoading && <p role="status" style={{ margin: '0 0 10px', color: 'var(--color-ink-muted)', fontSize: 11 }}>正在整理本日课堂照片…</p>}
              {selectedReportHasImages && (reportImagesError || reportPhotoFailed) && (
                <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', marginBottom: 10, borderRadius: 10, color: 'var(--color-error)', background: 'var(--color-error-bg)', fontSize: 11 }}>
                  <span>部分课堂照片暂时无法读取。重试成功后即可下载含照片的报告。</span>
                  <Button size="small" onClick={retryReportImages}>重试照片</Button>
                </div>
              )}
              {selectedReportItems.length > 0
                ? selectedReportItems.map((item, index) => (
                  <ReportFeedback
                    key={(item.refId || String(index)) + '-photo-retry-' + reportImageRetryVersion}
                    item={item}
                    signedUrls={reportImageUrlMap}
                    imagesLoading={reportImagesLoading}
                    studentName={reportProfile.identity.name}
                    onImageError={() => setReportPhotoFailedDate(reportKey + '|' + selectedReportDateKey)}
                  />
                ))
                : <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--color-hairline)', background: 'var(--color-surface-1)', color: 'var(--color-ink-subtle)', textAlign: 'center', fontSize: 12 }}>请从上方选择有课堂记录的日期</div>}
            </section>

            <section data-report-pending={reportSummaryLoading || !reportSummary ? 'true' : 'false'} aria-busy={reportSummaryLoading} style={{ padding: isMobile ? 13 : 16, marginBottom: 14, borderRadius: 13, border: '1px solid var(--color-hairline)', background: 'rgba(255,255,255,.92)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9 }}>
                <h2 style={{ margin: 0, fontSize: 15, color: 'var(--color-ink)', fontWeight: 700 }}>阶段学习概览</h2>
                <Button type="link" size="small" data-report-exclude-from-pdf="true" onClick={refreshReportSummary} disabled={reportSummaryLoading} style={{ paddingInline: 4, minHeight: 36 }}>重新整理</Button>
              </div>
              {reportSummaryLoading && <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', color: 'var(--color-ink-muted)', fontSize: 12 }}><Spin size="small" />正在完善阶段概览，报告资料可先查看…</div>}
              {!reportSummaryLoading && reportSummaryError && <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: 'var(--color-error)', fontSize: 12 }}><span>{reportSummaryError}</span><Button size="small" onClick={refreshReportSummary}>重试</Button></div>}
              {reportSummary && <>
                <div data-report-keep-together="true" style={{ marginBottom: 11 }}>
                  <p style={{ margin: 0, color: 'var(--color-ink)', lineHeight: 1.8, fontSize: 13 }}>{reportSummary.overview}</p>
                </div>
                {reportSummary.strengths.length > 0 && <div data-report-keep-together="true" style={{ marginBottom: 9 }}><strong style={{ color: 'var(--color-success)', fontSize: 12 }}>学习优势</strong>{reportSummary.strengths.map((item) => <p key={item} style={{ margin: '4px 0 0', color: 'var(--color-ink-muted)', lineHeight: 1.7, fontSize: 12 }}>{item}</p>)}</div>}
                {reportSummary.focusAreas.length > 0 && <div data-report-keep-together="true" style={{ marginBottom: 9 }}><strong style={{ color: 'var(--color-warning-text)', fontSize: 12 }}>知识点跟进</strong>{reportSummary.focusAreas.map((item) => <p key={item} style={{ margin: '4px 0 0', color: 'var(--color-ink-muted)', lineHeight: 1.7, fontSize: 12 }}>{item}</p>)}</div>}
                {reportSummary.nextSteps.length > 0 && <div data-report-keep-together="true"><strong style={{ color: 'var(--color-primary)', fontSize: 12 }}>下一阶段行动建议</strong>{reportSummary.nextSteps.map((item, index) => <p key={item} style={{ margin: '4px 0 0', color: 'var(--color-ink-muted)', lineHeight: 1.7, fontSize: 12 }}>{index + 1}. {item}</p>)}</div>}
              </>}
                <div style={{ marginTop: 11, paddingTop: 8, borderTop: '1px solid var(--color-hairline)', color: 'var(--color-ink-subtle)', fontSize: 10, lineHeight: 1.6 }}>根据本期已发布的课堂反馈、测评批改和考勤记录整理。每条教师反馈及可读取的课堂照片均保留在报告后半部分，便于按日期核对。</div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: '出勤率', value: reportProfile.overview.attendanceRate !== null ? `${reportProfile.overview.attendanceRate}%` : '—' },
                { label: '课堂反馈', value: `${reportProfile.overview.feedbackCount} 条` },
                { label: '本月课时', value: reportWeeklyHours ? `${reportWeeklyHours.reduce((a, w) => a + w.hours, 0).toFixed(2)}h` : '—' },
              ].map(item => (
                <div key={item.label} style={{ padding: 10, borderRadius: 10, background: '#FFFBF7', textAlign: 'center', border: '1px solid #EEE7E1' }}>
                  <div style={{ fontSize: 10, color: '#7A869A', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#E8784A' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {reportTrendOption && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#534AB7', marginBottom: 6 }}>成绩趋势</div>
                <ReactECharts style={{ height: 180 }} option={reportTrendOption} opts={{ renderer: 'canvas' }} />
              </div>
            )}

            {reportWeeklyHours && reportWeeklyHours.some(w => w.hours > 0) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E8784A', marginBottom: 6 }}>本月上课情况</div>
                <ReactECharts style={{ height: 170 }} option={{ tooltip: { trigger: 'axis' }, grid: { left: 34, right: 10, top: 16, bottom: 24 }, xAxis: { type: 'category', data: reportWeeklyHours.map(w => w.week), axisLabel: { fontSize: 10 } }, yAxis: { type: 'value', name: 'h', axisLabel: { fontSize: 10 } }, series: [{ type: 'bar', data: reportWeeklyHours.map(w => w.hours), itemStyle: { color: '#E8784A', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 24 }] }} opts={{ renderer: 'canvas' }} />
              </div>
            )}

            {reportProfile.study.mastery.total > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', marginBottom: 3 }}>知识点掌握情况</div>
                <div style={{ fontSize: 10, color: 'var(--color-ink-subtle)', marginBottom: 7 }}>按本阶段试卷批改题目的知识点与掌握标记整理</div>
                <div style={{ display: 'flex', gap: 4, height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
                  {reportProfile.study.mastery.masteredPct > 0 && <div style={{ width: `${reportProfile.study.mastery.masteredPct}%`, background: '#1D9E75' }} />}
                  {reportProfile.study.mastery.reviewPct > 0 && <div style={{ width: `${reportProfile.study.mastery.reviewPct}%`, background: '#EF9F27' }} />}
                  {reportProfile.study.mastery.weakPct > 0 && <div style={{ width: `${reportProfile.study.mastery.weakPct}%`, background: '#E24B4A' }} />}
                </div>
                <div style={{ fontSize: 12, color: '#7A869A', display: 'flex', gap: 16 }}>
                  <span>▪ 已掌握 {reportProfile.study.mastery.masteredPct}%</span>
                  <span>▪ 需复习 {reportProfile.study.mastery.reviewPct}%</span>
                  <span>▪ 薄弱 {reportProfile.study.mastery.weakPct}%</span>
                </div>
                {reportProfile.study.mastery.topics.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 7, marginTop: 9 }}>
                  {reportProfile.study.mastery.topics.map((topic) => {
                    const status = topic.needsPractice > 0 ? '需要练习' : topic.needsReview > 0 ? '建议复习' : topic.mastered === topic.total ? '批改题目均标记已掌握' : '批改状态待更新'
                    const color = topic.needsPractice > 0 ? 'var(--color-error)' : topic.needsReview > 0 ? 'var(--color-warning-text)' : 'var(--color-success)'
                    return <div key={`${topic.subject}-${topic.topic}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 9px', borderRadius: 9, border: '1px solid var(--color-hairline)', background: 'rgba(255,255,255,.88)' }}>
                      <span style={{ minWidth: 0, color: 'var(--color-ink)', fontSize: 11, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{topic.subject} · {topic.topic}<small style={{ display: 'block', color: 'var(--color-ink-subtle)' }}>{topic.mastered}/{topic.total}题标记已掌握</small></span>
                      <strong style={{ flex: '0 0 auto', alignSelf: 'center', color, fontSize: 10 }}>{status}</strong>
                    </div>
                  })}
                </div>}
              </div>
            )}

            {(() => {
              const badgeItems = reportProfile.record.timeline.filter(t => t.type === 'badge')
              if (!badgeItems.length) return null
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#EF9F27', marginBottom: 6 }}>本期进步</div>
                  {badgeItems.slice(0, 5).map((b, i) => (
                    <div key={i} style={{ fontSize: 12, marginBottom: 4, color: '#4B5563' }}>
                      {fmtDate(b.date)} 获得「{b.title.replace('获得徽章「', '').replace('」', '')}」{b.sub ? ` — ${b.sub}` : ''}
                    </div>
                  ))}
                </div>
              )
            })()}

            {subjectInsights.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#6A5ACD', marginBottom: 6 }}>各科老师本期评价</div>
                {subjectInsights.map(({ subject, latest, count }) => (
                  <div key={subject} data-report-keep-together="true" style={{ fontSize: 12, marginBottom: 6, padding: '8px 10px', background: '#F9F7FF', borderRadius: 8, color: '#4B5563' }}>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#7A869A', marginBottom: 2 }}>
                      {subject} · {latest.teacher || '任课'}老师 · 本期 {count} 次反馈 · 最近 {fmtDate(latest.date)}
                    </div>
                    {latest.detail?.comment || latest.detail?.summary || latest.sub || '老师已记录本次课堂情况'}
                  </div>
                ))}
              </div>
            )}

            {reportProfile.study.weaknesses.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E24B4A', marginBottom: 6 }}>薄弱知识点</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {reportProfile.study.weaknesses.map((w, i) => (
                    <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: '#FFF0F0', color: '#E24B4A', border: '1px solid #FDD' }}>{w.topic}{w.mistakeCount > 1 && ` ×${w.mistakeCount}`}</span>
                  ))}
                </div>
              </div>
            )}

            {reportProfile.profileCase.goals.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#534AB7', marginBottom: 6 }}>学习目标</div>
                {reportProfile.profileCase.goals.map((g, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 2, color: '#4B5563' }}>
                    {g.isAchieved ? '✅' : '📌'} {g.goalDesc} ({g.subject})
                  </div>
                ))}
              </div>
            )}

            {reportProfile.profileCase.teacherSummary && (
              <div style={{ padding: '10px 14px', background: '#faf8f5', borderRadius: 10, border: '1px solid #EEE7E1', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E8784A', marginBottom: 4 }}>教师寄语</div>
                <div style={{ fontSize: 12, color: '#4B5563', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{reportProfile.profileCase.teacherSummary.summary}</div>
                {reportProfile.profileCase.teacherSummary.suggestions && <div style={{ fontSize: 12, color: '#4B5563', marginTop: 6 }}>建议：{reportProfile.profileCase.teacherSummary.suggestions}</div>}
              </div>
            )}
          </div>
        )}
      </BrandModal>
    </div>
  )
}
