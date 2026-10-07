'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Descriptions, Image, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, BookOutlined, ClockCircleOutlined, EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { fmtDateTime } from '@/lib/format-date'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSignedUrls } from '@/hooks/useSignedUrls'
import type { FeedbackImageVariant } from '@/lib/file-asset-variants'
import { getParentFeedbackSections } from '@/lib/classroom-feedback/parent-feedback-content'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { KnowledgePointDetail } from '@/components/Feedback/KnowledgePointDetail'

const { Title, Text, Paragraph } = Typography

type HomeworkItem = string | { title?: string; content?: string }
type FeedbackDetail = {
  resolvedSubject?: string
  id: string
  status: string
  parentReadAt?: string | null
  createdAt: string
  lessonContent?: string | null
  summary?: string | null
  overallComment?: string | null
  studentRating?: unknown
  knowledgePoints: string[]
  knowledgeCard?: unknown
  tags?: string[]
  homework: HomeworkItem[]
  imageUrls: string[]
  images: FeedbackImageVariant[]
  signedThumbnails?: Record<string, string>
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
  const { urls: signedThumbnails, error: thumbnailError, refresh: retryThumbnails } = useSignedUrls(images.map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl), feedback.signedThumbnails)
  const { urls: signedPreviews, error: previewError, refresh: retryPreviews } = useSignedUrls(imagePreviewOpen
    ? images.map((image) => image.previewUrl || image.thumbnailUrl || image.originalUrl)
    : [])
  // 只保留"课堂反馈"正文卡；"本节课学习内容/孩子掌握情况"已并入正文（见 parent-feedback-content），不再单独成卡
  const sections = getParentFeedbackSections(feedback)
    .filter((section) => !['知识点', '课堂标签', '本节课学习内容', '孩子掌握情况'].includes(section.label))
  const knowledgeCard = parseStoredKnowledgeCard(feedback.knowledgeCard)
  const sectionItems = (content: string) => content
    .split(/\n+|[；;]/)
    .map((item) => item.replace(/^[-•\d.、\s]+/, '').trim())
    .filter(Boolean)

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
          <Descriptions.Item label="老师">{feedback.teacher?.name || '-'} · {feedback.resolvedSubject || '课堂反馈'}</Descriptions.Item>
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

        {/* Put the high-signal learning tags before media and long-form comments. */}
        {feedback.knowledgePoints?.length > 0 && (
          <div style={{ background: '#FFF8F4', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #F0DDD2' }}>
            <Text strong style={{ display: 'block', marginBottom: 10 }}>本节知识点</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {feedback.knowledgePoints.map((kp: string, i: number) => (
                <Tag color="orange" key={i} style={{ borderRadius: 9999, fontSize: 12, margin: 0 }}>{kp}</Tag>
              ))}
            </div>
          </div>
        )}

        {/* Images */}
        {imageUrls.length > 0 && (
          <div style={{ marginBottom: 16 }}>
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

        <div style={{ display: 'grid', gap: 12 }}>
          {sections.map((section) => {
            // "课堂反馈"为完整文章（含换行段落），整段展示；其余短卡按条目拆分
            const isLongForm = section.label === '课堂反馈'
            const items = isLongForm ? [] : sectionItems(section.content)
            return (
              <section key={section.label} style={{ background: '#FFFBF7', borderRadius: 14, padding: 16, border: '1px solid #F0DDD2' }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>{section.label}</Text>
                {isLongForm || items.length <= 1 ? (
                  <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
                    {section.content}
                  </Paragraph>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#4B5563', fontSize: 14, lineHeight: 1.8 }}>
                    {items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
              </section>
            )
          })}
        </div>

        {knowledgeCard && (
          <div style={{ marginTop: 12 }}><KnowledgePointDetail card={knowledgeCard} audience="parent" defaultOpen /></div>
        )}
      </Card>
    </div>
  )
}
