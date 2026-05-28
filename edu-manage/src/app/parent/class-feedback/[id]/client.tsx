'use client'

import { Button, Card, Descriptions, Empty, Image, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, BookOutlined, ClockCircleOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text, Paragraph } = Typography

export function FeedbackDetailClient({ feedback }: { feedback: any }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false

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
          <Descriptions.Item label="老师">{feedback.teacher?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="时间">
            {format(new Date(feedback.createdAt), 'yyyy-MM-dd HH:mm')}
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
        {feedback.summary && (
          <div style={{ background: '#FFFBF7', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>本节学习内容 / 孩子课堂表现</Text>
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 0, color: '#4B5563', whiteSpace: 'pre-wrap' }}>
              {feedback.summary}
            </Paragraph>
          </div>
        )}

        {/* Homework */}
        {feedback.homework?.length > 0 && (
          <div style={{ background: '#F5F3FF', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>作业 / 复习任务</Text>
            {feedback.homework.map((hw: any, i: number) => (
              <div key={i} style={{ fontSize: 13, marginBottom: 4, color: '#4B5563' }}>
                {hw.title || hw.content || `作业 ${i + 1}`}
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
        {feedback.imageUrls?.length > 0 && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>课堂资料</Text>
            <Image.PreviewGroup>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {feedback.imageUrls.map((url: string, i: number) => (
                  <Image
                    key={i}
                    src={url}
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
