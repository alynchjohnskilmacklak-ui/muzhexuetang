'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, Empty, Skeleton, Tabs, Tag } from 'antd'
import {
  ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined,
  CommentOutlined, FileTextOutlined, TeamOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useDivision } from '@/contexts/DivisionContext'

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('加载失败')
  return r.json()
})

type LessonRow = {
  id: string
  time: string
  subject: string
  groupName: string
  room: string | null
  teacherName: string
  attendanceSubmitted: boolean
  feedbackSummary: string | null
  feedbackCreatedAt: string | null
  students: Array<{ id: string; name: string; membershipLevel: string; attendanceStatus: string | null; hoursDeducted: number }>
  missingFeedbackStudents: string[]
}

type ClosedLoopData = {
  dateLabel?: string
  section?: string
  summary?: { totalLessons: number; attendanceDone: number; attendancePending: number; feedbackDone: number; feedbackPending: number; openMessages: number }
  lessons?: LessonRow[]
  messages?: Array<{ id: string; title: string; subject: string | null; studentName: string; membershipLevel: string; parentName: string; createdAt: string; createdTimeAgo: string; lastReply: { content: string; authorName: string } | null }>
}

function MembershipBadge({ level }: { level: string }) {
  if (level === 'SVIP') {
    return <span style={{ fontSize: 9, fontWeight: 700, padding: '0 5px', borderRadius: 999, color: '#123C35', background: 'linear-gradient(135deg,#C9A45C,#A8873D)', border: '1px solid rgba(255,255,255,.35)', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: '15px' }}>★SVIP</span>
  }
  if (level === 'VIP') {
    return <span style={{ fontSize: 9, fontWeight: 700, padding: '0 5px', borderRadius: 999, color: '#fff', background: 'linear-gradient(135deg,#F0875B,#E8784A)', border: '1px solid rgba(255,255,255,.35)', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: '15px' }}>★VIP</span>
  }
  return <span style={{ fontSize: 9, padding: '0 5px', borderRadius: 999, color: 'rgba(40,60,50,.65)', background: 'rgba(40,60,50,.08)', border: '1px solid rgba(40,60,50,.14)', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: '15px' }}>普通</span>
}

export default function ClosedLoopPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSection = searchParams.get('section') === 'feedback' ? 'feedback' : searchParams.get('section') === 'messages' ? 'messages' : 'attendance'
  const [section, setSection] = useState(initialSection)
  const { division } = useDivision()
  const { data, isLoading } = useSWR<ClosedLoopData>(`/api/dashboard/closed-loop?section=${section}&division=${division}`, fetcher)

  useEffect(() => {
    setSection(initialSection)
  }, [initialSection])

  const summary = data?.summary
  const lessons = data?.lessons ?? []
  const messages = data?.messages ?? []

  const tabs = [
    {
      key: 'attendance',
      label: <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>考勤提交{summary ? ` (${summary.attendanceDone}/${summary.totalLessons})` : ''}</span>,
    },
    {
      key: 'feedback',
      label: <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>课堂反馈{summary ? ` (${summary.feedbackDone}/${summary.totalLessons})` : ''}</span>,
    },
    {
      key: 'messages',
      label: <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>家长留言{summary && summary.openMessages > 0 ? ` (${summary.openMessages})` : ''}</span>,
    },
  ]

  return (
    <PageLayout title="今日课堂闭环" subtitle={data ? `${data.dateLabel} · 考勤 · 反馈 · 沟通 全览` : undefined}>
      <Card bordered={false} style={{ borderRadius: 16, border: '1px solid rgba(232,120,74,.14)' }} styles={{ body: { padding: 14 } }}>
        <Tabs
          activeKey={section}
          items={tabs}
          onChange={(key) => {
            setSection(key)
            router.replace(`/closed-loop?section=${key}`, { scroll: false })
          }}
        />
        {isLoading || !data ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <>
            {section === 'messages' ? (
              messages.length === 0 ? (
                <Empty description="没有待教师回复的家长留言，沟通闭环已通畅" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {messages.map((m) => (
                    <div key={m.id} style={{
                      padding: '12px 14px', borderRadius: 12, background: '#FFFDF7',
                      border: '1px solid rgba(232,120,74,.14)', boxShadow: '0 2px 8px rgba(58,50,39,.05)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{
                          color: m.membershipLevel === 'SVIP' ? '#123C35' : m.membershipLevel === 'VIP' ? '#2F3F38' : '#285247',
                          fontSize: 14,
                        }}>{m.studentName}</strong>
                        <span style={{ fontSize: 12, color: '#9A8E7A' }}>{m.title}</span>
                        {m.subject && <Tag color="orange" style={{ margin: 0, borderRadius: 999, fontSize: 10 }}>{m.subject}</Tag>}
                      </div>
                      <div style={{ marginTop: 6, color: '#5C4F3F', fontSize: 13 }}>
                        <CommentOutlined style={{ marginRight: 5, color: '#E8784A', fontSize: 12 }} />
                        来自 {m.parentName} · {m.createdTimeAgo}
                      </div>
                      {m.lastReply ? (
                        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(29,158,117,.06)' }}>
                          <span style={{ fontSize: 12, color: 'var(--color-success-action)', fontWeight: 600 }}>{m.lastReply.authorName} 已回复：</span>
                          <span style={{ fontSize: 12, color: '#5C4F3F' }}>{m.lastReply.content.length > 80 ? `${m.lastReply.content.slice(0, 80)}…` : m.lastReply.content}</span>
                        </div>
                      ) : (
                        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(232,120,74,.08)', border: '1px dashed rgba(232,120,74,.3)' }}>
                          <span style={{ fontSize: 12, color: '#C0392B', fontWeight: 600 }}>尚未回复，请教师尽快跟进</span>
                        </div>
                      )}
                    </div>
                  ))
                }
                </div>
              )
            ) : (
              lessons.length === 0 ? (
                <Empty description="今日暂无课程" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {lessons.map((lesson) => {
                    const attOk = lesson.attendanceSubmitted
                    const fbOk = Boolean(lesson.feedbackSummary)
                    return (
                      <div key={lesson.id} style={{
                        padding: '11px 12px', borderRadius: 12, background: '#FFFDF7',
                        border: '1px solid rgba(232,120,74,.14)', boxShadow: '0 2px 8px rgba(58,50,39,.05)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 9, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(155deg,#FFB84D,#E8784A)' }}>{lesson.time}</span>
                          <strong style={{ color: '#2B2110', fontSize: 14 }}>{lesson.groupName}</strong>
                          <span style={{ fontSize: 12, color: '#5C4F3F' }}>{lesson.subject}</span>
                          <span style={{ fontSize: 12, color: '#E8784A', fontWeight: 600 }}>{lesson.teacherName}</span>
                        </div>

                        {section === 'attendance' ? (
                          <>
                            <div style={{ marginTop: 8 }}>
                              {attOk
                                ? <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0, borderRadius: 999 }}>考勤已提交</Tag>
                                : <Tag color="orange" style={{ margin: 0, borderRadius: 999 }}>考勤未提交</Tag>}
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                                <TeamOutlined style={{ color: '#9A8E7A', fontSize: 12 }} />
                                <span style={{ fontSize: 12, color: '#5C4F3F', fontWeight: 600 }}>考勤明细（{lesson.students.length} 人）</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7 }}>
                                {lesson.students.map((s) => {
                                  const levelStyle =
                                    s.membershipLevel === 'SVIP'
                                      ? { background: '#0E5E4E', border: '1px solid #C9A45C' }
                                      : s.membershipLevel === 'VIP'
                                        ? { background: '#FFF7F1', border: '1px solid #F0875B' }
                                        : { background: '#F7FBF8', border: '1px solid #3E8E6E' }
                                  const nameColor =
                                    s.membershipLevel === 'SVIP' ? '#F2E3B6'
                                      : s.membershipLevel === 'VIP' ? '#B0552B'
                                        : '#285247'
                                  return (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 10, ...levelStyle }}>
                                      <span style={{ fontSize: 12.5, color: nameColor, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                                      <span style={{ flexShrink: 0 }}>
                                        {s.attendanceStatus === null
                                          ? <Tag color="default" style={{ margin: 0, borderRadius: 999, fontSize: 9, lineHeight: '15px', padding: '0 5px' }}>未录</Tag>
                                          : s.attendanceStatus === '出勤' || s.attendanceStatus === '补课'
                                            ? <Tag color="success" style={{ margin: 0, borderRadius: 999, fontSize: 9, lineHeight: '15px', padding: '0 5px' }}>{s.attendanceStatus}</Tag>
                                            : <Tag color="warning" style={{ margin: 0, borderRadius: 999, fontSize: 9, lineHeight: '15px', padding: '0 5px' }}>{s.attendanceStatus}</Tag>}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ marginTop: 8 }}>
                              {fbOk
                                ? <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0, borderRadius: 999 }}>反馈已发布</Tag>
                                : <Tag icon={<FileTextOutlined />} color="red" style={{ margin: 0, borderRadius: 999 }}>反馈未发布</Tag>}
                            </div>
                            {!fbOk && lesson.missingFeedbackStudents.length > 0 && (
                              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(232,120,74,.08)', border: '1px dashed rgba(232,120,74,.3)' }}>
                                <span style={{ fontSize: 12, color: '#C0392B', fontWeight: 600 }}>尚未反馈学员：</span>
                                <span style={{ fontSize: 12, color: '#5C4F3F' }}>{lesson.missingFeedbackStudents.join('、')}</span>
                              </div>
                            )}
                            {fbOk && lesson.feedbackSummary && (
                              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(29,158,117,.06)' }}>
                                <span style={{ fontSize: 12, color: '#5C4F3F', lineHeight: 1.6, display: 'block' }}>
                                  <span style={{ color: 'var(--color-success-action)', fontWeight: 600 }}>反馈摘要：</span>
                                  {lesson.feedbackSummary.length > 80 ? `${lesson.feedbackSummary.slice(0, 80)}…` : lesson.feedbackSummary}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </>
        )}
      </Card>
      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/dashboard')}>返回运营驾驶舱</Button>
      </div>
    </PageLayout>
  )
}
