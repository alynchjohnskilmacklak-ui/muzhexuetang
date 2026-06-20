'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, Empty, Select, Tag, Typography, Progress, Spin, Modal, Image, Button, Collapse } from 'antd'
import {
  FileTextOutlined, MessageOutlined, HeartOutlined, TrophyOutlined,
  RiseOutlined, FlagOutlined, BookOutlined, CheckCircleOutlined,
  DashboardOutlined, DownloadOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { toast } from 'sonner'
import useSWR from 'swr'
import ReactECharts from 'echarts-for-react'
import { useRouter } from 'next/navigation'
import type { StudentProfile } from '@/lib/student-profile'

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
const TIMELINE_SOURCE: Record<string, { label: string; color: string }> = {
  paper: { label: '试卷模块 → 学', color: '#0F6E56' },
  feedback: { label: '课堂反馈 → 习', color: '#854F0B' },
  post: { label: '成长反馈 → 档', color: '#3C3489' },
  badge: { label: '成长反馈 → 案', color: '#854F0B' },
  grade: { label: '成绩录入 → 档', color: '#993C1D' },
  goal: { label: '学习目标 → 案', color: '#3C3489' },
}

const FILTER_CHIPS = [
  { key: '', label: '全部' },
  { key: 'study', label: '学', types: ['paper'] },
  { key: 'habit', label: '习', types: ['feedback'] },
  { key: 'record', label: '档', types: ['post', 'grade'] },
  { key: 'case', label: '案', types: ['badge', 'goal'] },
]

type InitialData = { children: { id: string; name: string }[]; activeStudentId: string | null; profile: StudentProfile }
const fetcher = (url: string) => fetch(url).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || '请求失败'); return d })

function formatTeacherLabel(item?: { teacher?: string; teacherSubject?: string }) {
  if (!item?.teacher) return ''
  return `${item.teacher} 老师${item.teacherSubject ? ` · ${item.teacherSubject}` : ''}`
}

/** Compute trend arrow from subject trend data */
function trendArrow(points: { pct: number }[]): string {
  if (points.length < 2) return ''
  const first = points[0]?.pct ?? 0, last = points[points.length - 1]?.pct ?? 0
  const diff = last - first
  if (diff >= 5) return `↑${diff}`
  if (diff <= -5) return `↓${Math.abs(diff)}`
  return ''
}

export function ParentArchiveClient({ initial }: { initial: InitialData }) {
  const router = useRouter()
  const reportRef = useRef<HTMLDivElement>(null)
  const [studentId, setStudentId] = useState(initial.activeStudentId || '')
  const [months, setMonths] = useState(6)
  const [timeFilter, setTimeFilter] = useState('')
  const [studyOpen, setStudyOpen] = useState(false)
  const [habitOpen, setHabitOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [detailItem, setDetailItem] = useState<any>(null)

  const query = studentId ? `/api/parent/profile?studentId=${studentId}&months=${months}` : null
  const { data, isLoading } = useSWR(query, fetcher, {
    fallbackData: initial.profile && studentId === initial.activeStudentId ? { children: initial.children, activeStudentId: initial.activeStudentId, profile: initial.profile } : undefined,
    revalidateOnFocus: true, dedupingInterval: 30_000,
    onError: () => toast.error('加载档案失败，请刷新重试'),
  })

  const children = data?.children || initial.children
  const profile = data?.profile as StudentProfile | null | undefined

  const handleTimelineClick = (item: any) => {
    if (item.images?.length) { setDetailItem(item); return }
    if (item.refType === 'feedback' && item.refId) { router.push(`/parent/class-feedback/${item.refId}`); return }
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

  // Trend arrows for recent activity
  const trendSignals = profile?.record.trendBySubject.map(s => ({
    subject: s.subject,
    arrow: trendArrow(s.points as { pct: number }[]),
  })).filter(s => s.arrow) || []

  const reportTrendOption = profile?.record.trendBySubject.length ? {
    tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontSize: 9, color: '#333' } },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'time' as const, axisLabel: { fontSize: 8, formatter: '{MM}-{dd}', color: '#333' } },
    yAxis: { type: 'value' as const, min: 0, max: 100, axisLabel: { fontSize: 8, formatter: '{value}%', color: '#333' } },
    series: profile.record.trendBySubject.map((subj, idx) => ({ name: subj.subject, type: 'line' as const, smooth: true, data: subj.points.map(p => [p.date, p.pct]), symbol: 'circle' as const, symbolSize: 3, lineStyle: { width: 2 }, color: ['#1D9E75','#E8784A','#534AB7','#EF9F27'][idx % 4] })),
  } : null

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 4px' }}>
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
        {/* Portrait card */}
        <Card bordered={false} style={{ borderRadius: 14, marginBottom: 12, border: '1px solid rgba(0,0,0,.06)', padding: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <Text strong style={{ fontSize: 16 }}>{profile.identity.name}</Text>
              <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                {profile.identity.grade && <Tag style={{ borderRadius: 9999, fontSize: 11 }}>{profile.identity.grade}</Tag>}
                {profile.identity.school && <Tag color="purple" style={{ borderRadius: 9999, fontSize: 11 }}>{profile.identity.school}</Tag>}
                {profile.identity.mainTeacher && <Tag color="orange" style={{ borderRadius: 9999, fontSize: 11 }}>{profile.identity.mainTeacher} 老师</Tag>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>累计课时</Text>
              <div><Text strong style={{ fontSize: 20, color: '#E8784A' }}>{profile.identity.totalHours}</Text><Text type="secondary" style={{ fontSize: 12 }}>h</Text></div>
            </div>
          </div>
          {/* D1: Recent activity with trend arrow */}
          {profile.record.timeline[0] && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>最近动态：</Text>
              <Text style={{ fontSize: 12 }}>{profile.record.timeline[0].sub || profile.record.timeline[0].title}</Text>
              {trendSignals.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#1D9E75', fontWeight: 600 }}>
                  {trendSignals.map((s, i) => <span key={i}>{s.subject} {s.arrow.replace('↑','↑ ').replace('↓','↓ ')}{i < trendSignals.length - 1 ? ' · ' : ''}</span>)}
                </span>
              )}
            </div>
          )}
        </Card>

        {/* Four-square overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 8, marginBottom: 10 }}>
          {[
            { label: '出勤率', value: profile.overview.attendanceRate !== null ? `${profile.overview.attendanceRate}%` : '—', color: '#1D9E75', icon: <CheckCircleOutlined /> },
            { label: '本期试卷', value: `${profile.overview.paperCount} 份`, color: '#534AB7', icon: <FileTextOutlined />, emptyNote: '老师批改试卷后将更新' },
            { label: '获得徽章', value: `${profile.overview.badgeCount} 枚`, color: '#EF9F27', icon: <TrophyOutlined />, emptyNote: '老师评价后可获徽章' },
          ].map(item => (
            <Card key={item.label} bordered={false} style={{ borderRadius: 10, textAlign: 'center', border: '1px solid rgba(0,0,0,.06)', padding: '4px 0' }}>
              <div style={{ color: item.color, fontSize: 14, marginBottom: 1 }}>{item.icon}</div>
              <Text type="secondary" style={{ fontSize: 11 }}>{item.label}</Text>
              <div><Text strong style={{ fontSize: 18, color: item.color }}>{item.value}</Text></div>
              {'emptyNote' in item && profile.overview.paperCount === 0 && <div style={{ fontSize: 10, color: '#B0B8C1', marginTop: 2 }}>{(item as { emptyNote?: string }).emptyNote}</div>}
            </Card>
          ))}
        </div>

        {/* D1: Collapsed study/habit with key values */}
        <Collapse ghost size="small" activeKey={[...(studyOpen ? ['study'] : []), ...(habitOpen ? ['habit'] : [])]} onChange={k => { setStudyOpen(k.includes('study')); setHabitOpen(k.includes('habit')) }}
          items={[
            {
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
            },
            {
              key: 'habit', label: (<span><DashboardOutlined style={{ color: '#E8784A', marginRight: 6 }} />习 · 课堂状态{profile.habits.attendanceRate !== null ? ` · 出勤${profile.habits.attendanceRate}%` : ''}{profile.habits.homeworkDoneRate !== null ? ` · 作业${profile.habits.homeworkDoneRate}%` : ''}{profile.habits.inClassAvg !== null ? ` · 表现${profile.habits.inClassAvg}` : ''}{!profile.habits.attendanceRate && !profile.habits.homeworkDoneRate && !profile.habits.inClassAvg ? ' · 暂无数据' : ''}</span>),
              children: (
                <div>
                  {profile.habits.moodTimeline.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      {profile.habits.moodTimeline.map((m, i) => <span key={i} title={m.mood ?? undefined} style={{ fontSize: 18, lineHeight: 1 }}>{MOOD_EMOJI[m.mood ?? ''] || '🙂'}</span>)}
                      <Text type="secondary" style={{ fontSize: 11 }}>近期课堂情绪</Text>
                    </div>) : <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>老师发布课堂反馈后将显示情绪记录</Text>}
                  {profile.record.timeline.filter(t => t.type === 'feedback').slice(0, 1).map(t => <Paragraph key="fb" type="secondary" style={{ fontSize: 12, margin: 0 }}>最近反馈：{t.sub}</Paragraph>)}
                </div>),
            },
          ]}
        />

        {/* D2: Timeline with left color strip + filter chips */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14 }}>成长时间线</Text>
            <div style={{ display: 'flex', gap: 4 }}>
              {FILTER_CHIPS.map(c => (
                <button key={c.key} onClick={() => setTimeFilter(c.key)} style={{
                  padding: '2px 10px', borderRadius: 9999, border: timeFilter === c.key ? '1px solid #E8784A' : '1px solid rgba(0,0,0,.08)',
                  background: timeFilter === c.key ? '#FFF3EC' : '#fff', color: timeFilter === c.key ? '#E8784A' : '#7A869A',
                  fontSize: 11, cursor: 'pointer', fontWeight: timeFilter === c.key ? 600 : 400,
                }}>{c.label}</button>
              ))}
            </div>
          </div>
          {(() => {
            const filtered = profile.record.timeline.filter(item => !timeFilter || FILTER_CHIPS.find(c => c.key === timeFilter)?.types?.includes(item.type))
            return filtered.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filtered.map((item, i) => (
                  <div key={`${item.type}-${i}`} onClick={() => handleTimelineClick(item)} style={{
                    display: 'flex', gap: 0, cursor: (item.images?.length || item.refType) ? 'pointer' : 'default',
                    background: item.type === 'badge' || item.type === 'goal' ? 'rgba(239,159,39,.04)' : 'transparent',
                    borderRadius: 8, overflow: 'hidden',
                  }}>
                    {/* D2: Left color strip */}
                    <div style={{ width: 3, flexShrink: 0, background: TYPE_COLOR[item.type], borderRadius: '3px 0 0 3px', margin: '8px 0' }} />
                    <div style={{ flex: 1, minWidth: 0, padding: '8px 10px 8px 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
                        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{format(new Date(item.date), 'M月d日')}</Text>
                      </div>
                      {item.sub && <Text type="secondary" style={{ fontSize: 12 }}>{item.sub.length > 60 ? item.sub.slice(0, 60) + '...' : item.sub}</Text>}
                      <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                        {item.teacher && <Tag style={{ fontSize: 10, borderRadius: 9999 }}>{formatTeacherLabel(item)}</Tag>}
                        {TIMELINE_SOURCE[item.type] && (
                          <span style={{ fontSize: 10, color: TIMELINE_SOURCE[item.type].color, background: `${TIMELINE_SOURCE[item.type].color}14`, padding: '1px 7px', borderRadius: 9999 }}>
                            {TIMELINE_SOURCE[item.type].label}
                          </span>
                        )}
                      </div>
                      {(() => { const imgs = item.images as string[] | undefined; return imgs && imgs.length > 0 })() && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                          {(item.images as string[]).slice(0, 3).map((url: string, j: number) => (
                            <img key={j} src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(0,0,0,.06)' }} />
                          ))}
                          {(item.images as string[]).length > 3 && <span style={{ fontSize: 11, color: '#98A2B3', alignSelf: 'center' }}>+{(item.images as string[]).length - 3}张</span>}
                        </div>
                      )}
                      {((item.images && item.images.length > 0) || item.refType) && <div style={{ fontSize: 10, color: '#E8784A', marginTop: 4 }}>{item.refType === 'feedback' ? '查看反馈详情 →' : (item.images && item.images.length > 0) ? '查看图片 →' : item.refType ? '查看详情 →' : ''}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <Text type="secondary" style={{ fontSize: 13 }}>暂无成长记录</Text>
          })()}
        </div>

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

        {/* Case: goals + summary */}
        <Card bordered={false} style={{ borderRadius: 14, marginTop: 16, border: '1px solid rgba(0,0,0,.06)', padding: '12px 0' }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}><FlagOutlined style={{ color: '#EF9F27', marginRight: 6 }} />案 · 学习目标与教师寄语</Text>
          {profile.profileCase.goals.length > 0 ? (
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
            </div>
          ) : <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>暂无学习目标，老师设置后将在此展示</Text>}
          <div style={{ padding: '10px 14px', background: '#faf8f5', borderRadius: 12, border: '1px solid rgba(0,0,0,.04)' }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>教师寄语</Text>
            {profile.profileCase.teacherSummary ? (
              <div>
                <Tag color="purple" style={{ borderRadius: 9999, marginBottom: 6, fontSize: 10 }}>{profile.profileCase.teacherSummary.teacherName || '老师'}{profile.profileCase.teacherSummary.teacherSubject ? ` · ${profile.profileCase.teacherSummary.teacherSubject}` : ''} · {format(new Date(profile.profileCase.teacherSummary.periodStart), 'M/d')} 至 {format(new Date(profile.profileCase.teacherSummary.periodEnd), 'M/d')}</Tag>
                <Paragraph type="secondary" style={{ fontSize: 12, margin: 0, whiteSpace: 'pre-wrap' }}>{profile.profileCase.teacherSummary.summary}</Paragraph>
                {profile.profileCase.teacherSummary.suggestions && <Paragraph type="secondary" style={{ fontSize: 12, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>下一步建议：{profile.profileCase.teacherSummary.suggestions}</Paragraph>}
              </div>
            ) : <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>老师正在撰写本期寄语</Text>}
          </div>
        </Card>

        {/* Report button */}
        <div style={{ textAlign: 'center', margin: '24px 0 60px' }}>
          <Button type="primary" size="large" icon={<FileTextOutlined />} onClick={() => setReportOpen(true)}
            style={{ borderRadius: 10, background: '#E8784A', border: 'none', padding: '10px 28px', fontSize: 14, height: 'auto' }}>
            查看本期学情报告
          </Button>
        </div>
      </>)}

      {/* Image detail Modal */}
      <Modal open={!!detailItem} onCancel={() => setDetailItem(null)} footer={null} width={560} title={detailItem?.title || '详情'}>
        {detailItem && (
          <div>
            {detailItem.images?.length > 0 && <Image.PreviewGroup><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>{detailItem.images.map((url: string, i: number) => <Image key={i} src={url} alt="" style={{ borderRadius: 8, objectFit: 'cover', width: '100%', height: 120 }} />)}</div></Image.PreviewGroup>}
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{detailItem.sub || detailItem.content}</Paragraph>
            {detailItem.teacher && <Tag style={{ borderRadius: 9999, marginTop: 4 }}>{formatTeacherLabel(detailItem)}</Tag>}
            {detailItem.date && <div style={{ marginTop: 8 }}><Text type="secondary" style={{ fontSize: 11 }}>{format(new Date(detailItem.date), 'yyyy年M月d日 HH:mm')}</Text></div>}
            {detailItem.refType === 'paper' && detailItem.refId && <Button type="link" onClick={() => { setDetailItem(null); router.push(`/parent/archive?paperId=${detailItem.refId}`) }} style={{ padding: 0, marginTop: 8 }}>查看试卷详情</Button>}
            {detailItem.refType === 'post' && detailItem.refId && <Button type="link" onClick={() => { setDetailItem(null); router.push(`/parent/growth?postId=${detailItem.refId}`) }} style={{ padding: 0, marginTop: 8 }}>查看成长动态详情</Button>}
          </div>
        )}
      </Modal>

      {/* C1+C2: Expanded report Modal with PDF download */}
      <Modal open={reportOpen} onCancel={() => setReportOpen(false)} width={650} title="本期学情报告"
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
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
                      {format(new Date(b.date), 'M月d日')} 获得「{b.title.replace('获得徽章「', '').replace('」', '')}」{b.sub ? ` — ${b.sub}` : ''}
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
                        {format(new Date(f.date), 'M月d日')} {f.teacher ? `${f.teacher} 老师${f.teacherSubject ? ` · ${f.teacherSubject}` : ''}` : ''}
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
