'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import { Button, Card, Col, Empty, List, Progress, Row, Space, Tag, Typography } from 'antd'
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
  teacher: { id: string; name: string; avatar?: string | null; subjects?: string | null }
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
  blue: '#2F6FED',
  orange: '#E87545',
  red: '#D4537E',
  green: '#1D9E75',
  purple: '#6F55D9',
  brown: '#BA7517',
  dark: '#123326',
}

const tagColor: Record<Tone, string> = {
  blue: 'blue',
  orange: 'orange',
  red: 'red',
  green: 'green',
  purple: 'purple',
  brown: 'gold',
  dark: 'default',
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
  const { data, isLoading } = useSWR<DashboardData>('/api/teacher/dashboard', fetcher, { refreshInterval: 180_000 })

  useEffect(() => {
    fetch('/api/teacher/dashboard', { method: 'POST' }).catch(() => {})
  }, [])

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}>加载中...</div>
  if (!data?.teacher) return <div style={{ textAlign: 'center', padding: 80 }}>未找到教师信息</div>

  const { teacher, heroStats, todayLessons, todos, studentWarnings, feedbackTasks, weekCompletion, monthlyStats, pendingTasks, quickActions } = data
  const heroItems = [
    { label: '今日课次', value: heroStats.todayLessons, color: '#2F6FED', suffix: '节' },
    { label: '待考勤', value: heroStats.pendingAttendance, color: '#E87545', suffix: '节' },
    { label: '待发反馈', value: heroStats.pendingFeedback, color: '#6F55D9', suffix: '条' },
    { label: '待批请假', value: heroStats.pendingLeave, color: '#BA7517', suffix: '条' },
    { label: '待推送试卷', value: heroStats.pendingPapers, color: '#1D9E75', suffix: '份' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={{ background: '#123326', borderRadius: 12, padding: isMobile ? 16 : '26px 30px', color: '#fff', maxWidth: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, opacity: 0.72 }}>{dateText()}</div>
            <h1 style={{ margin: '8px 0 8px', fontSize: isMobile ? 20 : 24, lineHeight: 1.3, letterSpacing: 0 }}>{teacher.name}老师，{getGreeting()}</h1>
            <div style={{ fontSize: 14, opacity: 0.86, lineHeight: 1.8 }}>
              今日共有 {heroStats.todayLessons} 节课，{heroStats.pendingAttendance} 节待考勤，{heroStats.totalTodos} 条待处理事项
            </div>
            <div style={{ fontSize: 13, opacity: 0.72, marginTop: 10 }}>认真记录每一堂课，让孩子的成长被看见。</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(96px, 1fr))', gap: 10, flex: '1 1 460px', width: '100%', minWidth: 0 }}>
            {heroItems.map((item) => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, padding: 14 }}>
                <div style={{ color: item.color, fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {item.value}<span style={{ fontSize: 12, fontWeight: 500, marginLeft: 2 }}>{item.suffix}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.74, marginTop: 4 }}>{item.label}</div>
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
                renderItem={(item) => (
                  <List.Item
                    actions={isMobile ? undefined : [<Button key="action" size="small" type="link" onClick={() => router.push(item.href)}>{item.actionLabel}</Button>]}
                    style={{ padding: '12px 0' }}
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
              <Empty description="今日暂无待办，可以整理课堂反馈、上传试卷或查看学生学习情况。" />
            )}
          </Card>

          <Card bordered={false} title="今日课程时间线" style={{ borderRadius: 12, marginBottom: 16 }}>
            {todayLessons.length ? (
              <List
                dataSource={todayLessons}
                renderItem={(lesson) => (
                  <List.Item style={{ padding: '14px 0' }}>
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
                <Empty description="今日暂无课程，可以整理课堂反馈、上传试卷或查看学生学习情况。" />
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
                {studentWarnings.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #F0E7DE', borderLeft: `4px solid ${toneColor[item.tone]}`, borderRadius: 10, padding: 12, background: '#FFFDFC' }}>
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
              <Empty description="暂无重点预警学生" />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card bordered={false} title="反馈与试卷待办" style={{ borderRadius: 12, marginBottom: 16 }}>
            {feedbackTasks.length ? (
              <List
                dataSource={feedbackTasks}
                renderItem={(item) => (
                  <List.Item actions={isMobile ? undefined : [<Button key="action" size="small" type="link" onClick={() => router.push(item.href)}>{item.actionLabel}</Button>]}>
                    <List.Item.Meta
                      title={<Space wrap><Tag color={tagColor[item.tone]}>{item.status || item.type}</Tag><Text strong>{item.title}</Text></Space>}
                      description={item.description}
                    />
                    {isMobile && <Button size="small" type="link" onClick={() => router.push(item.href)} style={{ paddingLeft: 0 }}>{item.actionLabel}</Button>}
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="反馈和试卷暂无待处理事项" />
            )}
          </Card>

          <Card bordered={false} title="本周教学完成度" style={{ borderRadius: 12, marginBottom: 16 }}>
            <CompletionRow label="考勤提交率" item={weekCompletion.attendance} color="#E87545" />
            <CompletionRow label="课堂反馈率" item={weekCompletion.classroomFeedback} color="#6F55D9" />
            <CompletionRow label="试卷推送率" item={weekCompletion.paperPush} color="#1D9E75" />
            <CompletionRow label="表现反馈率" item={weekCompletion.performance} color="#2F6FED" />
          </Card>

          <Card bordered={false} title="教学概览" style={{ borderRadius: 12, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : '1fr 1fr', gap: 10 }}>
              {[
                { label: '在带学员', value: `${monthlyStats.totalStudents}人`, icon: <TeamOutlined />, color: '#E87545' },
                { label: '本月课时', value: `${formatHours(monthlyStats.monthlyHours)}h`, icon: <ClockCircleOutlined />, color: '#1D9E75' },
                { label: '未读留言', value: `${pendingTasks.unreadParentComments}条`, icon: <MessageOutlined />, color: '#D4537E' },
                { label: '待处理', value: `${heroStats.totalTodos}项`, icon: <AlertOutlined />, color: '#6F55D9' },
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
  )
}
