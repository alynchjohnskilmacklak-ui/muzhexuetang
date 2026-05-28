'use client'

import { useState } from 'react'
import { Alert, Card, Empty, Modal, Tag, Timeline, Typography, Row, Col, Tabs } from 'antd'
import { HeartOutlined, TrophyOutlined, StarOutlined, RiseOutlined, BookOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { format } from 'date-fns'

const { Title, Text, Paragraph } = Typography

const MOOD_LABELS: Record<string, { text: string; color: string }> = {
  GREAT: { text: '很棒', color: '#1D9E75' },
  GOOD: { text: '良好', color: '#534AB7' },
  OKAY: { text: '一般', color: '#BA7517' },
  NEEDS_ATTENTION: { text: '需要关注', color: '#E24B4A' },
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

  // Build combined timeline
  const timeline = [
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
      content: f.summary || '课堂反馈',
      id: f.id,
      raw: f,
    })),
    ...badges.map((b: any) => ({
      type: 'badge',
      date: new Date(b.earnedAt),
      student: b.student?.name,
      teacher: b.teacher?.name,
      content: `${b.badgeType}徽章`,
      description: b.description,
      id: b.id,
      raw: b,
    })),
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
      content: `${g.assessment?.name || ''}`,
      score: g.score,
      id: g.id,
      raw: g,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50)

  const hasData = timeline.length > 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Title level={4} style={{ marginBottom: 4 }}>成长动态</Title>
      </div>
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
        记录孩子每一次进步与闪光时刻{filterDate ? ` — ${filterDate}` : ''}
      </Text>

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
          style={{ marginBottom: 16, borderRadius: 10 }}
          closable
        />
      )}

      {!hasData ? (
        <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description={filterDate ? `${filterDate} 暂无忧虑反馈，请关注其他日期。` : "老师还没有发布新的成长记录，孩子的每一次努力都会被认真看见。"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <Tabs
          defaultActiveKey="timeline"
          items={[
            {
              key: 'timeline',
              label: <span><RiseOutlined /> 成长时间线</span>,
              children: (
                <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}>
                  <Timeline
                    items={timeline.map((item: any, i: number) => ({
                      color: item.type === 'badge' ? 'gold' : item.type === 'classroom' ? 'purple' : item.type === 'grade' ? 'blue' : '#E8784A',
                      dot: item.type === 'badge' ? <TrophyOutlined /> : item.type === 'classroom' ? <BookOutlined /> : item.type === 'grade' ? <StarOutlined /> : <HeartOutlined />,
                      children: (
                        <div key={i} style={{ cursor: item.type === 'post' || item.type === 'classroom' ? 'pointer' : 'default' }} onClick={() => (item.type === 'post' || item.type === 'classroom') && setDetailModal(item)}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                            {item.student && <Text strong style={{ fontSize: 12, color: '#1F2933' }}>{item.student}</Text>}
                            {item.teacher && <Text type="secondary" style={{ fontSize: 10 }}>· {item.teacher}老师</Text>}
                            <Tag style={{ borderRadius: 9999, fontSize: 10 }}>
                              {item.type === 'post' ? '表现反馈' : item.type === 'classroom' ? '课堂反馈' : item.type === 'badge' ? '徽章' : item.type === 'grade' ? '成绩' : '亮点'}
                            </Tag>
                            {item.mood && (
                              <Tag color={MOOD_LABELS[item.mood]?.color} style={{ borderRadius: 9999, fontSize: 10 }}>
                                {MOOD_LABELS[item.mood]?.text || item.mood}
                              </Tag>
                            )}
                          </div>
                          <Text style={{ fontSize: 12, lineHeight: 1.6, color: '#4B5563' }}>{item.content}</Text>
                          {item.score !== undefined && (
                            <Text strong style={{ fontSize: 14, color: item.score >= 90 ? '#1D9E75' : '#E8784A' }}>
                              成绩: {item.score}
                            </Text>
                          )}
                          {item.description && (
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{item.description}</Text>
                          )}
                          {(item.type === 'post' || item.type === 'classroom') && (
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                {format(item.date, 'M月d日 HH:mm')} · 点击查看详情
                              </Text>
                            </div>
                          )}
                          {!(item.type === 'post' || item.type === 'classroom') && (
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                {format(item.date, 'M月d日 HH:mm')}
                              </Text>
                            </div>
                          )}
                        </div>
                      ),
                    }))}
                  />
                </Card>
              ),
            },
            {
              key: 'badges',
              label: <span><TrophyOutlined /> 徽章墙</span>,
              children: badges.length === 0 ? (
                <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty description="暂无徽章" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </Card>
              ) : (
                <Row gutter={[12, 12]}>
                  {badges.map((b: any) => (
                    <Col xs={12} sm={8} lg={6} key={b.id}>
                      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', textAlign: 'center' }}>
                        <TrophyOutlined style={{ fontSize: 28, color: '#E8784A', marginBottom: 8 }} />
                        <Text strong style={{ display: 'block', fontSize: 13 }}>{b.badgeType}</Text>
                        {b.description && <Text type="secondary" style={{ fontSize: 10 }}>{b.description}</Text>}
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 10 }}>{b.student?.name} · {format(new Date(b.earnedAt), 'M月d日')}</Text>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <Tag style={{ borderRadius: 9999 }}>
                {detailModal.type === 'post' ? '表现反馈' : '课堂反馈'}
              </Tag>
              {detailModal.teacher && <Text strong>{detailModal.teacher}老师</Text>}
              {detailModal.student && <Text type="secondary">· {detailModal.student}</Text>}
              {detailModal.mood && (
                <Tag color={MOOD_LABELS[detailModal.mood]?.color} style={{ borderRadius: 9999 }}>
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
                  <img key={i} src={url} alt={`图片 ${i + 1}`} style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 8 }} />
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
