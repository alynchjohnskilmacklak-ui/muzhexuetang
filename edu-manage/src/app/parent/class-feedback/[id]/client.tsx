'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Descriptions, Image, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, BookOutlined, ClockCircleOutlined, EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { fmtDateTime } from '@/lib/format-date'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import type { FeedbackImageVariant } from '@/lib/file-asset-variants'

const { Title, Text, Paragraph } = Typography

function subjectOfTeacher(subjects?: string | null) {
  return (subjects || '').split(/[，,、\s]+/).filter(Boolean)[0] || ''
}

function parentMasteryLabel(value: unknown) {
  const raw = value && typeof value === 'object' && 'rating' in value
    ? (value as { rating?: unknown }).rating
    : value
  if (typeof raw !== 'string') return ''
  return ({ GREAT: '掌握良好', OKAY: '基本掌握', NEEDS_IMPROVEMENT: '需要加强' } as Record<string, string>)[raw] || raw
}
type HomeworkItem = string | { title?: string; content?: string }
type FeedbackDetail = {
  id: string
  status: string
  parentReadAt?: string | null
  createdAt: string
  lessonContent?: string | null
  summary?: string | null
  overallComment?: string | null
  studentRating?: unknown
  knowledgePoints: string[]
  homework: HomeworkItem[]
  imageUrls: string[]
  images: FeedbackImageVariant[]
  teacher?: { name?: string; subjects?: string | null } | null
  classLesson?: { startTime?: string | null; endTime?: string | null; group?: { course?: { name?: string }; room?: { name?: string } | null } | null } | null
}

export function FeedbackDetailClient({ feedback }: { feedback: FeedbackDetail }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const imageUrls = Array.isArray(feedback.imageUrls) ? feedback.imageUrls : []
  const images = Array.isArray(feedback.images) && feedback.images.length === imageUrls.length
    ? feedback.images
    : imageUrls.map((url: string) => ({ originalUrl: url, previewUrl: url, thumbnailUrl: url }))
  const { urls: signedThumbnails, error: thumbnailError, refresh: retryThumbnails } = useSignedUrls(images.map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl))
  const { urls: signedPreviews, error: previewError, refresh: retryPreviews } = useSignedUrls(imagePreviewOpen
    ? images.map((image) => image.previewUrl || image.thumbnailUrl || image.originalUrl)
    : [])

  useEffect(() => {
    if (feedback.parentReadAt || feedback.status !== 'PUBLISHED') return
    void fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: feedback.id, markRead: true }),
    })
  }, [feedback.id, feedback.parentReadAt, feedback.status])

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/parent/class-feedback')}
        style={{ marginBottom: 16, padding: 0, color: '#5a4e3a' }}
      >
        返回课堂反馈
      </Button>

      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <BookOutlined style={{ color: '#534AB7', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>课堂反馈</Title>
          <Tag color="purple" style={{ borderRadius: 9999 }}>已发布</Tag>
        </div>

        <Descriptions column={isMobile ? 1 : 2} size="small" style={{ marginBottom: 20 }}>
          <Descriptions.Item label="老师">{feedback.teacher?.name || '-'}{subjectOfTeacher(feedback.teacher?.subjects) ? ` · ${subjectOfTeacher(feedback.teacher?.subjects)}` : ''}</Descriptions.Item>
          <Descriptions.Item label="时间">
            {fmtDateTime(feedback.createdAt)}
          </Descriptions.Item>
          {feedback.classLesson?.group?.course && (
            <>
              <Descriptions.Item label="课程">
                <BookOutlined style={{ marginRight: 4 }} />
                {feedback.classLesson.group.course.name}
              </Descriptions.Item>
              <Descriptions.Item label="教室">
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {feedback.classLesson.group.room?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="上课时间">
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {feedback.classLesson.startTime}-{feedback.classLesson.endTime}
              </Descriptions.Item>
            </>
          )}
        </Descriptions>

        {feedback.lessonContent && (
          <div style={{ background: '#FFFBF7', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>本节课学习内容</Text>
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
              {feedback.lessonContent}
            </Paragraph>
          </div>
        )}

        {/* Knowledge points */}
        {feedback.knowledgePoints?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>知识点</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {feedback.knowledgePoints.map((kp: string, i: number) => (
                <Tag key={i} style={{ borderRadius: 9999, fontSize: 12 }}>{kp}</Tag>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {(feedback.summary || parentMasteryLabel(feedback.studentRating)) && (
          <div style={{ background: '#FFFBF7', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>孩子掌握情况</Text>
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
              {feedback.summary || parentMasteryLabel(feedback.studentRating)}
            </Paragraph>
          </div>
        )}

        {feedback.overallComment && (
          <div style={{ background: '#F5F2EE', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>课堂反馈</Text>
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
              {feedback.overallComment}
            </Paragraph>
          </div>
        )}

        {/* Homework */}
        {feedback.homework?.length > 0 && (
          <div style={{ background: '#F5F3FF', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>作业 / 复习任务</Text>
            {feedback.homework.map((hw, i: number) => (
              <div key={i} style={{ fontSize: 13, marginBottom: 4, color: '#4B5563' }}>
                {typeof hw === 'string' ? hw : hw.title || hw.content || `作业 ${i + 1}`}
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#F7F4F0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>家长配合建议</Text>
          <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563' }}>
            根据老师反馈，建议家长课后关注孩子当天知识点复习和作业完成情况。如孩子对某个知识点仍有疑问，可在下次课前提醒老师重点回顾。
          </Paragraph>
        </div>

        {/* Images */}
        {imageUrls.length > 0 && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>课堂资料</Text>
            {(thumbnailError || previewError) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 10,
                padding: '10px 12px',
                borderRadius: 10,
                background: '#FFF4DE',
                color: '#8A5B00',
                fontSize: 12,
              }}>
                <span>图片连接暂时失败，文字反馈不受影响。</span>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => { retryThumbnails(); retryPreviews() }}>重新加载</Button>
              </div>
            )}
            <Image.PreviewGroup preview={{ onVisibleChange: setImagePreviewOpen }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {images.map((image, i: number) => (
                  <Image
                    key={i}
                    src={signedThumbnails[i]}
                    loading="lazy"
                    preview={{ src: signedPreviews[i] || signedThumbnails[i] }}
                    alt={`资料 ${i + 1}`}
                    width="100%"
                    height={isMobile ? 120 : 140}
                    style={{ objectFit: 'cover', borderRadius: 10, border: '1px solid #F0DDD2' }}
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        )}
      </Card>
    </div>
  )
}
