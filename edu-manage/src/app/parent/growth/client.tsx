'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Card, Empty, Input, message, Modal, Progress, Space, Tag, Tabs, Typography } from 'antd'
import {
  BookOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  ReadOutlined,
  RiseOutlined,
  SendOutlined,
  StarOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { PERFORMANCE_BADGES } from '@/lib/performance'
import { getDailyQuote } from '@/data/daily-quotes'
import { normalizeUploadUrl } from '@/lib/upload-url'

const { Title, Text, Paragraph } = Typography

const MOOD_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  GREAT: { text: '很棒', color: '#1D8A66', bg: '#E8F6EF' },
  GOOD: { text: '良好', color: '#5E5AB8', bg: '#EFEFFC' },
  OKAY: { text: '平稳', color: '#A76616', bg: '#FFF3DC' },
  NEEDS_ATTENTION: { text: '需关注', color: '#C84A3D', bg: '#FDECE8' },
}

const TYPE_META: Record<string, { label: string; icon: ReactNode; color: string; bg: string }> = {
  feedback: { label: '成长反馈', icon: <BookOutlined />, color: '#6A5ACD', bg: '#F0EEFF' },
  performance_legacy: { label: '在校表现', icon: <HeartOutlined />, color: '#D96F43', bg: '#FFF3EA' },
  badge: { label: '闪光徽章', icon: <TrophyOutlined />, color: '#B7791F', bg: '#FFF5D8' },
  grade: { label: '学习成绩', icon: <StarOutlined />, color: '#2476A8', bg: '#EAF5FB' },
  highlight: { label: '高光时刻', icon: <RiseOutlined />, color: '#1D8A66', bg: '#EAF7EF' },
}

function badgeMeta(type: string) {
  return PERFORMANCE_BADGES.find(item => item.type === type) || { type, icon: '✦', label: type }
}

function typeMeta(type: string) {
  return TYPE_META[type] || TYPE_META.highlight
}

function shortDate(value: Date) {
  return format(value, 'M月d日 HH:mm')
}

export function ParentGrowthClient({
  students, posts, classroomFeedbacks, badges, grades, highlights,
  highlightedFeedback, filterDate,
}: {
  students: any[]
  posts: any[]
  classroomFeedbacks: any[]
  badges: any[]
  grades: any[]
  highlights: any[]
  highlightedFeedback: any
  filterDate: string | null
}) {
  const router = useRouter()
  const todayStr = new Date().toISOString().slice(0, 10)
  const [clientDate, setClientDate] = useState<string>(filterDate || todayStr)
  const [detailModal, setDetailModal] = useState<any>(null)
  const [replyText, setReplyText] = useState('')
  const [replyingId, setReplyingId] = useState('')
  const [replySending, setReplySending] = useState(false)

  const timeline = useMemo(() => {
    // Unified ClassroomFeedback with new fields
    const fbItems = classroomFeedbacks.map((f: any) => ({
      type: 'feedback' as const,
      date: new Date(f.createdAt),
      id: f.id,
      teacherName: f.teacher?.name,
      mood: f.mood,
      overallComment: f.overallComment,
      summary: f.summary,
      tags: f.tags || [],
      kps: f.knowledgePoints || [],
      badge: f.badge,
      homework: f.homework || [],
      imageUrls: f.imageUrls || [],
      students: f.students || [],
      parentReply: f.parentReply,
      adminReply: f.adminReply,
      source: f.source,
      raw: f,
    }))
    // Legacy PerformancePost (read-only)
    const postItems = posts.map((p: any) => ({
      type: 'performance_legacy' as const,
      date: new Date(p.createdAt),
      id: p.id,
      teacherName: p.teacher?.name,
      studentName: p.student?.name,
      mood: p.mood,
      overallComment: p.content,
      tags: p.tags || [],
      kps: [] as string[],
      badge: '',
      homework: [] as any[],
      imageUrls: p.images || [],
      students: [p.student].filter(Boolean),
      source: 'teacher',
      raw: p,
    }))
    const badgeItems = badges.map((b: any) => {
      const meta = badgeMeta(b.badgeType)
      return {
        type: 'badge' as const,
        date: new Date(b.earnedAt),
        student: b.student?.name,
        teacher: b.teacher?.name,
        content: `${meta.label}徽章`,
        description: b.description,
        badgeType: b.badgeType,
        id: b.id,
        raw: b,
      }
    })
    const highlightItems = highlights.map((h: any) => ({
      type: 'highlight' as const,
      date: new Date(h.createdAt),
      student: h.student?.name,
      teacher: h.teacher?.name,
      content: h.content,
      id: h.id,
      raw: h,
    }))
    const gradeItems = grades.map((g: any) => ({
      type: 'grade' as const,
      date: new Date(g.createdAt),
      student: g.student?.name,
      content: g.assessment?.name || '学习测评',
      score: g.score,
      id: g.id,
      raw: g,
    }))
    return [...fbItems, ...postItems, ...badgeItems, ...highlightItems, ...gradeItems]
      .filter(item => {
        if (!clientDate) return true
        const startOfDay = new Date(clientDate + 'T00:00:00').getTime()
        const endOfDay = startOfDay + 86400000
        return item.date.getTime() >= startOfDay && item.date.getTime() < endOfDay
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 50)
  }, [classroomFeedbacks, posts, badges, grades, highlights, clientDate])

  const quote = getDailyQuote()
  const earnedTypes = new Set(badges.map((badge: any) => badge.badgeType))
  const featuredBadges = badges.slice(0, 3)
  const hasData = timeline.length > 0
  const stats = [
    { label: '成长记录', value: timeline.length },
    { label: '闪光徽章', value: badges.length },
    { label: '关联学员', value: students.length },
  ]

  const handleParentReply = async (feedbackId: string) => {
    if (!replyText.trim()) return
    setReplySending(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feedbackId, parentReply: replyText }),
      })
      if (res.ok) {
        message.success('回复已发送')
        setReplyText('')
        setReplyingId('')
        // Refresh the page to show updated reply
        window.location.reload()
      } else {
        const data = await res.json().catch(() => ({}))
        message.error(data.error || '回复失败')
      }
    } finally {
      setReplySending(false)
    }
  }

  return (
    <div className="growth-page">
      <section className="growth-hero">
        <div>
          <Text className="growth-eyebrow">家校成长记录</Text>
          <Title level={3} className="growth-title">成长动态</Title>
          <Text className="growth-subtitle">
            记录孩子每一次进步与闪光时刻{clientDate ? `，当前查看 ${clientDate === todayStr ? '今日' : clientDate}` : ''}
          </Text>
        </div>
        <div className="growth-quote" aria-label="励志名言">
          <ReadOutlined />
          <div>
            <Paragraph className="growth-quote-text">{quote.text}</Paragraph>
            <Text className="growth-quote-source">——{quote.source}</Text>
          </div>
        </div>
      </section>

      <div className="growth-stats">
        {stats.map(item => (
          <Card key={item.label} bordered={false} className="growth-stat-card">
            <Text>{item.label}</Text>
            <strong>{item.value}</strong>
          </Card>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px',
        padding: '8px 14px', background: '#fff', borderRadius: 12,
        border: '1px solid #F0DDD2',
      }}>
        <button
          onClick={() => {
            const prev = new Date(clientDate)
            prev.setDate(prev.getDate() - 1)
            const prevStr = prev.toISOString().slice(0, 10)
            setClientDate(prevStr)
            router.push(`/parent/growth?date=${prevStr}`)
          }}
          style={{ border: '1px solid #EEE7E1', borderRadius: 8, background: 'transparent', padding: '5px 12px', cursor: 'pointer' }}
        >←</button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 14, color: '#1F2329' }}>
          {clientDate === todayStr ? '今日' : clientDate}
          {timeline.length > 0 && <span style={{ fontSize: 12, color: '#98A2B3', marginLeft: 6 }}>({timeline.length} 条)</span>}
        </div>
        <button
          onClick={() => {
            const next = new Date(clientDate)
            next.setDate(next.getDate() + 1)
            const nextStr = next.toISOString().slice(0, 10)
            if (nextStr <= todayStr) { setClientDate(nextStr); router.push(`/parent/growth?date=${nextStr}`) }
          }}
          disabled={clientDate >= todayStr}
          style={{ border: '1px solid #EEE7E1', borderRadius: 8, background: 'transparent', padding: '5px 12px', cursor: clientDate >= todayStr ? 'not-allowed' : 'pointer', opacity: clientDate >= todayStr ? 0.4 : 1 }}
        >→</button>
        {clientDate !== todayStr && (
          <button
            onClick={() => { setClientDate(todayStr); router.push('/parent/growth') }}
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, background: '#E8784A', color: '#fff', border: 'none', cursor: 'pointer' }}
          >今日</button>
        )}
      </div>

      {highlightedFeedback && (
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message="来自通知的反馈"
          description={
            <div>
              <Text strong>{highlightedFeedback.teacher?.name || '老师'}</Text>
              {highlightedFeedback.student?.name && <Text style={{ marginLeft: 8 }}>学员：{highlightedFeedback.student.name}</Text>}
              <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
                {highlightedFeedback.overallComment || highlightedFeedback.content || highlightedFeedback.summary || '暂无内容'}
              </Paragraph>
            </div>
          }
          className="growth-alert"
          closable
        />
      )}

      {!hasData ? (
        <Card bordered={false} className="growth-empty-card">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                {clientDate ? `${clientDate === todayStr ? '今日' : clientDate} 暂无成长记录。` : '老师还没有发布新的成长记录。'}
                <br />
                每一份努力都会被认真看见，新的闪光时刻很快会来到。
              </span>
            }
          />
        </Card>
      ) : (
        <Tabs
          defaultActiveKey="timeline"
          className="growth-tabs"
          items={[
            {
              key: 'timeline',
              label: <span><RiseOutlined /> 成长时间线</span>,
              children: (
                <div className="growth-content-grid">
                  <Card bordered={false} className="growth-timeline-card">
                    <div className="growth-timeline" data-scroll-lock>
                      {timeline.map((item: any) => {
                        const meta = typeMeta(item.type)
                        const canOpen = item.type === 'feedback' || item.type === 'performance_legacy'
                        const isNewFeedback = item.type === 'feedback'
                        return (
                          <button
                            type="button"
                            key={`${item.type}-${item.id}`}
                            className="growth-timeline-item"
                            onClick={() => canOpen && setDetailModal(item)}
                            disabled={!canOpen}
                          >
                            <span className="growth-node" style={{ color: meta.color, background: meta.bg }}>
                              {item.badgeType ? badgeMeta(item.badgeType).icon : meta.icon}
                            </span>
                            <span className="growth-record">
                              <span className="growth-record-head">
                                <span>
                                  {item.student && <strong>{item.student}</strong>}
                                  {item.studentName && <strong>{item.studentName}</strong>}
                                  {item.teacherName && <em>{item.teacherName}老师</em>}
                                  {item.teacher && <em>{item.teacher}老师</em>}
                                </span>
                                <Text>{shortDate(item.date)}</Text>
                              </span>
                              <span className="growth-tags">
                                <Tag style={{ color: meta.color, background: meta.bg, borderColor: 'transparent' }}>{meta.label}</Tag>
                                {item.mood && (
                                  <Tag style={{ color: MOOD_LABELS[item.mood]?.color, background: MOOD_LABELS[item.mood]?.bg, borderColor: 'transparent' }}>
                                    {MOOD_LABELS[item.mood]?.text || item.mood}
                                  </Tag>
                                )}
                                {item.badge && (
                                  <Tag style={{ color: '#B7791F', background: '#FFF5D8', borderColor: 'transparent' }}>{item.badge}</Tag>
                                )}
                              </span>
                              <span className="growth-record-content">
                                {item.overallComment || item.content || '课堂反馈'}
                              </span>
                              {item.tags?.length > 0 && (
                                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                  {item.tags.map((t: string) => (
                                    <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: '#EEEEFF', color: '#534AB7' }}>{t}</span>
                                  ))}
                                </span>
                              )}
                              {item.kps?.length > 0 && (
                                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                  {item.kps.map((kp: string) => (
                                    <span key={kp} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: '#FFF3EC', color: '#E8784A' }}>{kp}</span>
                                  ))}
                                </span>
                              )}
                              {item.description && <span className="growth-note">{item.description}</span>}
                              {item.score !== undefined && (
                                <span className="growth-score">
                                  <span>成绩</span>
                                  <Progress percent={Math.min(100, Number(item.score) || 0)} size="small" showInfo={false} strokeColor="#E8784A" trailColor="#F3E2D7" />
                                  <strong>{item.score}</strong>
                                </span>
                              )}
                              {item.parentReply && (
                                <span style={{ fontSize: 11, color: '#E8784A', marginTop: 4, display: 'block' }}>
                                  💬 已回复：{item.parentReply}
                                </span>
                              )}
                              {item.adminReply && (
                                <span style={{ fontSize: 11, color: '#1D9E75', marginTop: 2, display: 'block' }}>
                                  👨‍💼 老师回复：{item.adminReply}
                                </span>
                              )}
                              {canOpen && <span className="growth-open">点击查看详情</span>}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </Card>

                  <aside className="growth-side-panel">
                    <Card bordered={false} className="growth-feature-card">
                      <Text className="growth-panel-title">最近闪光</Text>
                      {featuredBadges.length ? featuredBadges.map((badge: any) => {
                        const meta = badgeMeta(badge.badgeType)
                        return (
                          <div key={badge.id} className="growth-feature-badge">
                            <span>{meta.icon}</span>
                            <div>
                              <strong>{meta.label}</strong>
                              <Text>{badge.student?.name || '学员'}，{badge.teacher?.name || '老师'}记录</Text>
                            </div>
                          </div>
                        )
                      }) : (
                        <Text className="growth-note">暂未获得徽章，先期待下一次闪光。</Text>
                      )}
                    </Card>
                  </aside>
                </div>
              ),
            },
            {
              key: 'badges',
              label: <span><TrophyOutlined /> 徽章墙</span>,
              children: (
                <Card bordered={false} className="growth-badge-wall">
                  {PERFORMANCE_BADGES.map((badge, index) => {
                    const earned = earnedTypes.has(badge.type)
                    return (
                      <div key={badge.type} className={`growth-badge-token ${earned ? 'earned' : ''} ${index % 3 === 0 ? 'wide' : ''}`}>
                        <span>{badge.icon}</span>
                        <div>
                          <strong>{badge.label}</strong>
                          <Text>{earned ? '已经点亮' : '继续积累，等待点亮'}</Text>
                        </div>
                      </div>
                    )
                  })}
                </Card>
              ),
            },
          ]}
        />
      )}

      <Modal
        title="反馈详情"
        open={!!detailModal}
        onCancel={() => { setDetailModal(null); setReplyingId(''); setReplyText('') }}
        footer={null}
        width={560}
      >
        {detailModal && (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <Tag style={{ borderRadius: 9999 }}>
                {typeMeta(detailModal.type).label}
              </Tag>
              {detailModal.teacherName && <Text strong>{detailModal.teacherName}老师</Text>}
              {detailModal.studentName && <Text type="secondary">{detailModal.studentName}</Text>}
              {detailModal.mood && (
                <Tag style={{ color: MOOD_LABELS[detailModal.mood]?.color, background: MOOD_LABELS[detailModal.mood]?.bg, borderColor: 'transparent' }}>
                  {MOOD_LABELS[detailModal.mood]?.text}
                </Tag>
              )}
              {detailModal.badge && <Tag color="gold">{detailModal.badge}</Tag>}
            </div>
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {detailModal.overallComment || detailModal.content}
            </Paragraph>
            {detailModal.kps?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>知识点：</Text>
                {detailModal.kps.map((kp: string, i: number) => (
                  <Tag key={i} style={{ borderRadius: 9999, fontSize: 11, marginTop: 4 }}>{kp}</Tag>
                ))}
              </div>
            )}
            {detailModal.tags?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>表现标签：</Text>
                {detailModal.tags.map((t: string, i: number) => (
                  <Tag key={i} style={{ borderRadius: 9999, fontSize: 11, marginTop: 4, color: '#534AB7', background: '#EEEEFF', border: 'none' }}>{t}</Tag>
                ))}
              </div>
            )}
            {detailModal.homework?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>作业：</Text>
                {detailModal.homework.map((h: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: '#5a4e3a', marginLeft: 12 }}>
                    {i + 1}. {typeof h === 'string' ? h : h.content}
                  </div>
                ))}
              </div>
            )}
            {detailModal.imageUrls?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {detailModal.imageUrls.map((url: string, i: number) => (
                  <img key={i} src={normalizeUploadUrl(url)} alt={`成长记录图片 ${i + 1}`} style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 8 }} />
                ))}
              </div>
            )}
            {/* Parent reply section (for new feedback type) */}
            {detailModal.type === 'feedback' && (
              <div style={{ marginTop: 16, padding: '12px 0 0', borderTop: '1px solid #EEE7E1' }}>
                {detailModal.parentReply ? (
                  <div style={{ padding: '8px 12px', background: '#FFF3EC', borderRadius: 8, fontSize: 13, color: '#5a4e3a' }}>
                    💬 我的回复：{detailModal.parentReply}
                  </div>
                ) : (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>给老师留言：</Text>
                    <Space.Compact style={{ width: '100%', marginTop: 6 }}>
                      <Input
                        value={replyingId === detailModal.id ? replyText : ''}
                        onChange={e => setReplyText(e.target.value)}
                        onFocus={() => setReplyingId(detailModal.id)}
                        placeholder="感谢老师的反馈，写下你的想法..."
                        maxLength={300}
                      />
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={replySending}
                        onClick={() => handleParentReply(detailModal.id)}
                        style={{ background: '#E8784A', borderColor: '#E8784A' }}
                      >
                        发送
                      </Button>
                    </Space.Compact>
                  </div>
                )}
                {detailModal.adminReply && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, fontSize: 13, color: '#1D9E75' }}>
                    👨‍💼 老师回复：{detailModal.adminReply}
                  </div>
                )}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {format(detailModal.date, 'yyyy年M月d日 HH:mm')}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
