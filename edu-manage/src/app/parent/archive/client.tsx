'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import NextImage from 'next/image'
import { Button, Card, Select, Tag, Typography, Progress, Spin, Modal, Image, Space } from 'antd'
import {
  FileTextOutlined, MessageOutlined, HeartOutlined, TrophyOutlined,
  RiseOutlined, FlagOutlined, BookOutlined, CheckCircleOutlined,
  DownloadOutlined, RightOutlined, ClockCircleOutlined,
  CalendarOutlined, BarChartOutlined, FolderOpenOutlined, HistoryOutlined,
  SmileOutlined, MinusOutlined, WarningOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import useSWR from 'swr'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import type { StudentProfile } from '@/lib/student-profile'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { fmtDate } from '@/lib/format-date'
import { formatFriendlyTime } from '@/lib/date/relative'
import type { FeedbackImageVariant } from '@/lib/file-asset-variants'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { HoursLeaderboard } from '@/components/Parent/HoursLeaderboard'
import { ParentLessonPreviewHistory } from '@/components/Parent/ParentLessonPreviewHistory'
import { MOOD_META, PERFORMANCE_BADGES } from '@/lib/mood-meta'
import { formatRemaining } from '@/lib/lesson-units'

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
type FeedbackDetailData = TimelineItem['detail']
type Paper = { id: string; title: string; subject?: string | null; paperDate?: string | null; student?: { id?: string; name?: string } | null; questions?: Array<{ topic?: string | null; mastery?: string | null }> }
type Enrollment = { id: string; totalHours?: number | null; remainHours?: number | null; group?: { id: string; name?: string | null; intensiveMode?: string | null; lessonMinutes?: number | null; course?: { id: string; name?: string | null; type?: string | null } | null } | null }
type HourRecord = { id: string; status: string; hoursDeducted?: number | null; approvedTeachingHours?: number | null; isIntensiveApproved?: boolean; date?: string | null; courseName?: string | null; teacherName?: string | null; courseType?: string | null; lessonMinutes?: number | null; type?: string | null }

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

function localDateKey(value: Date | string) {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  const [detailItem, setDetailItem] = useState<TimelineItem | null>(null)
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') && TABS.some(t => t.key === searchParams.get('tab')) ? (searchParams.get('tab') as string) : 'overview')
  const [selectedGrade, setSelectedGrade] = useState('初一')
  const detailImages: ReturnType<typeof normalizeTimelineImage>[] = Array.isArray(detailItem?.images)
    ? detailItem.images.map(normalizeTimelineImage)
    : []
  const { urls: signedDetailThumbnails } = useSignedUrls(detailImages.map(image => image.thumbnailUrl || image.previewUrl || image.originalUrl))
  const { urls: signedDetailPreviews } = useSignedUrls(detailImages.map(image => image.previewUrl || image.thumbnailUrl || image.originalUrl))

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

  const moodQuery = studentId ? `/api/performance?studentId=${studentId}&limit=50` : null
  const { data: moodData } = useSWR(moodQuery, fetcher, { revalidateOnFocus: true, dedupingInterval: 60_000 })
  const moodPosts = useMemo(() => Array.isArray((moodData as { posts?: Array<{ mood: string; createdAt: string }> } | undefined)?.posts) ? (moodData as { posts: Array<{ mood: string; createdAt: string }> }).posts : [], [moodData])

  const papersQuery = activeTab === 'grades' ? '/api/exam-papers?mine=true' : null
  const { data: papersData } = useSWR<{ papers: Paper[] }>(papersQuery, fetcher, { revalidateOnFocus: true, dedupingInterval: 60_000 })
  const allPapers: Paper[] = useMemo(() => Array.isArray((papersData as { papers?: Paper[] } | undefined)?.papers) ? (papersData as { papers: Paper[] }).papers : [], [papersData])
  const studentPapers = useMemo(() => allPapers.filter(p => p.student?.id === studentId), [allPapers, studentId])
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
  const profile = data?.profile as StudentProfile | null | undefined

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

  const weeklyHours = profile?.record?.weeklyHours?.length ? profile.record.weeklyHours : null

  // 焦点定位：从课堂反馈 / 成长动态 / 考勤日期跳转进来时，自动切到「时间线」并滚动到对应记录
  const feedbackId = searchParams.get('feedbackId')
  const postId = searchParams.get('postId')
  const focusDate = searchParams.get('date')
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
    window.setTimeout(() => {
      timelineRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (feedbackId || postId) setDetailItem(target)
    }, 160)
  }, [feedbackId, postId, focusDate, profile])

  const handleTimelineClick = (item: TimelineItem) => {
    if (item.images?.length) { setDetailItem(item); return }
    if (item.refType === 'feedback' && item.refId) { setDetailItem(item); return }
    if (item.refType === 'paper' && item.refId) { setDetailItem(item); return }
    if (item.refType === 'post' && item.refId) { setDetailItem(item); return }
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
    if (!reportRef.current || !profile) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const img = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = 210, pageH = 297
      const imgW = pageW, imgH = (canvas.height * imgW) / canvas.width
      let left = imgH, pos = 0
      pdf.addImage(img, 'PNG', 0, pos, imgW, imgH)
      left -= pageH
      while (left > 0) { pos = left - imgH; pdf.addPage(); pdf.addImage(img, 'PNG', 0, pos, imgW, imgH); left -= pageH }
      pdf.save(`${profile.identity.name}-学情报告-${months}个月.pdf`)
      toast.success('学情报告已下载')
    } catch { toast.error('生成报告失败，请重试') }
    finally { setDownloading(false) }
  }, [profile, months])

  if (!initial.children.length) {
    return <Card bordered={false} style={{ borderRadius: 14, textAlign: 'center', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <GuidedEmpty title="还没有绑定孩子" description="绑定孩子后，课堂反馈、成绩和成长记录会汇总到这里，方便长期查看变化。" actionLabel="去个人中心核对" onAction={() => router.push('/parent/profile')} />
    </Card>
  }

  const loadingMask = isLoading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>

  const reportTrendOption = profile?.record.trendBySubject.length ? {
    tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontSize: 9, color: '#333' } },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'time' as const, axisLabel: { fontSize: 8, formatter: '{MM}-{dd}', color: '#333' } },
    yAxis: { type: 'value' as const, min: 0, max: 100, axisLabel: { fontSize: 8, formatter: '{value}%', color: '#333' } },
    series: profile.record.trendBySubject.map((subj, idx) => ({ name: subj.subject, type: 'line' as const, smooth: true, data: subj.points.map(p => [p.date, p.pct]), symbol: 'circle' as const, symbolSize: 3, lineStyle: { width: 2 }, color: ['#1D9E75','#E8784A','#534AB7','#EF9F27'][idx % 4] })),
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
      <div className="parent-theme-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div><Title level={4} style={{ margin: 0, fontSize: 19 }}>学生成长档案</Title><Text type="secondary" style={{ fontSize: 13 }}>记录孩子每一次成长的足迹</Text></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {children.length > 1 && <Select size={isMobile ? 'middle' : 'small'} aria-label="选择孩子" className="archive-select" value={studentId} onChange={(value) => { setStudentId(value); const params = new URLSearchParams(window.location.search); params.set('studentId', value); window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`) }} style={{ minWidth: isMobile ? 130 : 110 }} options={children.map((c: InitialData['children'][number]) => ({ label: `${c.name}${c.grade ? ` · ${c.grade}` : ''}${children.filter((other) => other.name === c.name).length > 1 ? ` · 档案${c.id.slice(-4)}` : ''}`, value: c.id }))} />}
          <Select size={isMobile ? 'middle' : 'small'} className="archive-select" value={months} onChange={setMonths} style={{ width: isMobile ? 104 : 96 }} options={[{ label:'近1个月',value:1},{ label:'近3个月',value:3},{ label:'近6个月',value:6},{ label:'近12个月',value:12}]} />
        </div>
      </div>

      {/* Tab bar：卡片式 Tab，选中橙色高亮，带一句微说明 */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0 14px', scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button key={tab.key} type="button" onClick={() => switchTab(tab.key)} aria-selected={activeTab === tab.key}
            style={{
              flexShrink: 0, border: '1px solid', padding: '8px 12px', borderRadius: 13, fontSize: 12.5, cursor: 'pointer',
              background: activeTab === tab.key ? '#FFF8F2' : '#fff',
              borderColor: activeTab === tab.key ? '#E8784A' : '#EFEBE5',
              color: activeTab === tab.key ? '#C2541F' : '#6B6560',
              fontWeight: activeTab === tab.key ? 700 : 600,
              boxShadow: activeTab === tab.key ? '0 4px 12px rgba(232,120,74,.14)' : 'none',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
            }}>
            <span>{tab.icon}</span>{tab.label}
            <small style={{ fontSize: 10, color: activeTab === tab.key ? '#C2541F' : '#A39C93', fontWeight: 400 }}>{tab.hint}</small>
          </button>
        ))}
      </div>

      {loadingMask}
      {!profile && !isLoading && <Card bordered={false} style={{ borderRadius: 14, textAlign: 'center', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GuidedEmpty title="还没有成长档案" description="老师更新课堂反馈、成绩和成长记录后会显示在这里，帮助你连续了解孩子的变化。" actionLabel="给老师留言" onAction={() => router.push('/parent/messages')} /></Card>}

      {profile && (
        <>
          {/* ============ 概览 Tab ============ */}
          {activeTab === 'overview' && (
            <div>
              <Card bordered={false} className="parent-growth-overview" style={{ marginBottom: 13 }}>
                <div className="parent-growth-identity">
                  <div>
                    <Text strong style={{ fontSize: 20 }}>{profile.identity.name}</Text>
                    <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                      {profile.identity.grade && <Tag style={{ borderRadius: 9999, fontSize: 11 }}>{profile.identity.grade}</Tag>}
                      {profile.identity.mainTeacher && <TeacherNameWithTag name={profile.identity.mainTeacher} tier={(profile.identity as { mainTeacherTier?: string }).mainTeacherTier} />}
                    </div>
                  </div>
                  <div className="parent-growth-identity-stats">
                    <Text type="secondary">累计课时</Text>
                    <div><Text strong>{profile.identity.totalHours}</Text><Text type="secondary">h</Text></div>
                    <Text type="secondary">{profile.overview.attendanceRate === null ? '出勤待记录' : `本期出勤 ${profile.overview.attendanceRate}%`}</Text>
                  </div>
                </div>
                <Button type="primary" icon={<FileTextOutlined />} onClick={() => setReportOpen(true)}
                  style={{ borderRadius: 10, background: '#E8784A', border: 'none', padding: '8px 20px', fontSize: 13.5, height: 'auto', width: '100%', marginTop: 13 }}>
                  查看本期学情报告
                </Button>
              </Card>

              {/* 学习概况 */}
              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
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
              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><RiseOutlined style={{ color: '#534AB7' }} />{overviewTrendSeries ? '学习趋势' : '本月课时趋势'}</Text>
                  {overviewTrendSeries && trendPres && <span style={{ fontSize: 12, fontWeight: 700, color: trendPres.color, background: trendPres.background, padding: '3px 10px', borderRadius: 9999 }}>{trendPres.icon}{trendPres.label}</span>}
                </div>
                {overviewTrendSeries ? (
                  <>
                    {growth?.trend?.description && <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>{growth.trend.description}</Text>}
                    {overviewTrendSeries.dates.length > 1 ? (
                      <ReactECharts style={{ height: 150, marginTop: 8 }} option={{ tooltip: { trigger: 'axis', formatter: '{c}%' }, grid: { left: 34, right: 14, top: 18, bottom: 26 }, xAxis: { type: 'category', data: overviewTrendSeries.dates, axisLabel: { fontSize: 9, formatter: (value: string) => value.slice(5) } }, yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 9, formatter: '{value}%' } }, series: [{ type: 'line', smooth: true, data: overviewTrendSeries.values, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#E8784A' }, itemStyle: { color: '#E8784A' }, areaStyle: { opacity: 0.08, color: '#E8784A' } }] }} opts={{ renderer: 'svg' }} />
                    ) : (
                      <div style={{ marginTop: 12, padding: '16px 0', textAlign: 'center', fontSize: 12.5, color: '#9A8E7A', background: '#FAF8F5', borderRadius: 10 }}>暂无足够成绩数据，积累后自动生成趋势图</div>
                    )}
                  </>
                ) : weeklyHours && weeklyHours.some(w => w.hours > 0) ? (
                  <>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>本月累计上课 {weeklyHours.reduce((a, w) => a + w.hours, 0).toFixed(1)} 小时，按周记录如下：</Text>
                    <ReactECharts style={{ height: 150, marginTop: 8 }} option={{ tooltip: { trigger: 'axis', formatter: (p: any) => { const i = p?.[0]?.dataIndex ?? 0; const w = weeklyHours[i]; return `${w.week}（${w.range}）<br/>上课 ${w.hours} 小时` } }, grid: { left: 34, right: 12, top: 18, bottom: 26 }, xAxis: { type: 'category', data: weeklyHours.map(w => w.week), axisLabel: { fontSize: 9 } }, yAxis: { type: 'value', name: 'h', axisLabel: { fontSize: 9 } }, series: [{ type: 'bar', data: weeklyHours.map(w => w.hours), itemStyle: { color: '#534AB7', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 22 }] }} opts={{ renderer: 'svg' }} />
                  </>
                ) : (
                  <div style={{ marginTop: 12, padding: '16px 0', textAlign: 'center', fontSize: 12.5, color: '#9A8E7A', background: '#FAF8F5', borderRadius: 10 }}>本月暂无课时记录，上课后将自动生成趋势</div>
                )}
              </Card>

              {/* 本周情绪 */}
              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
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
              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
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
                <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                  <HoursLeaderboard studentName={leaderboardData.studentName} mineHours={leaderboardData.mineHours} classmates={leaderboardData.classmates} hasData={leaderboardData.hasData} />
                </Card>
              )}

              {/* 出勤概况 */}
              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
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

          {/* ============ 时间线 Tab ============ */}
          {activeTab === 'timeline' && (
            <div>
              {hasHighlights && highlights && (
                <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
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

              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }}>
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
                          return <article key={key} ref={(node) => { timelineRefs.current[key] = node }} onClick={() => handleTimelineClick(item)} className={`parent-growth-history-item${isFocused ? ' is-focused' : ''}${(item.images?.length || item.refType) ? ' is-clickable' : ''}`}>
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
              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13, overflow: 'hidden', marginTop: 13 }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 2px 4px' }}><HistoryOutlined style={{ color: '#534AB7' }} />下节课讲义预告</Text>
                <ParentLessonPreviewHistory />
              </Card>

              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 11 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><FolderOpenOutlined style={{ color: '#E8784A' }} />学习资料</Text>
                  <Select size="small" value={selectedGrade} onChange={(value) => setSelectedGrade(value)} style={{ width: 110, borderRadius: 999, background: '#fff' }} options={['初一', '初二', '初三', '高一', '高二', '高三'].map(g => ({ label: g, value: g }))} />
                </div>
                {materialsLoading ? <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div> : materials.length === 0 ? (
                  <GuidedEmpty title="这个年级还没有学习资料" description="老师准备的讲义和练习会显示在这里，帮助孩子课后复习。" actionLabel="看看课堂反馈" onAction={() => router.push('/parent/class-feedback')} compact />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {materials.slice(0, 30).map(material => (
                      <div key={material.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', border: '1px solid #F0E7DE', borderRadius: 12, background: '#fff' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0, color: '#E8784A', background: 'rgba(232,120,74,.10)' }}>
                          <FileTextOutlined />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis={{ tooltip: material.title }}>{material.title}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{material.subject} · {material.grade} · {fmtDate(material.createdAt)}</Text>
                        </div>
                        <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => window.open(`/api/materials/${material.id}/view?download=1`, '_blank')} style={{ background: '#E8784A', border: 'none', flexShrink: 0 }}>下载</Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ============ 学习分析 Tab ============ */}
          {activeTab === 'grades' && (
            <div>
              {/* 本月上课情况（课时趋势 4 周） */}
              {weeklyHours && weeklyHours.some(w => w.hours > 0) && (
                <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><ClockCircleOutlined style={{ color: '#E8784A' }} />本月上课情况</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>累计上课 {weeklyHours.reduce((a, w) => a + w.hours, 0).toFixed(1)} 小时，共 {weeklyHours.filter(w => w.hours > 0).length} 周有课。</Text>
                  <ReactECharts style={{ height: 200, marginTop: 8 }} option={{ tooltip: { trigger: 'axis', formatter: (p: any) => { const i = p?.[0]?.dataIndex ?? 0; const w = weeklyHours[i]; return `${w.week}（${w.range}）<br/>上课 ${w.hours} 小时` } }, grid: { left: 36, right: 12, top: 18, bottom: 26 }, xAxis: { type: 'category', data: weeklyHours.map(w => w.week), axisLabel: { fontSize: 10 } }, yAxis: { type: 'value', name: 'h', axisLabel: { fontSize: 10 } }, series: [{ type: 'bar', data: weeklyHours.map(w => w.hours), itemStyle: { color: '#E8784A', borderRadius: [5, 5, 0, 0] }, barMaxWidth: 28 }] }} opts={{ renderer: 'svg' }} />
                </Card>
              )}

              {/* 知识掌握（profile 口径） */}
              {(profile.study.mastery.total > 0 || profile.study.weaknesses.length > 0) && (
                <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><BookOutlined style={{ color: '#534AB7' }} />知识掌握</Text>
                  {profile.study.mastery.total > 0 && <>
                    <Progress percent={profile.study.mastery.masteredPct} strokeColor="#1D9E75" trailColor="rgba(0,0,0,.05)" style={{ marginTop: 10 }} />
                    <Text type="secondary" style={{ fontSize: 11.5 }}>已掌握 {profile.study.mastery.masteredPct}% · 需复习 {profile.study.mastery.reviewPct}% · 薄弱 {profile.study.mastery.weakPct}%</Text>
                  </>}
                  {profile.study.weaknesses.length > 0 && <div className="parent-growth-weaknesses" style={{ marginTop: 8 }}><Text strong style={{ fontSize: 12 }}>薄弱知识点</Text><div>{profile.study.weaknesses.map((item, index) => <Tag key={`${item.topic}-${index}`} color={item.mistakeCount >= 3 ? 'red' : 'orange'}>{item.topic}{item.mistakeCount > 1 && ` ×${item.mistakeCount}`}</Tag>)}</div></div>}
                </Card>
              )}

              {/* 试卷统计 */}
              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
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
                <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><RiseOutlined style={{ color: '#534AB7' }} />成绩趋势</Text>
                  <ReactECharts style={{ height: 200 }} option={{ tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontSize: 10 } }, grid: { left: 40, right: 20, top: 20, bottom: 30 }, xAxis: { type: 'time', axisLabel: { fontSize: 9, formatter: '{MM}-{dd}' } }, yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 9, formatter: '{value}%' } }, series: profile.record.trendBySubject.map((subject, index) => ({ name: subject.subject, type: 'line', smooth: true, data: subject.points.map(point => [point.date, point.pct]), symbol: 'circle', symbolSize: 3, lineStyle: { width: 2 }, color: ['#1D9E75','#E8784A','#534AB7','#EF9F27'][index % 4] })) }} opts={{ renderer: 'svg' }} />
                </Card>
              )}

              {/* 试卷列表 */}
              <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, margin: '2px 2px 10px' }}><FolderOpenOutlined style={{ color: '#534AB7' }} />试卷与课堂反馈</Text>
              {studentPapers.length === 0 ? (
                <Card bordered={false} style={{ borderRadius: 14, border: '1px dashed rgba(0,0,0,.10)', textAlign: 'center', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GuidedEmpty title="暂无试卷记录" description="机构课堂以课时记录与课堂反馈呈现学习情况，如有考试批改会展示在这里。" compact />
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {studentPapers.map(paper => (
                    <Card key={paper.id} bordered={false} className="parent-card" style={{ borderRadius: 12, border: '1px solid #F0DDD2', cursor: 'pointer' }} styles={{ body: { padding: 13 } }} onClick={() => router.push(`/parent/archive/${paper.id}?paperId=${paper.id}`)}>
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
        </>
      )}

      {/* Image detail Modal */}
      <Modal open={!!detailItem} onCancel={() => setDetailItem(null)} footer={null} width="min(560px, 92vw)" title={detailItem?.title || '详情'}>
        {detailItem && (
          <div>
            {detailImages.length > 0 && <Image.PreviewGroup><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>{detailImages.map((image, i: number) => <Image key={`${image.originalUrl}-${i}`} src={signedDetailThumbnails[i]} preview={{ src: signedDetailPreviews[i] }} alt="" style={{ borderRadius: 8, objectFit: 'cover', width: '100%', height: 120 }} fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='120'%3E%3Crect width='140' height='120' fill='%23f5f2ee'/%3E%3Ctext x='70' y='60' text-anchor='middle' dominant-baseline='middle' fill='%239a8e7a' font-size='12'%3E图片加载失败%3C/text%3E%3C/svg%3E" />)}</div></Image.PreviewGroup>}
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{detailItem.sub || detailItem.title}</Paragraph>
            {detailItem.teacher && <Tag style={{ borderRadius: 9999, marginTop: 4 }}>{formatTeacherLabel(detailItem)}</Tag>}
            {detailItem.date && <div style={{ marginTop: 8 }}><Text type="secondary" style={{ fontSize: 11 }}>{formatFriendlyTime(detailItem.date)}</Text></div>}
            <FeedbackDetail detail={detailItem.detail} />
            {detailItem.refType === 'paper' && detailItem.refId && <Button type="link" onClick={() => { setDetailItem(null); switchTab('grades') }} style={{ padding: 0, marginTop: 8 }}>查看试卷详情</Button>}
          </div>
        )}
      </Modal>

      {/* C1+C2: Expanded report Modal with PDF download */}
      <Modal open={reportOpen} onCancel={() => setReportOpen(false)} width="min(650px, 92vw)" title="本期学情报告"
        styles={{ body: { maxHeight: '68vh', overflowY: 'auto', padding: 16 } }}
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => setReportOpen(false)}>关闭</Button>
          <Button type="primary" icon={<DownloadOutlined />} loading={downloading} onClick={downloadReport} style={{ background: '#E8784A', border: 'none' }}>下载 PDF</Button>
        </div>}>
        {profile && (
          <div ref={reportRef} style={{ padding: 16, background: '#ffffff', color: '#1F2329', fontFamily: 'sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#E8784A', marginBottom: 4 }}>{profile.identity.name} · 学情报告</div>
              <div style={{ fontSize: 12, color: '#7A869A' }}>
                {profile.identity.grade || ''} {profile.identity.school || ''} · 近 {months} 个月
                {profile.identity.mainTeacher && ` · 主教师：${profile.identity.mainTeacher}`}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: '出勤率', value: profile.overview.attendanceRate !== null ? `${profile.overview.attendanceRate}%` : '—' },
                { label: '课堂反馈', value: `${profile.overview.feedbackCount} 条` },
                { label: '本月课时', value: weeklyHours ? `${weeklyHours.reduce((a, w) => a + w.hours, 0).toFixed(1)}h` : '—' },
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

            {weeklyHours && weeklyHours.some(w => w.hours > 0) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E8784A', marginBottom: 6 }}>本月上课情况</div>
                <ReactECharts style={{ height: 170 }} option={{ tooltip: { trigger: 'axis' }, grid: { left: 34, right: 10, top: 16, bottom: 24 }, xAxis: { type: 'category', data: weeklyHours.map(w => w.week), axisLabel: { fontSize: 10 } }, yAxis: { type: 'value', name: 'h', axisLabel: { fontSize: 10 } }, series: [{ type: 'bar', data: weeklyHours.map(w => w.hours), itemStyle: { color: '#E8784A', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 24 }] }} opts={{ renderer: 'canvas' }} />
              </div>
            )}

            {profile.study.mastery.total > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75', marginBottom: 6 }}>知识掌握</div>
                <div style={{ display: 'flex', gap: 4, height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
                  {profile.study.mastery.masteredPct > 0 && <div style={{ width: `${profile.study.mastery.masteredPct}%`, background: '#1D9E75' }} />}
                  {profile.study.mastery.reviewPct > 0 && <div style={{ width: `${profile.study.mastery.reviewPct}%`, background: '#EF9F27' }} />}
                  {profile.study.mastery.weakPct > 0 && <div style={{ width: `${profile.study.mastery.weakPct}%`, background: '#E24B4A' }} />}
                </div>
                <div style={{ fontSize: 10, color: '#7A869A', display: 'flex', gap: 16 }}>
                  <span>▪ 已掌握 {profile.study.mastery.masteredPct}%</span>
                  <span>▪ 需复习 {profile.study.mastery.reviewPct}%</span>
                  <span>▪ 薄弱 {profile.study.mastery.weakPct}%</span>
                </div>
              </div>
            )}

            {(() => {
              const badgeItems = profile.record.timeline.filter(t => t.type === 'badge')
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
                  <div key={subject} style={{ fontSize: 12, marginBottom: 6, padding: '8px 10px', background: '#F9F7FF', borderRadius: 8, color: '#4B5563' }}>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#7A869A', marginBottom: 2 }}>
                      {subject} · {latest.teacher || '任课'}老师 · 本期 {count} 次反馈 · 最近 {fmtDate(latest.date)}
                    </div>
                    {latest.detail?.comment || latest.detail?.summary || latest.sub || '老师已记录本次课堂情况'}
                  </div>
                ))}
              </div>
            )}

            {profile.study.weaknesses.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E24B4A', marginBottom: 6 }}>薄弱知识点</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {profile.study.weaknesses.map((w, i) => (
                    <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: '#FFF0F0', color: '#E24B4A', border: '1px solid #FDD' }}>{w.topic}{w.mistakeCount > 1 && ` ×${w.mistakeCount}`}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.profileCase.goals.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#534AB7', marginBottom: 6 }}>学习目标</div>
                {profile.profileCase.goals.map((g, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 2, color: '#4B5563' }}>
                    {g.isAchieved ? '✅' : '📌'} {g.goalDesc} ({g.subject})
                  </div>
                ))}
              </div>
            )}

            {profile.profileCase.teacherSummary && (
              <div style={{ padding: '10px 14px', background: '#faf8f5', borderRadius: 10, border: '1px solid #EEE7E1', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E8784A', marginBottom: 4 }}>教师寄语</div>
                <div style={{ fontSize: 12, color: '#4B5563', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{profile.profileCase.teacherSummary.summary}</div>
                {profile.profileCase.teacherSummary.suggestions && <div style={{ fontSize: 12, color: '#4B5563', marginTop: 6 }}>建议：{profile.profileCase.teacherSummary.suggestions}</div>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
