'use client'

import { useState, useEffect } from 'react'
import { Button, Card, Empty, Tag, Typography, Modal, Input, Descriptions, Image, Space } from 'antd'
import { BookOutlined, ClockCircleOutlined, CameraOutlined, MessageOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { fmtDate, fmtDateTime } from '@/lib/format-date'
import { toast } from 'sonner'
import { ChildSwitcher } from '@/components/Parent/ChildSwitcher'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text, Paragraph } = Typography

export function ClassFeedbackClient({ feedbacks, highlightedFeedback }: { feedbacks: any[]; highlightedFeedback: any | null }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [detailModal, setDetailModal] = useState<any>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [localReply, setLocalReply] = useState<string | null>(null)

  // Auto-open detail if highlightedFeedback is present (from notification click)
  useEffect(() => {
    if (highlightedFeedback) {
      setDetailModal(highlightedFeedback)
    }
  }, [highlightedFeedback])

  const handleReply = async () => {
    if (!replyText.trim() || !detailModal) return
    setReplying(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detailModal.id, parentReply: replyText }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || '回复失败'); return }
      toast.success('回复已发送，老师会收到提醒')
      setLocalReply(replyText)
      setReplyText('')
    } catch { toast.error('网络错误') }
    finally { setReplying(false) }
  }

  const openDetail = (f: any) => {
    setDetailModal(f)
    setReplyText('')
    setLocalReply(f.parentReply || null)
  }

  return (
    <div>
      <ChildSwitcher />
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ marginBottom: 4 }}>课堂反馈</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          查看老师发送的课堂表现、学习内容、作业与照片
        </Text>
      </div>

      {/* Unread indicator */}
      {feedbacks.filter(f => !f.notifySent || f.createdAt > new Date(Date.now() - 7 * 86400000)).length > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#FFF3E8', border: '1px solid #FDD5B5', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageOutlined style={{ color: '#E8784A' }} />
          <Text style={{ fontSize: 13, color: '#D46B3A' }}>
            近期有 {feedbacks.filter(f => f.createdAt > new Date(Date.now() - 7 * 86400000)).length} 条新反馈
          </Text>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="暂无课堂反馈，老师发布课堂反馈后，会在这里第一时间展示。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 80 }}>
          {feedbacks.map((f: any) => (
            <Card
              key={f.id}
              bordered={false}
              hoverable
              style={{ borderRadius: 12, background: '#fff', border: `1px solid ${detailModal?.id === f.id ? '#E8784A' : '#F0DDD2'}` }}
              onClick={() => openDetail(f)}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <BookOutlined style={{ color: '#534AB7', fontSize: 16 }} />
                <Text strong style={{ fontSize: 15 }}>{f.teacher?.name || '老师'}</Text>
                {(() => {
                  const lessonSubject = f.classLesson?.subject as string | undefined
                  const assignedSubject = (f.classLesson?.group?.teacherAssignments as any[])
                    ?.find((a: any) => a.teacherId === f.teacher?.id)?.subject
                  const subject = lessonSubject || assignedSubject || f.classLesson?.group?.course?.subject
                  return subject ? (
                    <Tag style={{ borderRadius: 9999, fontSize: 10, background: '#F0EEFF', color: '#534AB7', border: 'none' }}>
                      {subject}
                    </Tag>
                  ) : null
                })()}
                {/* Unread dot for recent feedbacks */}
                {f.createdAt > new Date(Date.now() - 3 * 86400000) && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8784A', display: 'inline-block' }} />
                )}
                {f.parentReply && (
                  <Tag color="green" style={{ borderRadius: 9999, fontSize: 10 }}>已回复</Tag>
                )}
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
                  {fmtDateTime(f.createdAt)}
                </Text>
              </div>

              {/* Lesson info */}
              {f.classLesson?.group?.course && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12, color: '#7A869A' }}>
                  <span><BookOutlined style={{ marginRight: 4 }} />{f.classLesson.group.course.name}</span>
                  {f.classLesson.startTime && (
                    <span><ClockCircleOutlined style={{ marginRight: 4 }} />{f.classLesson.startTime}-{f.classLesson.endTime}</span>
                  )}
                </div>
              )}

              {/* Knowledge points */}
              {f.knowledgePoints?.length > 0 && (
                <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {f.knowledgePoints.map((kp: string, i: number) => (
                    <Tag key={i} style={{ borderRadius: 9999, fontSize: 10 }}>{kp}</Tag>
                  ))}
                </div>
              )}

              {/* Summary preview */}
              {f.summary && (
                <Paragraph ellipsis={{ rows: 2 }}
                  style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 4, color: '#4B5563' }}>
                  {f.summary}
                </Paragraph>
              )}

              {/* Image count badge */}
              {f.imageUrls?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <Tag icon={<CameraOutlined />} color="orange" style={{ borderRadius: 9999, fontSize: 11 }}>
                    {f.imageUrls.length} 张图片
                  </Tag>
                </div>
              )}

              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#E8784A' }}>查看详情 →</Text>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={null}
        width={isMobile ? '100%' : 640}
        style={isMobile ? { top: 0, maxWidth: '100vw', margin: 0 } : {}}
        styles={isMobile ? { body: { padding: 16, maxHeight: '90vh', overflow: 'auto' } } : {}}
        centered={!isMobile}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOutlined style={{ color: '#534AB7' }} />
            <span>课堂反馈详情</span>
          </div>
        }
      >
        {detailModal && (
          <div>
            {/* Basic info */}
            <Descriptions column={isMobile ? 1 : 2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="老师">{detailModal.teacher?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="发布时间">
                {fmtDateTime(detailModal.createdAt)}
              </Descriptions.Item>
              {detailModal.classLesson?.group?.course && (
                <>
                  <Descriptions.Item label="课程">
                    <BookOutlined style={{ marginRight: 4 }} />
                    {detailModal.classLesson.group.course.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="教室">
                    {detailModal.classLesson.group.room?.name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="上课时间">
                    {fmtDate(detailModal.classLesson.lessonDate)} {detailModal.classLesson.startTime}-{detailModal.classLesson.endTime}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="状态">
                <Tag color="purple" style={{ borderRadius: 9999 }}>
                  {detailModal.status === 'PUBLISHED' ? '已发布' : detailModal.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* Knowledge points */}
            {detailModal.knowledgePoints?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>今日知识点</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {detailModal.knowledgePoints.map((kp: string, i: number) => (
                    <Tag key={i} style={{ borderRadius: 9999, fontSize: 12 }}>{kp}</Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {detailModal.summary && (
              <div style={{ background: '#FFFBF7', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>📝 课堂总结</Text>
                <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                  {detailModal.summary}
                </Paragraph>
              </div>
            )}

            {/* Overall comment */}
            {detailModal.overallComment && (
              <div style={{ background: '#F5F3FF', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>💬 老师总评</Text>
                <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563' }}>
                  {detailModal.overallComment}
                </Paragraph>
              </div>
            )}

            {/* Homework */}
            {detailModal.homework?.length > 0 && (
              <div style={{ background: '#F7F4F0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>📚 课后作业</Text>
                {detailModal.homework.map((hw: any, i: number) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 4, color: '#4B5563' }}>
                    {i + 1}. {hw.content || hw.title || hw}
                  </div>
                ))}
              </div>
            )}

            {/* Images */}
            {detailModal.imageUrls?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>🖼 课堂照片</Text>
                <Image.PreviewGroup>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 8 }}>
                    {detailModal.imageUrls.map((url: string, i: number) => (
                      <Image
                        key={i}
                        src={normalizeUploadUrl(url)}
                        alt={`课堂照片 ${i + 1}`}
                        width="100%"
                        height={isMobile ? 100 : 120}
                        style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #F0DDD2' }}
                        fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjgwIiB5PSI2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTkiIGZvbnQtc2l6ZT0iMTIiPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4="
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              </div>
            )}

            {/* Parent reply section */}
            <div style={{ borderTop: '1px solid #F0DDD2', paddingTop: 14, marginTop: 8 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>💬 家长回复</Text>
              {(localReply || detailModal.parentReply) ? (
                <div style={{ background: '#FFF3E8', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, color: '#4B5563' }}>{localReply || detailModal.parentReply}</Text>
                  <div style={{ fontSize: 11, color: '#B0B8C1', marginTop: 4 }}>
                    已回复{detailModal.parentRepliedAt ? ` · ${fmtDateTime(detailModal.parentRepliedAt)}` : ''}
                  </div>
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
                  老师期待你的回复，帮助孩子更好地成长
                </Text>
              )}
              <Space.Compact style={{ width: '100%' }}>
                <Input.TextArea
                  rows={2}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="输入你对本次课堂反馈的回复..."
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </Space.Compact>
              <Button
                type="primary"
                size="small"
                loading={replying}
                disabled={!replyText.trim()}
                onClick={handleReply}
                style={{ marginTop: 8, background: '#E8784A', border: 'none', borderRadius: 8 }}
              >
                {detailModal.parentReply ? '更新回复' : '发送回复'}
              </Button>
            </div>

            {/* Admin reply */}
            {detailModal.adminReply && (
              <div style={{ borderTop: '1px solid #F0DDD2', paddingTop: 12, marginTop: 8 }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>👩‍🏫 老师/管理员回复</Text>
                <div style={{ background: '#E8F4FD', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 13, color: '#4B5563' }}>{detailModal.adminReply}</Text>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
