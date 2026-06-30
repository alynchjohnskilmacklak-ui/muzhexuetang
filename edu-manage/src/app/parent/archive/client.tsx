'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, Empty, Select, Tag, Typography, Progress, Spin, Modal, Image, Button, Collapse } from 'antd'
import {
  FileTextOutlined, MessageOutlined, HeartOutlined, TrophyOutlined,
  RiseOutlined, FlagOutlined, BookOutlined, CheckCircleOutlined,
  DashboardOutlined, DownloadOutlined, RightOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import useSWR from 'swr'
import ReactECharts from 'echarts-for-react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { StudentProfile } from '@/lib/student-profile'
import { useIsMobile } from '@/hooks/useIsMobile'
import { fmtDate, fmtDateTime } from '@/lib/format-date'

const { Title, Text, Paragraph } = Typography

const MOOD_EMOJI: Record<string, string> = { GREAT: '😄', GOOD: '🙂', OKAY: '😐', NEEDS_ATTENTION: '😟' }

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

type InitialData = { children: { id: string; name: string }[]; activeStudentId: string | null; profile: StudentProfile }
const fetcher = (url: string) => fetch(url).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || '请求失败'); return d })

function formatTeacherLabel(item?: { teacher?: string; teacherSubject?: string }) {
  if (!item?.teacher) return ''
  return `${item.teacher} 老师${item.teacherSubject ? ` · ${item.teacherSubject}` : ''}`
}

function timelineKey(item: { type?: string; refId?: string; id?: string }, index: number) {
  return `${item.type || 'item'}-${item.refId || item.id || index}`
}

function localDateKey(value: Date | string) {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ParentArchiveClient({ initial }: { initial: InitialData }) {
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportRef = useRef<HTMLDivElement>(null)
  const timelineRefs = useRef<Record<string, HTMLElement | null>>({})
  const [studentId, setStudentId] = useState(searchParams.get('studentId') || initial.activeStudentId || '')
  const [months, setMonths] = useState(1)
  const [timeFilter, setTimeFilter] = useState('')
  const [studyOpen, setStudyOpen] = useState(false)
  const [habitOpen, setHabitOpen] = useState(false)
  const [trendOpen, setTrendOpen] = useState(false)
  const [showAllTimeline, setShowAllTimeline] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [detailItem, setDetailItem] = useState<any>(null)

  const query = studentId ? `/api/parent/profile?studentId=${studentId}&months=${months}` : null
  const { data, isLoading } = useSWR(query, fetcher, {
    fallbackData: initial.profile && studentId === initial.activeStudentId && months === 6
      ? { children: initial.children, activeStudentId: initial.activeStudentId, profile: initial.profile }
      : undefined,
    revalidateOnFocus: true, dedupingInterval: 30_000,
    onError: () => toast.error('加载档案失败，请刷新重试'),
  })

  const children = data?.children || initial.children
  const profile = data?.profile as StudentProfile | null | undefined
  const feedbackId = searchParams.get('feedbackId')
  const postId = searchParams.get('postId')
  const focusDate = searchParams.get('date')

  useEffect(() => {
    const timeline = profile?.record.timeline || []
    if (!timeline.length) return

    const targetIndex = timeline.findIndex((item: any) => {
      if (feedbackId && item.refId === feedbackId) return true
      if (postId && item.refId === postId) return true
      if (focusDate && localDateKey(item.date) === focusDate) return true
      return false
    })
    if (targetIndex < 0) return

    const target = timeline[targetIndex] as any
    const key = timelineKey(target, targetIndex)
    setTimeFilter('')
    window.setTimeout(() => {
      timelineRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (feedbackId || postId) setDetailItem(target)
    }, 80)
  }, [feedbackId, postId, focusDate, profile])

  const handleTimelineClick = (item: any) => {
    if (item.images?.length) { setDetailItem(item); return }
    if (item.refType === 'feedback' && item.refId) { setDetailItem(item); return }
    if (item.refType === 'paper' && item.refId) { setDetailItem(item); return }
    if (item.refType === 'post' && item.refId) { setDetailItem(item); return }
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
      <Empty description="暂无绑定学员" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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

  const moodWeekly = profile?.growth.moodWeekly || []
  const moodTrendText = moodWeekly.length >= 2
    ? moodWeekly[moodWeekly.length - 1].avg - moodWeekly[0].avg >= 0.5
      ? '📈 最近课堂状态在变好'
      : moodWeekly[moodWeekly.length - 1].avg - moodWeekly[0].avg <= -0.5
        ? '📉 最近状态有波动，可和老师聊聊'
        : '➡️ 课堂状态保持平稳'
    : ''
  const moodTrendOption = moodWeekly.length >= 2 ? {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: Array<{ data: { value: number; count: number }; axisValueLabel: string }>) => {
        const point = params[0]
        if (!point) return ''
        return `${point.axisValueLabel}<br/>课堂状态：${point.data.value}${point.data.count <= 1 ? '<br/>（本周反馈较少，仅供参考）' : ''}`
      },
    },
    grid: { left: 46, right: 16, top: 20, bottom: 30 },
    xAxis: { type: 'category' as const, data: moodWeekly.map(point => fmtDate(point.weekStart).replace('月', '/').replace('日', '')), axisLabel: { fontSize: 10, color: '#5a4e3a' } },
    yAxis: { type: 'value' as const, min: 1, max: 4, interval: 1, axisLabel: { fontSize: 10, color: '#5a4e3a', formatter: (value: number) => ({ 1: '关注', 2: '一般', 3: '好', 4: '棒' }[value] || '') } },
    series: [{
      type: 'line' as const,
      smooth: true,
      data: moodWeekly.map(point => ({
        value: point.avg,
        count: point.count,
        symbol: 'circle',
        symbolSize: point.count <= 1 ? 8 : 6,
        itemStyle: point.count <= 1 ? { color: '#ffffff', borderColor: '#E8784A', borderWidth: 2 } : { color: '#E8784A' },
      })),
      lineStyle: { color: '#E8784A', width: 2 },
      areaStyle: { color: 'rgba(232,120,74,.12)' },
    }],
  } : null
  const teacherUpdates = profile?.record.timeline.filter(item => item.type === 'feedback' || item.type === 'post') || []
  const latestTeacherUpdate = teacherUpdates[0]
  const highlights = profile?.growth.highlights
  const hasHighlights = Boolean(highlights && (highlights.badgeTotal > 0 || highlights.praiseCount > 0 || highlights.topTags.length > 0))
  const hasStudyData = Boolean(profile && (profile.study.mastery.total > 0 || profile.study.weaknesses.length > 0 || profile.study.radar.length > 0))
  const hasHabitData = Boolean(profile && (profile.habits.moodTimeline.length > 0 || profile.habits.homeworkDoneRate !== null || profile.habits.inClassAvg !== null))
  const attendanceText = profile?.overview.attendanceRate !== null && profile?.overview.attendanceRate !== undefined
    ? `${profile.overview.attendanceRate}%`
    : '待记录'
  const moodDelta = moodWeekly.length >= 2 ? moodWeekly[moodWeekly.length - 1].avg - moodWeekly[0].avg : null
  const latestMoodAvg = moodWeekly[moodWeekly.length - 1]?.avg
  const statusSummary = profile
    ? moodWeekly.length < 2
      ? `${profile.identity.name} 本期出勤 ${attendanceText}，老师正在记录课堂表现`
      : latestMoodAvg !== undefined && latestMoodAvg >= 3.5 && profile.overview.attendanceRate === 100
        ? '孩子最近状态很棒 🌟 课堂投入、出勤满勤'
        : moodDelta !== null && moodDelta >= 0.5
          ? '孩子最近在进步 📈 课堂状态持续向好'
          : moodDelta !== null && moodDelta <= -0.5
            ? '最近状态有些波动，建议和老师聊聊 💬'
            : `${profile.identity.name} 本期出勤 ${attendanceText}，老师正在记录课堂表现`
    : ''

  return (
    <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 860, margin: '0 auto', padding: '0 4px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div><Title level={4} style={{ margin: 0 }}>成长主页</Title><Text type="secondary" style={{ fontSize: 13 }}>记录孩子每一次成长的足迹</Text></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {children.length > 1 && <Select size="small" value={studentId} onChange={setStudentId} style={{ minWidth: 100 }} options={children.map((c: { name: string; id: string }) => ({ label: c.name, value: c.id }))} />}
          <Select size="small" value={months} onChange={setMonths} style={{ width: 90 }} options={[{ label:'近1个月',value:1},{ label:'近3个月',value:3},{ label:'近6个月',value:6},{ label:'近12个月',value:12}]} />
        </div>
      </div>
      {loadingMask}
      {!profile && !isLoading && <Card bordered={false} style={{ borderRadius: 14, textAlign: 'center', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="该学员暂无档案数据，老师更新学情后将在此展示" image={Empty.PRESENTED_IMAGE_SIMPLE} /></Card>}

      {profile && (<>
        {/* Identity and compact metrics */}
        <Card bordered={false} className="parent-growth-overview">
          <div className="parent-growth-identity">
            <div>
              <Text strong style={{ fontSize: 20 }}>{profile.identity.name}</Text>
              <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                {profile.identity.grade && <Tag style={{ borderRadius: 9999, fontSize: 11 }}>{profile.identity.grade}</Tag>}
                {profile.identity.mainTeacher && <Tag color="orange" style={{ borderRadius: 9999, fontSize: 11 }}>{profile.identity.mainTeacher} 老师</Tag>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>累计课时</Text>
              <div><Text strong style={{ fontSize: 20, color: '#E8784A' }}>{profile.identity.totalHours}</Text><Text type="secondary" style={{ fontSize: 12 }}>h</Text></div>
            </div>
          </div>
          <div className="parent-growth-metrics">
            {[
              { label: '出勤', value: attendanceText, empty: profile.overview.attendanceRate === null, color: '#1D9E75', icon: <CheckCircleOutlined /> },
              { label: '试卷', value: profile.overview.paperCount > 0 ? `${profile.overview.paperCount} 份` : '暂无', empty: profile.overview.paperCount === 0, color: '#534AB7', icon: <FileTextOutlined /> },
              { label: '徽章', value: profile.overview.badgeCount > 0 ? `${profile.overview.badgeCount} 枚` : '暂无', empty: profile.overview.badgeCount === 0, color: '#EF9F27', icon: <TrophyOutlined /> },
            ].map(item => (
              <div key={item.label} className={`parent-growth-metric${item.empty ? ' is-empty' : ''}`}>
                <span style={{ color: item.empty ? '#98A2B3' : item.color }}>{item.icon}</span>
                <div><Text type="secondary">{item.label}</Text><Text strong style={{ color: item.empty ? '#98A2B3' : item.color }}>{item.value}</Text></div>
              </div>
            ))}
          </div>
        </Card>

        {/* Parent-facing status conclusion */}
        <Card bordered={false} className="parent-growth-status">
          <Text strong className="parent-growth-status-title">{statusSummary}</Text>
          <Text type="secondary" className="parent-growth-status-meta">
            出勤 {attendanceText} · 表扬 {highlights?.praiseCount || 0} 次 · 徽章 {highlights?.badgeTotal || 0} 枚
          </Text>
        </Card>

        {/* Latest teacher update: one clear source of truth */}
        {latestTeacherUpdate && <Card bordered={false} className="parent-growth-latest" onClick={() => handleTimelineClick(latestTeacherUpdate)}>
          <div className="parent-growth-section-head">
            <div><MessageOutlined /><Text strong>老师最近说</Text></div>
            <Text type="secondary">{fmtDate(latestTeacherUpdate.date)}</Text>
          </div>
          <Paragraph ellipsis={{ rows: 3 }} className="parent-growth-latest-copy">{latestTeacherUpdate.sub || latestTeacherUpdate.title}</Paragraph>
          <div className="parent-growth-latest-meta">
            <Text type="secondary">{formatTeacherLabel(latestTeacherUpdate) || '任课老师'}</Text>
            {latestTeacherUpdate.refType && <Button type="link" size="small" onClick={(event) => { event.stopPropagation(); handleTimelineClick(latestTeacherUpdate) }}>查看详情 <RightOutlined /></Button>}
          </div>
        </Card>}

        {/* Highlights stay compact and only surface meaningful signals */}
        {hasHighlights && highlights && <Card bordered={false} className="parent-growth-highlights">
          <div className="parent-growth-section-head">
            <div><TrophyOutlined /><Text strong>本期亮点</Text></div>
          </div>
          {highlights.topTags.length > 0 && <div className="parent-growth-tags">{highlights.topTags.map(item => <Tag color="orange" key={item.tag}>{item.tag} ×{item.count}</Tag>)}</div>}
          {highlights.badgesByType.length > 0 && <div className="parent-growth-badges">{highlights.badgesByType.map(item => <Tag color="gold" key={item.type}>{item.type} ×{item.count}</Tag>)}</div>}
        </Card>}

        {/* Classroom state is the primary growth visualization. */}
        <Card bordered={false} className="parent-growth-trends">
          <div className="parent-growth-section-head">
            <div><RiseOutlined /><Text strong>课堂状态走向</Text></div>
          </div>
          <div className="parent-growth-primary-trend">
            {moodTrendOption ? <><ReactECharts style={{ width: '100%', height: 220 }} option={moodTrendOption} opts={{ renderer: 'svg' }} /><Text className="parent-growth-trend-reading">{moodTrendText}</Text></> : <Text type="secondary">数据积累中，多上几次课后这里会显示孩子的课堂状态走向</Text>}
          </div>
          <button className="parent-growth-trend-trigger" onClick={() => setTrendOpen(value => !value)} aria-expanded={trendOpen}>
            <span>查看更多趋势</span>
            <span>{trendOpen ? '收起' : '徽章与出勤'} <RightOutlined className={trendOpen ? 'is-open' : ''} /></span>
          </button>
          {trendOpen && <div className="parent-growth-trend-content">
            {profile.growth.badgeCumulative.length > 0 ? <><Text strong>徽章累计</Text><ReactECharts style={{ width: '100%', height: 170 }} option={{
              tooltip: { trigger: 'axis' }, grid: { left: 38, right: 16, top: 18, bottom: 28 },
              xAxis: { type: 'category', data: profile.growth.badgeCumulative.map(point => fmtDate(point.date).replace('月', '/').replace('日', '')), axisLabel: { fontSize: 10, color: '#5a4e3a' } },
              yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 10, color: '#5a4e3a' } },
              series: [{ type: 'line', step: 'end', data: profile.growth.badgeCumulative.map(point => point.total), lineStyle: { color: '#EF9F27', width: 2 }, itemStyle: { color: '#EF9F27' }, areaStyle: { color: 'rgba(239,159,39,.12)' } }],
            }} opts={{ renderer: 'svg' }} /></> : <Text type="secondary">暂无徽章累计数据</Text>}
            {profile.habits.attendanceRate !== null ? <div><Text strong>出勤率</Text><Progress percent={profile.habits.attendanceRate} strokeColor="#1D9E75" trailColor="rgba(0,0,0,.05)" /></div> : <Text type="secondary">暂无出勤数据</Text>}
          </div>}
        </Card>

        {/* Secondary details stay below the primary story and are collapsed by default. */}
        <Collapse
          className="parent-growth-more"
          items={[{
            key: 'more',
            label: <span><BookOutlined />展开看更多学习详情与成长记录</span>,
            children: (<>
        {/* Optional detail groups only appear when they contain useful data */}
        {(hasStudyData || hasHabitData) && <Collapse className="parent-growth-details" ghost size="small" activeKey={[...(studyOpen ? ['study'] : []), ...(habitOpen ? ['habit'] : [])]} onChange={k => { setStudyOpen(k.includes('study')); setHabitOpen(k.includes('habit')) }}
          items={[
            ...(hasStudyData ? [{
              key: 'study', label: (<span><BookOutlined style={{ color: '#1D9E75', marginRight: 6 }} />学 · 知识掌握{profile.study.mastery.total > 0 ? ` · 掌握${profile.study.mastery.masteredPct}%` : ' · 暂无数据'}{profile.study.weaknesses.length > 0 ? ` · ${profile.study.weaknesses.length}项薄弱` : ''}</span>),
              children: (
                <div>
                  {profile.study.mastery.total > 0 ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                        {profile.study.mastery.masteredPct > 0 && <div title={`已掌握 ${profile.study.mastery.masteredPct}%`} style={{ width: `${profile.study.mastery.masteredPct}%`, background: '#1D9E75' }} />}
                        {profile.study.mastery.reviewPct > 0 && <div title={`需复习 ${profile.study.mastery.reviewPct}%`} style={{ width: `${profile.study.mastery.reviewPct}%`, background: '#EF9F27' }} />}
                        {profile.study.mastery.weakPct > 0 && <div title={`薄弱 ${profile.study.mastery.weakPct}%`} style={{ width: `${profile.study.mastery.weakPct}%`, background: '#E24B4A' }} />}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>{['已掌握','需复习','薄弱'].map((l,i) => <span key={l}><span style={{display:'inline-block',width:6,height:6,borderRadius:3,background:['#1D9E75','#EF9F27','#E24B4A'][i],marginRight:4}}/>{l} {[profile.study.mastery.masteredPct,profile.study.mastery.reviewPct,profile.study.mastery.weakPct][i]}%</span>)}</div>
                    </div>
                  ) : <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>老师批改试卷后将显示知识掌握情况</Text>}
                  {profile.study.weaknesses.length > 0 && (
                    <div style={{ marginBottom: 8 }}><Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>薄弱知识点</Text>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{profile.study.weaknesses.map((w, i) => <Tag key={i} color={w.mistakeCount >= 3 ? 'red' : 'orange'} style={{ borderRadius: 9999, fontSize: 11 }}>{w.topic}{w.mistakeCount > 1 && ` ×${w.mistakeCount}`}</Tag>)}</div>
                    </div>)}
                  {profile.study.radar.length > 0 && <div style={{ maxWidth: 280, margin: '0 auto' }}><ReactECharts style={{ height: 170 }} option={{ radar: { indicator: profile.study.radar.map(d => ({ name: d.dimension, max: d.maxScore })), center: ['50%','50%'], radius: '60%', splitArea: { areaStyle: { color: ['#faf8f5','#fff'] } }, axisName: { fontSize: 9, color: '#5a4e3a' } }, series: [{ type: 'radar', data: [{ value: profile.study.radar.map(d => d.score), name: '能力', areaStyle: { color: 'rgba(29,158,117,.12)' }, lineStyle: { color: '#1D9E75' }, itemStyle: { color: '#1D9E75' } }] }] }} opts={{ renderer: 'svg' }} /></div>}
                </div>),
            }] : []),
            ...(hasHabitData ? [{
              key: 'habit', label: (<span><DashboardOutlined style={{ color: '#E8784A', marginRight: 6 }} />习 · 课堂状态{profile.habits.attendanceRate !== null ? ` · 出勤${profile.habits.attendanceRate}%` : ''}{profile.habits.homeworkDoneRate !== null ? ` · 作业${profile.habits.homeworkDoneRate}%` : ''}{profile.habits.inClassAvg !== null ? ` · 表现${profile.habits.inClassAvg}` : ''}{!profile.habits.attendanceRate && !profile.habits.homeworkDoneRate && !profile.habits.inClassAvg ? ' · 暂无数据' : ''}</span>),
              children: (
                <div>
                  {profile.habits.moodTimeline.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      {profile.habits.moodTimeline.map((m, i) => <span key={i} title={m.mood ?? undefined} style={{ fontSize: 18, lineHeight: 1 }}>{MOOD_EMOJI[m.mood ?? ''] || '🙂'}</span>)}
                      <Text type="secondary" style={{ fontSize: 11 }}>近期课堂情绪</Text>
                    </div>) : <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>老师发布课堂反馈后将显示情绪记录</Text>}
                </div>),
            }] : []),
          ]}
        />}

        {/* Parent-friendly growth history */}
        <section className="parent-growth-history">
          <div className="parent-growth-history-head">
            <div><Text strong>成长记录</Text><Text type="secondary">按时间回看孩子的学习变化</Text></div>
            <div className="parent-growth-filters" role="group" aria-label="成长记录筛选">
              {FILTER_CHIPS.map(c => (
                <button key={c.key} aria-pressed={timeFilter === c.key} onClick={() => { setTimeFilter(c.key); setShowAllTimeline(false) }}>{c.label}</button>
              ))}
            </div>
          </div>
          {(() => {
            const filtered = profile.record.timeline
              .filter(item => item !== latestTeacherUpdate)
              .filter(item => !timeFilter || FILTER_CHIPS.find(c => c.key === timeFilter)?.types?.includes(item.type))
            const visible = showAllTimeline ? filtered : filtered.slice(0, isMobile ? 6 : 10)
            return filtered.length > 0 ? <>
              <div className="parent-growth-history-list">
                {visible.map((item, i) => {
                  const key = timelineKey(item, i)
                  const isFocused = (feedbackId && item.refId === feedbackId) || (postId && item.refId === postId) || (focusDate && localDateKey(item.date) === focusDate)
                  return (
                  <article key={key} ref={(node) => { timelineRefs.current[key] = node }} onClick={() => handleTimelineClick(item)} className={`parent-growth-history-item${isFocused ? ' is-focused' : ''}${(item.images?.length || item.refType) ? ' is-clickable' : ''}`}>
                    <div className="parent-growth-history-icon" style={{ color: TYPE_COLOR[item.type], background: `${TYPE_COLOR[item.type]}12` }}>{TYPE_ICON[item.type]}</div>
                    <div className="parent-growth-history-body">
                      <div className="parent-growth-history-title">
                        <div><Text strong>{item.title}</Text><Tag>{TIMELINE_LABEL[item.type] || '记录'}</Tag></div>
                        <Text type="secondary">{fmtDate(item.date)}</Text>
                      </div>
                      {item.teacher && <Text type="secondary" className="parent-growth-history-teacher">{formatTeacherLabel(item)}</Text>}
                      {item.sub && <Paragraph ellipsis={{ rows: 2 }} className="parent-growth-history-copy">{item.sub}</Paragraph>}
                      {(() => { const imgs = item.images as string[] | undefined; return imgs && imgs.length > 0 })() && (
                        <div className="parent-growth-history-images">
                          {(item.images as string[]).slice(0, 3).map((url: string, j: number) => (
                            <img key={j} src={url} alt="课堂记录" />
                          ))}
                          {(item.images as string[]).length > 3 && <span style={{ fontSize: 11, color: '#98A2B3', alignSelf: 'center' }}>+{(item.images as string[]).length - 3}张</span>}
                        </div>
                      )}
                    </div>
                    {(item.images?.length || item.refType) && <RightOutlined className="parent-growth-history-arrow" />}
                  </article>
                )})}
              </div>
              {filtered.length > visible.length && <Button type="text" block className="parent-growth-show-more" onClick={() => setShowAllTimeline(true)}>查看全部 {filtered.length} 条记录</Button>}
            </> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这个分类暂时还没有记录" />
          })()}
        </section>

        {/* Trend chart */}
        {profile.record.trendBySubject.length > 0 && (
          <Card bordered={false} style={{ borderRadius: 14, marginTop: 16, border: '1px solid rgba(0,0,0,.06)', padding: '12px 0' }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}><RiseOutlined style={{ color: '#534AB7', marginRight: 6 }} />档 · 成绩趋势</Text>
            <ReactECharts style={{ height: 200 }} option={{
              tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontSize: 10 } },
              grid: { left: 40, right: 20, top: 20, bottom: 30 },
              xAxis: { type: 'time', axisLabel: { fontSize: 9, formatter: '{MM}-{dd}' } },
              yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 9, formatter: '{value}%' } },
              series: profile.record.trendBySubject.map((subj, idx) => ({ name: subj.subject, type: 'line', smooth: true, data: subj.points.map(p => [p.date, p.pct]), symbol: 'circle', symbolSize: 3, lineStyle: { width: 2 }, color: ['#1D9E75','#E8784A','#534AB7','#EF9F27'][idx % 4] })),
            }} opts={{ renderer: 'svg' }} />
          </Card>
        )}

        {/* Goals and teacher summary only surface when there is actual content */}
        {(profile.profileCase.goals.length > 0 || profile.profileCase.teacherSummary) && <Card bordered={false} className="parent-growth-summary">
          <Text strong className="parent-growth-summary-title"><FlagOutlined />老师寄语与学习目标</Text>
          {profile.profileCase.goals.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {profile.profileCase.goals.map((g, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                    <Text style={{ fontSize: 12 }}>{g.goalDesc}</Text>
                    <Tag color={g.isAchieved ? 'green' : 'blue'} style={{ borderRadius: 9999, fontSize: 10 }}>{g.isAchieved ? '已达成' : '进行中'}</Tag>
                  </div>
                  <Progress percent={g.isAchieved ? 100 : 30} showInfo={false} strokeColor={g.isAchieved ? '#1D9E75' : '#E8784A'} trailColor="rgba(0,0,0,.05)" size="small" />
                  <Text type="secondary" style={{ fontSize: 10 }}>{g.subject}</Text>
                </div>
              ))}
            </div>)}
          {profile.profileCase.teacherSummary && <div style={{ padding: '10px 14px', background: '#faf8f5', borderRadius: 12, border: '1px solid rgba(0,0,0,.04)' }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>教师寄语</Text>
              <div>
                <Tag color="purple" style={{ borderRadius: 9999, marginBottom: 6, fontSize: 10 }}>{profile.profileCase.teacherSummary.teacherName || '老师'}{profile.profileCase.teacherSummary.teacherSubject ? ` · ${profile.profileCase.teacherSummary.teacherSubject}` : ''} · {fmtDate(profile.profileCase.teacherSummary.periodStart)} 至 {fmtDate(profile.profileCase.teacherSummary.periodEnd)}</Tag>
                <Paragraph type="secondary" style={{ fontSize: 12, margin: 0, whiteSpace: 'pre-wrap' }}>{profile.profileCase.teacherSummary.summary}</Paragraph>
                {profile.profileCase.teacherSummary.suggestions && <Paragraph type="secondary" style={{ fontSize: 12, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>下一步建议：{profile.profileCase.teacherSummary.suggestions}</Paragraph>}
              </div>
          </div>}
        </Card>}
            </>),
          }]}
        />

        {/* Report button */}
        <div className="parent-growth-report-action">
          <Button type="primary" size="large" icon={<FileTextOutlined />} onClick={() => setReportOpen(true)}
            style={{ borderRadius: 10, background: '#E8784A', border: 'none', padding: '10px 28px', fontSize: 14, height: 'auto' }}>
            查看本期学情报告
          </Button>
        </div>
      </>)}

      {/* Image detail Modal */}
      <Modal open={!!detailItem} onCancel={() => setDetailItem(null)} footer={null} width="min(560px, 92vw)" title={detailItem?.title || '详情'}>
        {detailItem && (
          <div>
            {detailItem.images?.length > 0 && <Image.PreviewGroup><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>{detailItem.images.map((url: string, i: number) => <Image key={i} src={url} alt="" style={{ borderRadius: 8, objectFit: 'cover', width: '100%', height: 120 }} />)}</div></Image.PreviewGroup>}
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{detailItem.sub || detailItem.content}</Paragraph>
            {detailItem.teacher && <Tag style={{ borderRadius: 9999, marginTop: 4 }}>{formatTeacherLabel(detailItem)}</Tag>}
            {detailItem.date && <div style={{ marginTop: 8 }}><Text type="secondary" style={{ fontSize: 11 }}>{fmtDateTime(detailItem.date)}</Text></div>}
            {detailItem.refType === 'paper' && detailItem.refId && <Button type="link" onClick={() => { setDetailItem(null); router.push(`/parent/archive?paperId=${detailItem.refId}`) }} style={{ padding: 0, marginTop: 8 }}>查看试卷详情</Button>}
            {detailItem.refType === 'post' && detailItem.refId && <Button type="link" onClick={() => { setDetailItem(null); router.push(`/parent/archive?postId=${detailItem.refId}`) }} style={{ padding: 0, marginTop: 8 }}>查看成长动态详情</Button>}
          </div>
        )}
      </Modal>

      {/* C1+C2: Expanded report Modal with PDF download */}
      <Modal open={reportOpen} onCancel={() => setReportOpen(false)} width="min(650px, 92vw)" title="本期学情报告"
        footer={<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => setReportOpen(false)}>关闭</Button>
          <Button type="primary" icon={<DownloadOutlined />} loading={downloading} onClick={downloadReport} style={{ background: '#E8784A', border: 'none' }}>下载 PDF</Button>
        </div>}>
        {profile && (
          <div ref={reportRef} style={{ padding: 16, background: '#ffffff', color: '#1F2329', fontFamily: 'sans-serif' }}>
            {/* C1: Report header */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#E8784A', marginBottom: 4 }}>{profile.identity.name} · 学情报告</div>
              <div style={{ fontSize: 12, color: '#7A869A' }}>
                {profile.identity.grade || ''} {profile.identity.school || ''} · 近 {months} 个月
                {profile.identity.mainTeacher && ` · 主教师：${profile.identity.mainTeacher}`}
              </div>
            </div>

            {/* Four-square */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: '出勤率', value: profile.overview.attendanceRate !== null ? `${profile.overview.attendanceRate}%` : '—' },
                { label: '本期试卷', value: `${profile.overview.paperCount} 份` },
                { label: '获得徽章', value: `${profile.overview.badgeCount} 枚` },
              ].map(item => (
                <div key={item.label} style={{ padding: 10, borderRadius: 10, background: '#FFFBF7', textAlign: 'center', border: '1px solid #EEE7E1' }}>
                  <div style={{ fontSize: 10, color: '#7A869A', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#E8784A' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Trend chart in report (canvas for PDF capture) */}
            {reportTrendOption && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#534AB7', marginBottom: 6 }}>成绩趋势</div>
                <ReactECharts style={{ height: 180 }} option={reportTrendOption} opts={{ renderer: 'canvas' }} />
              </div>
            )}

            {/* Mastery bar */}
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

            {/* C1: Badges — highlight achievements */}
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

            {/* C1: Recent positive feedback */}
            {(() => {
              const fbItems = profile.record.timeline.filter(t => t.type === 'feedback' || t.type === 'post').slice(0, 5)
              if (!fbItems.length) return null
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#6A5ACD', marginBottom: 6 }}>近期老师反馈</div>
                  {fbItems.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, marginBottom: 6, padding: '6px 10px', background: '#F9F7FF', borderRadius: 8, color: '#4B5563' }}>
                      <div style={{ fontWeight: 600, fontSize: 11, color: '#7A869A', marginBottom: 2 }}>
                        {fmtDate(f.date)} {f.teacher ? `${f.teacher} 老师${f.teacherSubject ? ` · ${f.teacherSubject}` : ''}` : ''}
                      </div>
                      “{f.sub}”
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Weak points */}
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

            {/* Goals + Summary from teacher */}
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
