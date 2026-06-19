'use client'

import { useCallback, useState } from 'react'
import { Card, Empty, Select, Tag, Typography, Progress, Spin } from 'antd'
import {
  FileTextOutlined,
  MessageOutlined,
  HeartOutlined,
  TrophyOutlined,
  RiseOutlined,
  FlagOutlined,
  BookOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { toast } from 'sonner'
import useSWR from 'swr'
import ReactECharts from 'echarts-for-react'
import type { StudentProfile } from '@/lib/student-profile'

const { Title, Text, Paragraph } = Typography

const MOOD_EMOJI: Record<string, string> = {
  GREAT: '😄', GOOD: '🙂', OKAY: '😐', NEEDS_ATTENTION: '😟',
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  paper: <FileTextOutlined />,
  feedback: <MessageOutlined />,
  post: <HeartOutlined />,
  badge: <TrophyOutlined />,
  grade: <RiseOutlined />,
  goal: <FlagOutlined />,
}

const TYPE_COLOR: Record<string, string> = {
  paper: '#E8784A',
  feedback: '#534AB7',
  post: '#E8784A',
  badge: '#EF9F27',
  grade: '#1D9E75',
  goal: '#534AB7',
}

type InitialData = {
  children: { id: string; name: string }[]
  activeStudentId: string | null
  profile: StudentProfile
}

const fetcher = (url: string) => fetch(url).then(async r => {
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || '请求失败')
  return data
})

export function ParentArchiveClient({ initial }: { initial: InitialData }) {
  const [studentId, setStudentId] = useState(initial.activeStudentId || '')
  const [months, setMonths] = useState(3)

  const query = studentId ? `/api/parent/profile?studentId=${studentId}` : null
  const { data, isLoading } = useSWR(query, fetcher, {
    fallbackData: initial.profile && studentId === initial.activeStudentId
      ? { children: initial.children, activeStudentId: initial.activeStudentId, profile: initial.profile }
      : undefined,
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
    onError: () => toast.error('加载档案失败，请刷新重试'),
  })

  const children: { id: string; name: string }[] = data?.children || initial.children
  const profile = data?.profile as StudentProfile | null | undefined

  const handleChildChange = useCallback((id: string) => {
    setStudentId(id)
  }, [])

  if (!initial.children.length) {
    return (
      <Card bordered={false} style={{ borderRadius: 14, textAlign: 'center', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="暂无绑定学员，请联系管理员关联孩子账号" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    )
  }

  const loadingMask = isLoading && (
    <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  )

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 4px' }}>
      {/* ── 顶栏 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>学习档案</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>记录孩子每一次成长的足迹</Text>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {children.length > 1 && (
            <Select
              size="small"
              value={studentId}
              onChange={handleChildChange}
              style={{ minWidth: 100 }}
              options={children.map(c => ({ label: c.name, value: c.id }))}
            />
          )}
          <Select
            size="small"
            value={months}
            onChange={setMonths}
            style={{ width: 90 }}
            options={[
              { label: '近 1 个月', value: 1 },
              { label: '近 3 个月', value: 3 },
              { label: '近 6 个月', value: 6 },
            ]}
          />
        </div>
      </div>

      {loadingMask}

      {!profile && !isLoading && (
        <Card bordered={false} style={{ borderRadius: 14, textAlign: 'center', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="该学员暂无档案数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      )}

      {profile && (
        <>
          {/* ── 画像卡 ── */}
          <Card bordered={false} style={{ borderRadius: 14, marginBottom: 16, border: '1px solid rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Text strong style={{ fontSize: 18 }}>{profile.identity.name}</Text>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {profile.identity.grade && <Tag style={{ borderRadius: 9999 }}>{profile.identity.grade}</Tag>}
                  {profile.identity.school && <Tag color="purple" style={{ borderRadius: 9999 }}>{profile.identity.school}</Tag>}
                  {profile.identity.mainTeacher && <Tag color="orange" style={{ borderRadius: 9999 }}>{profile.identity.mainTeacher} 老师</Tag>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>累计课时</Text>
                <div><Text strong style={{ fontSize: 24, color: '#E8784A' }}>{profile.identity.totalHours}</Text><Text type="secondary" style={{ fontSize: 14 }}>h</Text></div>
              </div>
            </div>
            {profile.record.timeline[0] && (
              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 13, maxWidth: 600 }} ellipsis={{ rows: 1 }}>
                最近动态：{profile.record.timeline[0].sub || profile.record.timeline[0].title}
              </Paragraph>
            )}
          </Card>

          {/* ── 本期概览四宫格 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: '出勤率', value: profile.overview.attendanceRate !== null ? `${profile.overview.attendanceRate}%` : '—', color: '#1D9E75', icon: <CheckCircleOutlined /> },
              { label: '累计课时', value: `${profile.overview.totalHours}h`, color: '#E8784A', icon: <BookOutlined /> },
              { label: '本期试卷', value: `${profile.overview.paperCount} 份`, color: '#534AB7', icon: <FileTextOutlined /> },
              { label: '获得徽章', value: `${profile.overview.badgeCount} 枚`, color: '#EF9F27', icon: <TrophyOutlined /> },
            ].map(item => (
              <Card key={item.label} bordered={false} style={{ borderRadius: 14, textAlign: 'center', border: '1px solid rgba(0,0,0,.06)' }}>
                <div style={{ color: item.color, fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                <div><Text strong style={{ fontSize: 22, color: item.color }}>{item.value}</Text></div>
              </Card>
            ))}
          </div>

          {/* ── 学：知识掌握 ── */}
          <SectionCard title="学" subtitle="知识掌握" icon={<BookOutlined />} color="#1D9E75">
            {profile.study.mastery.total > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 6, height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
                  {profile.study.mastery.masteredPct > 0 && <div title={`已掌握 ${profile.study.mastery.masteredPct}%`} style={{ width: `${profile.study.mastery.masteredPct}%`, background: '#1D9E75' }} />}
                  {profile.study.mastery.reviewPct > 0 && <div title={`需复习 ${profile.study.mastery.reviewPct}%`} style={{ width: `${profile.study.mastery.reviewPct}%`, background: '#EF9F27' }} />}
                  {profile.study.mastery.weakPct > 0 && <div title={`薄弱 ${profile.study.mastery.weakPct}%`} style={{ width: `${profile.study.mastery.weakPct}%`, background: '#E24B4A' }} />}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#1D9E75', marginRight: 4 }} />已掌握 {profile.study.mastery.masteredPct}%</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#EF9F27', marginRight: 4 }} />需复习 {profile.study.mastery.reviewPct}%</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#E24B4A', marginRight: 4 }} />薄弱 {profile.study.mastery.weakPct}%</span>
                </div>
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>暂无知识掌握数据</Text>
            )}

            {profile.study.weaknesses.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>薄弱知识点</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {profile.study.weaknesses.map((w, i) => (
                    <Tag key={i} color={w.mistakeCount >= 3 ? 'red' : 'orange'} style={{ borderRadius: 9999, fontSize: 12 }}>
                      {w.topic} {w.mistakeCount > 1 && `×${w.mistakeCount}`}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {profile.study.radar.length > 0 && (
              <div style={{ maxWidth: 320, margin: '0 auto' }}>
                <ReactECharts
                  style={{ height: 200 }}
                  option={{
                    radar: {
                      indicator: profile.study.radar.map(d => ({ name: d.dimension, max: d.maxScore })),
                      center: ['50%', '50%'],
                      radius: '65%',
                      splitArea: { areaStyle: { color: ['#faf8f5', '#fff'] } },
                      axisName: { fontSize: 10, color: '#5a4e3a' },
                    },
                    series: [{
                      type: 'radar',
                      data: [{ value: profile.study.radar.map(d => d.score), name: '能力维度', areaStyle: { color: 'rgba(29,158,117,.15)' }, lineStyle: { color: '#1D9E75' }, itemStyle: { color: '#1D9E75' } }],
                    }],
                  }}
                  opts={{ renderer: 'svg' }}
                />
              </div>
            )}
          </SectionCard>

          {/* ── 习：课堂状态 ── */}
          <SectionCard title="习" subtitle="课堂状态" icon={<DashboardOutlined />} color="#E8784A">
            {profile.habits.moodTimeline.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {profile.habits.moodTimeline.map((m, i) => (
                  <span key={i} title={m.mood ?? undefined} style={{ fontSize: 22, lineHeight: 1 }}>{MOOD_EMOJI[m.mood ?? ''] || '🙂'}</span>
                ))}
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>近期课堂情绪</Text>
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>暂无课堂情绪记录</Text>
            )}
            {profile.record.timeline.filter(t => t.type === 'feedback').slice(0, 1).map(t => (
              <Paragraph key="fb-summary" type="secondary" style={{ fontSize: 13, margin: 0 }}>最近反馈：{t.sub}</Paragraph>
            ))}
          </SectionCard>

          {/* ── 档：成绩趋势 + 时间线 ── */}
          <SectionCard title="档" subtitle="成绩趋势与成长时间线" icon={<RiseOutlined />} color="#534AB7">
            {profile.record.trendBySubject.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <ReactECharts
                  style={{ height: 220 }}
                  option={{
                    tooltip: { trigger: 'axis' },
                    legend: { bottom: 0, textStyle: { fontSize: 11 } },
                    grid: { left: 40, right: 20, top: 20, bottom: 30 },
                    xAxis: { type: 'time', axisLabel: { fontSize: 10, formatter: '{MM}-{dd}' } },
                    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 10, formatter: '{value}%' } },
                    series: profile.record.trendBySubject.map((subj, idx) => ({
                      name: subj.subject,
                      type: 'line',
                      smooth: true,
                      data: subj.points.map(p => [p.date, p.pct]),
                      symbol: 'circle',
                      symbolSize: 4,
                      lineStyle: { width: 2 },
                      color: ['#1D9E75', '#E8784A', '#534AB7', '#EF9F27', '#2476A8'][idx % 5],
                    })),
                  }}
                  opts={{ renderer: 'svg' }}
                />
              </div>
            )}

            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>成长时间线</Text>
            {profile.record.timeline.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {profile.record.timeline.map((item, i) => (
                  <div key={`${item.type}-${i}`} style={{
                    display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,.04)',
                    fontSize: 13,
                  }}>
                    <span style={{
                      flexShrink: 0, width: 28, height: 28, borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${TYPE_COLOR[item.type]}15`, color: TYPE_COLOR[item.type], fontSize: 14,
                    }}>
                      {TYPE_ICON[item.type] || <RiseOutlined />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
                        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{format(new Date(item.date), 'M月d日')}</Text>
                      </div>
                      {item.sub && <Text type="secondary" style={{ fontSize: 12 }}>{item.sub.length > 60 ? item.sub.slice(0, 60) + '...' : item.sub}</Text>}
                      {item.teacher && <Tag style={{ fontSize: 10, marginTop: 2, borderRadius: 9999 }}>{item.teacher} 老师</Tag>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>暂无成长记录</Text>
            )}
          </SectionCard>

          {/* ── 案：目标 + 寄语 ── */}
          <SectionCard title="案" subtitle="学习目标与教师寄语" icon={<FlagOutlined />} color="#EF9F27">
            {profile.profileCase.goals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {profile.profileCase.goals.map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 13 }}>{g.goalDesc}</Text>
                      <Tag color={g.isAchieved ? 'green' : 'blue'} style={{ borderRadius: 9999, fontSize: 11 }}>{g.isAchieved ? '已达成' : '进行中'}</Tag>
                    </div>
                    <Progress
                      percent={g.isAchieved ? 100 : g.deadline ? Math.min(80, Math.round(60)) : 30}
                      showInfo={false}
                      strokeColor={g.isAchieved ? '#1D9E75' : '#E8784A'}
                      trailColor="rgba(0,0,0,.05)"
                      size="small"
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>{g.subject}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>暂无学习目标</Text>
            )}

            <div style={{ padding: '12px 16px', background: '#faf8f5', borderRadius: 12, border: '1px solid rgba(0,0,0,.04)' }}>
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>教师寄语</Text>
              {profile.profileCase.teacherSummary ? (
                <div>
                  <Tag color="purple" style={{ borderRadius: 9999, marginBottom: 8 }}>
                    {profile.profileCase.teacherSummary.teacherName || '老师'} · {format(new Date(profile.profileCase.teacherSummary.periodStart), 'M月d日')} 至 {format(new Date(profile.profileCase.teacherSummary.periodEnd), 'M月d日')}
                  </Tag>
                  <Paragraph type="secondary" style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {profile.profileCase.teacherSummary.summary}
                  </Paragraph>
                  {profile.profileCase.teacherSummary.suggestions && (
                    <Paragraph type="secondary" style={{ fontSize: 13, margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                      下一步建议：{profile.profileCase.teacherSummary.suggestions}
                    </Paragraph>
                  )}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>老师正在撰写本期寄语</Text>
              )}
            </div>
          </SectionCard>

          {/* ── 底部按钮 ── */}
          <div style={{ textAlign: 'center', margin: '24px 0 60px' }}>
            <button
              disabled
              style={{
                padding: '10px 28px', borderRadius: 10, border: '1px solid rgba(0,0,0,.1)',
                background: '#faf8f5', color: '#9a8e7a', fontSize: 14, cursor: 'not-allowed',
              }}
            >
              查看 / 下载本月学情报告（即将上线）
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function SectionCard({ title, subtitle, icon, color, children }: {
  title: string; subtitle: string; icon: React.ReactNode; color: string; children: React.ReactNode
}) {
  return (
    <Card bordered={false} style={{ borderRadius: 14, marginBottom: 16, border: '1px solid rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color, fontSize: 18 }}>{icon}</span>
        <span style={{ color, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{title}</span>
        <Text type="secondary" style={{ fontSize: 13 }}>{subtitle}</Text>
      </div>
      {children}
    </Card>
  )
}
