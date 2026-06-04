'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Card, Empty, Modal, Progress, Tag, Tabs, Typography } from 'antd'
import {
  BookOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  ReadOutlined,
  RiseOutlined,
  StarOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { PERFORMANCE_BADGES } from '@/lib/performance'
import { getDailyQuote } from '@/data/daily-quotes'

const { Title, Text, Paragraph } = Typography

const MOOD_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  GREAT: { text: '很棒', color: '#1D8A66', bg: '#E8F6EF' },
  GOOD: { text: '良好', color: '#5E5AB8', bg: '#EFEFFC' },
  OKAY: { text: '平稳', color: '#A76616', bg: '#FFF3DC' },
  NEEDS_ATTENTION: { text: '需关注', color: '#C84A3D', bg: '#FDECE8' },
}

const TYPE_META: Record<string, { label: string; icon: ReactNode; color: string; bg: string }> = {
  post: { label: '表现反馈', icon: <HeartOutlined />, color: '#D96F43', bg: '#FFF3EA' },
  classroom: { label: '课堂反馈', icon: <BookOutlined />, color: '#6A5ACD', bg: '#F0EEFF' },
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
  const [detailModal, setDetailModal] = useState<any>(null)

  const timeline = useMemo(() => ([
    ...posts.map((p: any) => ({
      type: 'post',
      date: new Date(p.createdAt),
      student: p.student?.name,
      teacher: p.teacher?.name,
      content: p.content,
      mood: p.mood,
      id: p.id,
      raw: p,
    })),
    ...classroomFeedbacks.map((f: any) => ({
      type: 'classroom',
      date: new Date(f.createdAt),
      student: '',
      teacher: f.teacher?.name,
      content: f.summary || f.content || '课堂反馈',
      id: f.id,
      raw: f,
    })),
    ...badges.map((b: any) => {
      const badge = badgeMeta(b.badgeType)
      return {
        type: 'badge',
        date: new Date(b.earnedAt),
        student: b.student?.name,
        teacher: b.teacher?.name,
        content: `${badge.label}徽章`,
        description: b.description,
        badgeType: b.badgeType,
        id: b.id,
        raw: b,
      }
    }),
    ...highlights.map((h: any) => ({
      type: 'highlight',
      date: new Date(h.createdAt),
      student: h.student?.name,
      teacher: h.teacher?.name,
      content: h.content,
      id: h.id,
      raw: h,
    })),
    ...grades.map((g: any) => ({
      type: 'grade',
      date: new Date(g.createdAt),
      student: g.student?.name,
      content: g.assessment?.name || '学习测评',
      score: g.score,
      id: g.id,
      raw: g,
    })),
  ]).sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50), [posts, classroomFeedbacks, badges, grades, highlights])

  const quote = getDailyQuote()
  const earnedTypes = new Set(badges.map((badge: any) => badge.badgeType))
  const featuredBadges = badges.slice(0, 3)
  const hasData = timeline.length > 0
  const stats = [
    { label: '成长记录', value: timeline.length },
    { label: '闪光徽章', value: badges.length },
    { label: '关联学员', value: students.length },
  ]

  return (
    <div className="growth-page">
      <section className="growth-hero">
        <div>
          <Text className="growth-eyebrow">家校成长记录</Text>
          <Title level={3} className="growth-title">成长动态</Title>
          <Text className="growth-subtitle">
            记录孩子每一次进步与闪光时刻{filterDate ? `，当前查看 ${filterDate}` : ''}
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
                {highlightedFeedback.content || highlightedFeedback.summary || '暂无内容'}
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
                {filterDate ? `${filterDate} 暂无成长记录。` : '老师还没有发布新的成长记录。'}
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
                        const canOpen = item.type === 'post' || item.type === 'classroom'
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
                              </span>
                              <span className="growth-record-content">{item.content}</span>
                              {item.description && <span className="growth-note">{item.description}</span>}
                              {item.score !== undefined && (
                                <span className="growth-score">
                                  <span>成绩</span>
                                  <Progress percent={Math.min(100, Number(item.score) || 0)} size="small" showInfo={false} strokeColor="#E8784A" trailColor="#F3E2D7" />
                                  <strong>{item.score}</strong>
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
        onCancel={() => setDetailModal(null)}
        footer={null}
        width={560}
      >
        {detailModal && (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <Tag style={{ borderRadius: 9999 }}>
                {typeMeta(detailModal.type).label}
              </Tag>
              {detailModal.teacher && <Text strong>{detailModal.teacher}老师</Text>}
              {detailModal.student && <Text type="secondary">{detailModal.student}</Text>}
              {detailModal.mood && (
                <Tag style={{ color: MOOD_LABELS[detailModal.mood]?.color, background: MOOD_LABELS[detailModal.mood]?.bg, borderColor: 'transparent' }}>
                  {MOOD_LABELS[detailModal.mood]?.text}
                </Tag>
              )}
            </div>
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {detailModal.content}
            </Paragraph>
            {detailModal.raw?.knowledgePoints?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>知识点：</Text>
                {detailModal.raw.knowledgePoints.map((kp: string, i: number) => (
                  <Tag key={i} style={{ borderRadius: 9999, fontSize: 11, marginTop: 4 }}>{kp}</Tag>
                ))}
              </div>
            )}
            {detailModal.raw?.imageUrls?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {detailModal.raw.imageUrls.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`成长记录图片 ${i + 1}`} style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 8 }} />
                ))}
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
