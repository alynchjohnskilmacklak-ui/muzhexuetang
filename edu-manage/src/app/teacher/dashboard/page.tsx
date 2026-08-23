'use client'

import type { CSSProperties } from 'react'
import { useEffect } from 'react'
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
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { PullToRefresh } from '@/components/PullToRefresh'
import { MessageWorkflowNotice } from '@/components/MessageWorkflowNotice'
import { QuickStartGuide, type QuickStartStep } from '@/components/Common/QuickStartGuide'

const { Text } = Typography

const TEACHER_QUICK_STEPS: QuickStartStep[] = [
  { title: '查看今天的课', description: '先确认上课时间、班级和教室，避免漏课或走错教室。', actionLabel: '打开我的课表', href: '/teacher/schedule', icon: <CalendarOutlined /> },
  { title: '及时提交考勤', description: '课程结束后登记真实到勤情况，待办数量会同步减少。', actionLabel: '去录入考勤', href: '/teacher/attendance', icon: <CheckCircleOutlined /> },
  { title: '发布我的反馈', description: '把本节课的学习内容和建议发给家长，形成连续成长记录。', actionLabel: '去写反馈', href: '/teacher/feedback', icon: <MessageOutlined /> },
]

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
  startTime?: string
  endTime?: string
  courseName: string
  groupName: string
  room: string
  studentCount: number
  statusLabel: string
  statusTone: Tone
  hasFeedback: boolean
  attendanceSubmittedAt?: string | null
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
  }
  monthlyStats: { totalStudents: number; monthlyHours: number }
  pendingTasks: { unreadParentComments: number; pendingLeave: number }
  badges?: { unsubmitted: number; unpublished: number; unread: number; unreadMessages: number }
  quickActions: Array<{ label: string; desc: string; href: string; tone: Tone }>
}

const toneColor: Record<Tone, string> = {
  blue: '#123C35',
  orange: '#E8784A',
  red: '#D64545',
  green: '#123C35',
  purple: '#9A8E7A',
  brown: '#E8784A',
  dark: '#123C35',
}

const tagColor: Record<Tone, string> = {
  blue: '#123C35',
  orange: '#E8784A',
  red: '#D64545',
  green: '#123C35',
  purple: '#9A8E7A',
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
  const { data, isLoading, mutate } = useSWR<DashboardData>('/api/teacher/dashboard', fetcher, {
    refreshInterval: 180_000,
    dedupingInterval: 30_000,
    keepPreviousData: true,
    revalidateOnFocus: true,
  })
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch('/api/teacher/dashboard', { method: 'POST' }).catch((error) =>
        console.warn('教师仪表盘状态同步失败', error)
      )
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [])

  if (isLoading) return <CardSkeleton rows={3} />
  if (!data?.teacher) return <BrandEmpty title="未找到教师信息" icon={<UserOutlined />} />

  const { teacher, heroStats, todayLessons, todos, studentWarnings, feedbackTasks, weekCompletion, monthlyStats, quickActions } = data
  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]
  const heroItems = [
    { label: '今日课次', value: heroStats.todayLessons, suffix: '节' },
    { label: '待考勤', value: heroStats.pendingAttendance, suffix: '节' },
    { label: '待发反馈', value: heroStats.pendingFeedback, suffix: '条' },
    { label: '全部待办', value: heroStats.totalTodos, suffix: '项' },
  ]
  const heroStyle = {
    '--teacher-hero-bg': tierTheme.accent,
    '--teacher-hero-highlight': tierTheme.gold || tierTheme.border,
  } as CSSProperties

  return (
    <PullToRefresh onRefresh={async () => { await mutate() }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <MessageWorkflowNotice audience="teacher" deferMs={1400} />
      <QuickStartGuide storageKey={`mz_teacher_quick_start_v1_${teacher.id}`} title="三步开始今天的教学工作" steps={TEACHER_QUICK_STEPS} />
      <section className="teacher-dashboard-hero" style={heroStyle}>
        <div className="teacher-dashboard-hero__intro">
          <div className="teacher-dashboard-hero__date">{dateText()}</div>
          <div className="teacher-dashboard-hero__heading">
            <h1>{teacher.name}老师，{getGreeting()}</h1>
            <span className="teacher-dashboard-hero__tier">{tierTheme.label}</span>
          </div>
          <div className="teacher-dashboard-hero__summary">
            今天的课程安排和待处理事项已集中整理，按顺序完成即可。
          </div>
          <div className="teacher-dashboard-hero__message">认真记录每一堂课，让孩子的成长被看见。</div>
        </div>
        <div className="teacher-dashboard-hero__metrics">
          {heroItems.map((item) => (
            <div className="teacher-dashboard-hero__metric" key={item.label}>
              <div className="teacher-dashboard-hero__metric-value">
                {item.value}<span>{item.suffix}</span>
              </div>
              <div className="teacher-dashboard-hero__metric-label">{item.label}</div>
            </div>
          ))}
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
                        <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{lesson.courseName} · {lesson.groupName}</div>
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
                <div className="teacher-dashboard-empty-actions">
                  <Button onClick={() => router.push('/teacher/students')}>查看我的学生</Button>
                  <Button onClick={() => router.push('/teacher/papers')}>上传试卷</Button>
                  <Button onClick={() => router.push('/teacher/classroom-feedback')}>发布课堂反馈</Button>
                </div>
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
                    <div style={{ fontSize: 13, color: 'var(--color-ink)', marginTop: 8 }}>{item.reason}</div>
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
          </Card>

          <Card bordered={false} title="教学概览" style={{ borderRadius: 12, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : '1fr 1fr', gap: 10 }}>
              {[
                { label: '在带学员', value: `${monthlyStats.totalStudents}人`, icon: <TeamOutlined />, color: '#123C35' },
                { label: '本月课时', value: `${formatHours(monthlyStats.monthlyHours)}h`, icon: <ClockCircleOutlined />, color: '#123C35' },
                { label: '家长留言', value: `${data.badges?.unreadMessages ?? data.pendingTasks.unreadParentComments}条`, icon: <MessageOutlined />, color: '#E8784A' },
                { label: '待处理', value: `${heroStats.totalTodos}项`, icon: <AlertOutlined />, color: '#E8784A' },
              ].map((item) => (
                <div key={item.label} style={{ background: '#FAF8F5', borderRadius: 10, padding: 12 }}>
                  <div style={{ color: item.color, fontSize: 18 }}>{item.icon}</div>
                  <div style={{ color: item.color, fontWeight: 800, fontSize: 20, marginTop: 4, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: '#8D806F' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <Button
              block
              icon={<MessageOutlined />}
              onClick={() => router.push('/teacher/messages')}
              style={{ marginTop: 12, borderRadius: 10 }}
            >
              查看并回复家长留言
            </Button>
          </Card>

          <Card bordered={false} title="快捷操作" style={{ borderRadius: 12 }}>
            <div className="teacher-dashboard-quick-grid">
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
                  <div style={{ color: 'var(--color-ink)', fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                  <div className="teacher-dashboard-quick-desc" style={{ color: '#8D806F', fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>{item.desc}</div>
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
