'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Col, List, Progress, Row, Space, Tag, Typography } from 'antd'
import { useRouter } from 'next/navigation'
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  MessageOutlined,
  RobotOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { formatHours, formatPercent } from '@/lib/format'
import { useIsMobile } from '@/hooks/useIsMobile'
import { fillName, resolveTier, TIER_QUICK_PERKS, TIER_THEME, TIER_WELCOME } from '@/constants/teacher-tier'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { PullToRefresh } from '@/components/PullToRefresh'

const { Text } = Typography

type Tone = 'blue' | 'orange' | 'red' | 'green' | 'purple' | 'brown' | 'dark'

interface DashboardTask {
  id: string
  type?: string
  title: string
  description: string
  status?: string
  tone: Tone
  actionLabel: string
  href: string
}

interface DashboardLesson {
  id: string
  time: string
  courseName: string
  groupName: string
  room: string
  studentCount: number
  statusLabel: string
  statusTone: Tone
  hasFeedback: boolean
  lessonId?: string
  feedbackId?: string | null
}

interface StudentWarning {
  id: string
  name: string
  grade: string
  school: string
  type: string
  reason: string
  tone: Tone
  actionLabel: string
  href: string
}

interface CompletionItem {
  done: number
  total: number
  percent: number
}

interface DashboardData {
  teacher: { id: string; name: string; avatar?: string | null; subjects?: string | null; tierLevel?: string | null }
  heroStats: {
    todayLessons: number
    pendingAttendance: number
    pendingFeedback: number
    pendingPapers: number
    pendingLeave: number
    totalTodos: number
  }
  todayLessons: DashboardLesson[]
  todos: DashboardTask[]
  studentWarnings: StudentWarning[]
  feedbackTasks: DashboardTask[]
  weekCompletion: {
    attendance: CompletionItem
    classroomFeedback: CompletionItem
    paperPush: CompletionItem
    performance: CompletionItem
  }
  monthlyStats: { totalStudents: number; monthlyHours: number }
  pendingTasks: { unreadParentComments: number; pendingLeave: number }
  quickActions: Array<{ label: string; desc: string; href: string; tone: Tone }>
}

const toneColor: Record<Tone, string> = {
  blue: '#123C35',
  orange: '#E8784A',
  red: '#D64545',
  green: '#123C35',
  purple: '#8A8F99',
  brown: '#E8784A',
  dark: '#123C35',
}

const tagColor: Record<Tone, string> = {
  blue: '#123C35',
  orange: '#E8784A',
  red: '#D64545',
  green: '#123C35',
  purple: '#8A8F99',
  brown: '#E8784A',
  dark: '#123C35',
}

const quickIcons = [<CheckCircleOutlined key="attendance" />, <CalendarOutlined key="leave" />, <UploadOutlined key="paper" />, <FileDoneOutlined key="classroom" />, <MessageOutlined key="performance" />, <TeamOutlined key="students" />, <RobotOutlined key="ai" />]
const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function dateText() {
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

function CompletionRow({ label, item, color }: { label: string; item: CompletionItem; color: string }) {
  if (!item.total) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span>{label}</span>
          <span style={{ color: '#9A8E7A' }}>暂无任务</span>
        </div>
        <Progress percent={0} showInfo={false} strokeColor={color} trailColor="#F0E7DE" />
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{item.done}/{item.total}（{formatPercent(item.percent)}）</span>
      </div>
      <Progress percent={item.percent} showInfo={false} strokeColor={color} trailColor="#F0E7DE" />
    </div>
  )
}

export default function TeacherDashboardPage() {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const { data, isLoading, mutate } = useSWR<DashboardData>('/api/teacher/dashboard', fetcher, { refreshInterval: 180_000 })
  const [welcomeMounted, setWelcomeMounted] = useState(false)
  const [welcomeVisible, setWelcomeVisible] = useState(false)

  useEffect(() => {
    fetch('/api/teacher/dashboard', { method: 'POST' }).catch((error) =>
      console.warn('教师仪表盘状态同步失败', error)
    )
  }, [])

  useEffect(() => {
    const teacher = data?.teacher
    if (!teacher?.id) return
    const storageKey = `mz_teacher_welcome_${teacher.id}`
    if (window.sessionStorage.getItem(storageKey)) return
    window.sessionStorage.setItem(storageKey, '1')
    setWelcomeMounted(true)
    const showTimer = window.setTimeout(() => setWelcomeVisible(true), 30)
    const fadeTimer = window.setTimeout(() => setWelcomeVisible(false), 8000)
    const unmountTimer = window.setTimeout(() => setWelcomeMounted(false), 8600)
    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(fadeTimer)
      window.clearTimeout(unmountTimer)
    }
  }, [data?.teacher])

  if (isLoading) return <CardSkeleton rows={3} />
  if (!data?.teacher) return <BrandEmpty title="未找到教师信息" icon={<UserOutlined />} />

  const { teacher, heroStats, todayLessons, todos, studentWarnings, feedbackTasks, weekCompletion, monthlyStats, pendingTasks, quickActions } = data
  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]
  const tierWelcome = TIER_WELCOME[tier]
  const heroItems = [
    { label: '今日课次', value: heroStats.todayLessons, color: '#123C35', suffix: '节' },
    { label: '待考勤', value: heroStats.pendingAttendance, color: '#E8784A', suffix: '节' },
    { label: '待发反馈', value: heroStats.pendingFeedback, color: '#E8784A', suffix: '条' },
    { label: '待批请假', value: heroStats.pendingLeave, color: '#E8784A', suffix: '条' },
    { label: '待推送试卷', value: heroStats.pendingPapers, color: '#E8784A', suffix: '份' },
  ]

  return (
    <PullToRefresh onRefresh={async () => { await mutate() }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {welcomeMounted && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? 18 : 24, pointerEvents: 'none',
          background: welcomeVisible ? 'rgba(18,51,38,.10)' : 'rgba(18,51,38,0)',
          backdropFilter: welcomeVisible ? 'blur(6px)' : 'blur(0px)',
          WebkitBackdropFilter: welcomeVisible ? 'blur(6px)' : 'blur(0px)',
          transition: 'background .45s ease, backdrop-filter .45s ease',
        }}>
          <div style={{
            width: 'min(88vw, 430px)', borderRadius: 26,
            padding: isMobile ? '24px 22px' : '28px 30px',
            background: tier === 'SENIOR' ? 'linear-gradient(145deg,#F8F3E7,#FFFDF7)' : tierTheme.bg,
            border: `1.5px solid ${tier === 'SENIOR' ? '#C9A45C' : tierTheme.border}`,
            color: tierTheme.accent,
            boxShadow: tier === 'SENIOR'
              ? '0 26px 80px rgba(18,60,53,.30)'
              : tier === 'EXPERIENCED'
                ? '0 26px 80px rgba(232,120,74,.26)'
                : '0 24px 70px rgba(62,142,110,.20)',
            opacity: welcomeVisible ? 1 : 0,
            transform: welcomeVisible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(.92)',
            transition: 'opacity .45s ease, transform .58s cubic-bezier(.2,.9,.2,1)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', right: -24, top: -28, width: 90, height: 90,
              borderRadius: '50%',
              background: tier === 'SENIOR' ? 'rgba(201,164,92,.18)' : `${tierTheme.accent}18`,
            }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 16, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 900, color: '#fff',
                background: tier === 'SENIOR'
                  ? 'linear-gradient(145deg, #123C35 0%, #C9A45C 150%)'
                  : tier === 'EXPERIENCED'
                    ? 'linear-gradient(145deg, #E8784A 0%, #F8B27F 100%)'
                    : 'linear-gradient(145deg, #3E8E6E 0%, #7ABF9A 100%)',
                boxShadow: tier === 'SENIOR'
                  ? '0 10px 24px rgba(18,60,53,.25)'
                  : `0 10px 24px ${tierTheme.accent}2E`,
              }}>
                {tier === 'SENIOR' ? '师' : tier === 'EXPERIENCED' ? '优' : '新'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 17 : 18, fontWeight: 900, lineHeight: 1.55, color: tierTheme.accent, letterSpacing: .2, overflowWrap: 'anywhere' }}>
                  {fillName(tierWelcome.title, teacher.name)}
                </div>
                <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.9, color: '#5A4E3A', fontWeight: 500 }}>
                  {tierWelcome.body}
                </div>
                <div style={{ marginTop: 12 }}>
                  {TIER_QUICK_PERKS[tier].map((perk) => (
                    <div key={perk} style={{ display: 'flex', gap: 7, fontSize: 13, lineHeight: 1.9, color: '#5A4E3A' }}>
                      <span style={{ color: tier === 'SENIOR' ? '#C9A45C' : tierTheme.accent, fontWeight: 900 }}>✦</span>
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: tier === 'SENIOR' ? '#8A6A2E' : tierTheme.accent, fontWeight: 700 }}>
                  完整福利见 侧栏「我的福利」
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <section style={{ background: '#123326', borderRadius: 12, padding: isMobile ? 16 : '26px 30px', color: '#fff', maxWidth: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, opacity: 0.72 }}>{dateText()}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, lineHeight: 1.3, letterSpacing: 0 }}>{teacher.name}老师，{getGreeting()}</h1>
              <span style={{ background: 'rgba(255,255,255,.14)', color: '#fff', border: '1px solid rgba(255,255,255,.35)', borderRadius: 999, fontSize: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                {tier === 'SENIOR' && <span style={{ color: '#C9A45C', marginRight: 3 }}>★</span>}
                {tierTheme.label}
              </span>
            </div>
            <div style={{ fontSize: 14, opacity: 0.86, lineHeight: 1.8 }}>
              今日共有 {heroStats.todayLessons} 节课，{heroStats.pendingAttendance} 节待考勤，{heroStats.totalTodos} 条待处理事项
            </div>
            <div style={{ fontSize: 13, opacity: 0.72, marginTop: 10 }}>认真记录每一堂课，让孩子的成长被看见。</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(96px, 1fr))', gap: 10, flex: '1 1 460px', width: '100%', minWidth: 0 }}>
            {heroItems.map((item) => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,.94)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 10, padding: 14 }}>
                <div style={{ color: item.color, fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {item.value}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 2 }}>{item.suffix}</span>
                </div>
                <div style={{ fontSize: 12, color: '#5A4E3A', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card bordered={false} title="今日待办" style={{ borderRadius: 12, marginBottom: 16 }}>
            {todos.length ? (
              <List
                dataSource={todos}
                renderItem={(item, index) => (
                  <List.Item
                    className="stagger-item"
                    actions={isMobile ? undefined : [<Button key="action" size="small" type="link" onClick={() => router.push(item.href)}>{item.actionLabel}</Button>]}
                    style={{ padding: '12px 0', animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <List.Item.Meta
                      avatar={<div style={{ width: 4, height: 42, borderRadius: 4, background: toneColor[item.tone] }} />}
                      title={<Space wrap><Text strong>{item.title}</Text>{item.status && <Tag color={tagColor[item.tone]}>{item.status}</Tag>}</Space>}
                      description={<span style={{ color: '#8D806F' }}>{item.description}</span>}
                    />
                    {isMobile && <Button size="small" type="link" onClick={() => router.push(item.href)} style={{ paddingLeft: 0 }}>{item.actionLabel}</Button>}
                  </List.Item>
                )}
              />
            ) : (
              <BrandEmpty title="今日暂无待办" hint="可以整理课堂反馈、上传试卷或查看学生学习情况" icon={<CheckCircleOutlined />} />
            )}
          </Card>

          <Card bordered={false} title="今日课程时间线" style={{ borderRadius: 12, marginBottom: 16 }}>
            {todayLessons.length ? (
              <List
                dataSource={todayLessons}
                renderItem={(lesson, index) => (
                  <List.Item className="stagger-item" style={{ padding: '14px 0', animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '92px 1fr auto', width: '100%', gap: isMobile ? 8 : 14, alignItems: 'center', minWidth: 0 }}>
                      <div style={{ color: toneColor[lesson.statusTone], fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{lesson.time}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1F2329' }}>{lesson.courseName} · {lesson.groupName}</div>
                        <div style={{ fontSize: 12, color: '#8D806F', marginTop: 3 }}>
                          <CalendarOutlined /> {lesson.room} · <UserOutlined /> {lesson.studentCount}人 · {lesson.hasFeedback ? '已发反馈' : '未发反馈'}
                        </div>
                      </div>
                      <Space wrap style={{ width: isMobile ? '100%' : undefined, flexWrap: 'wrap' }}>
                        <Tag color={tagColor[lesson.statusTone]}>{lesson.statusLabel}</Tag>
                        <Button
                          size="small"
                          onClick={() => {
                            if (lesson.statusLabel === '待考勤') {
                              router.push('/teacher/attendance')
                              return
                            }
                            if (lesson.hasFeedback && lesson.feedbackId) {
                              router.push(`/teacher/classroom-feedback?viewId=${lesson.feedbackId}`)
                              return
                            }
                            router.push(lesson.lessonId ? `/teacher/classroom-feedback?lessonId=${lesson.lessonId}` : '/teacher/classroom-feedback')
                          }}
                        >
                          {lesson.statusLabel === '待考勤' ? '考勤' : lesson.hasFeedback ? '查看' : '反馈'}
                        </Button>
                      </Space>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div>
                <BrandEmpty title="今日暂无课程" hint="可以整理课堂反馈、上传试卷或查看学生学习情况" icon={<CalendarOutlined />} />
                <Space wrap style={{ marginTop: 12 }}>
                  <Button onClick={() => router.push('/teacher/students')}>查看我的学生</Button>
                  <Button onClick={() => router.push('/teacher/papers')}>上传试卷</Button>
                  <Button onClick={() => router.push('/teacher/classroom-feedback')}>发布课堂反馈</Button>
                </Space>
              </div>
            )}
          </Card>

          <Card bordered={false} title="重点学生预警" style={{ borderRadius: 12 }}>
            {studentWarnings.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {studentWarnings.map((item, index) => (
                  <div className="stagger-item" key={item.id} style={{ border: '1px solid #F0E7DE', borderLeft: `4px solid ${toneColor[item.tone]}`, borderRadius: 10, padding: 12, background: '#FFFDFC', animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text strong>{item.name}</Text>
                      <Tag color={tagColor[item.tone]}>{item.type}</Tag>
                    </Space>
                    <div style={{ fontSize: 12, color: '#8D806F', marginTop: 4 }}>{item.grade} / {item.school}</div>
                    <div style={{ fontSize: 13, color: '#1F2329', marginTop: 8 }}>{item.reason}</div>
                    <Button size="small" type="link" style={{ paddingLeft: 0, marginTop: 6 }} onClick={() => router.push(item.href)}>{item.actionLabel}</Button>
                  </div>
                ))}
              </div>
            ) : (
              <BrandEmpty title="暂无重点预警学生" icon={<TeamOutlined />} />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card bordered={false} title="反馈与试卷待办" style={{ borderRadius: 12, marginBottom: 16 }}>
            {feedbackTasks.length ? (
              <List
                dataSource={feedbackTasks}
                renderItem={(item, index) => (
                  <List.Item className="stagger-item" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }} actions={isMobile ? undefined : [<Button key="action" size="small" type="link" onClick={() => router.push(item.href)}>{item.actionLabel}</Button>]}>
                    <List.Item.Meta
                      title={<Space wrap><Tag color={tagColor[item.tone]}>{item.status || item.type}</Tag><Text strong>{item.title}</Text></Space>}
                      description={item.description}
                    />
                    {isMobile && <Button size="small" type="link" onClick={() => router.push(item.href)} style={{ paddingLeft: 0 }}>{item.actionLabel}</Button>}
                  </List.Item>
                )}
              />
            ) : (
              <BrandEmpty title="反馈和试卷暂无待处理事项" icon={<FileDoneOutlined />} />
            )}
          </Card>

          <Card bordered={false} title="本周教学完成度" style={{ borderRadius: 12, marginBottom: 16 }}>
            <CompletionRow label="考勤提交率" item={weekCompletion.attendance} color="#123C35" />
            <CompletionRow label="课堂反馈率" item={weekCompletion.classroomFeedback} color="#123C35" />
            <CompletionRow label="试卷推送率" item={weekCompletion.paperPush} color="#123C35" />
            <CompletionRow label="表现反馈率" item={weekCompletion.performance} color="#123C35" />
          </Card>

          <Card bordered={false} title="教学概览" style={{ borderRadius: 12, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : '1fr 1fr', gap: 10 }}>
              {[
                { label: '在带学员', value: `${monthlyStats.totalStudents}人`, icon: <TeamOutlined />, color: '#123C35' },
                { label: '本月课时', value: `${formatHours(monthlyStats.monthlyHours)}h`, icon: <ClockCircleOutlined />, color: '#123C35' },
                { label: '未读留言', value: `${pendingTasks.unreadParentComments}条`, icon: <MessageOutlined />, color: '#E8784A' },
                { label: '待处理', value: `${heroStats.totalTodos}项`, icon: <AlertOutlined />, color: '#E8784A' },
              ].map((item) => (
                <div key={item.label} style={{ background: '#FAF8F5', borderRadius: 10, padding: 12 }}>
                  <div style={{ color: item.color, fontSize: 18 }}>{item.icon}</div>
                  <div style={{ color: item.color, fontWeight: 800, fontSize: 20, marginTop: 4, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: '#8D806F' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: '#F7F4F0', color: '#8D806F', fontSize: 12, lineHeight: 1.7 }}>
              家长留言功能即将开放；当前统计包含试卷与表现动态评论。
            </div>
          </Card>

          <Card bordered={false} title="快捷操作" style={{ borderRadius: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : '1fr 1fr', gap: 10 }}>
              {quickActions.map((item, index) => (
                <button
                  className="pressable stagger-item"
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  style={{
                    border: '1px solid #EEE7E1',
                    borderRadius: 10,
                    background: '#fff',
                    padding: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: 96,
                    animationDelay: `${Math.min(index, 8) * 40}ms`,
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.borderColor = toneColor[item.tone]
                    event.currentTarget.style.background = `${toneColor[item.tone]}08`
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.borderColor = '#EEE7E1'
                    event.currentTarget.style.background = '#fff'
                  }}
                >
                  <div style={{ color: toneColor[item.tone], fontSize: 20, marginBottom: 8 }}>{quickIcons[index]}</div>
                  <div style={{ color: '#1F2329', fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                  <div style={{ color: '#8D806F', fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>{item.desc}</div>
                </button>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
    </PullToRefresh>
  )
}
