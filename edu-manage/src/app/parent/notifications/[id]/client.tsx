'use client'

import { Alert, Button, Card, Descriptions, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, BookOutlined, StarOutlined, FileTextOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

const { Title, Text, Paragraph } = Typography

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CLASSROOM_FEEDBACK: <BookOutlined />,
  PERFORMANCE_FEEDBACK: <StarOutlined />,
  PERFORMANCE_UPDATE: <StarOutlined />,
  PAPER_PUBLISHED: <FileTextOutlined />,
  EXAM_PAPER: <FileTextOutlined />,
}

const TYPE_LABELS: Record<string, string> = {
  CLASSROOM_FEEDBACK: '课堂反馈',
  PERFORMANCE_FEEDBACK: '表现反馈',
  PERFORMANCE_UPDATE: '表现更新',
  PAPER_PUBLISHED: '试卷通知',
  EXAM_PAPER: '试卷通知',
  ATTENDANCE: '考勤通知',
  SYSTEM: '系统通知',
}

export function NotificationDetailClient({
  notification, relatedData,
}: {
  notification: any
  relatedData: any
}) {
  const router = useRouter()
  const typeLabel = TYPE_LABELS[notification.type] || notification.type || '通知'
  const typeIcon = TYPE_ICONS[notification.type] || null
  const hasMissingRelated = notification.relatedType && notification.relatedId && !relatedData
  const fallbackAction = notification.relatedType === 'EXAM_PAPER'
    ? { label: '去学习档案查看试卷', href: '/parent/archive' }
    : notification.relatedType === 'CLASSROOM_FEEDBACK'
      ? { label: '去课堂反馈查看', href: '/parent/class-feedback' }
      : notification.relatedType === 'PERFORMANCE_FEEDBACK'
        ? { label: '去成长动态查看', href: '/parent/growth' }
        : null

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push('/parent/notifications')}
        style={{ marginBottom: 16, padding: 0, color: '#5a4e3a' }}
      >
        返回通知列表
      </Button>

      <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {typeIcon}
          <Title level={4} style={{ margin: 0 }}>{notification.title}</Title>
          <Tag style={{ borderRadius: 9999 }}>{typeLabel}</Tag>
        </div>

        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="时间">
            {format(new Date(notification.createdAt), 'yyyy-MM-dd HH:mm:ss')}
          </Descriptions.Item>
          {notification.readAt && (
            <Descriptions.Item label="已读时间">
              {format(new Date(notification.readAt), 'yyyy-MM-dd HH:mm:ss')}
            </Descriptions.Item>
          )}
        </Descriptions>

        {notification.content && (
          <div style={{ background: '#FFFBF7', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {notification.content}
            </Text>
          </div>
        )}

        {relatedData && (
          <div style={{ border: '1px solid #F0DDD2', borderRadius: 10, padding: 16, marginTop: 16 }}>
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>关联内容</Text>
            {notification.relatedType === 'CLASSROOM_FEEDBACK' && (
              <div>
                <Text>老师：{relatedData.teacher?.name || '-'}</Text>
                {relatedData.classLesson?.group?.course && (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">课程：{relatedData.classLesson.group.course.name}</Text>
                  </div>
                )}
                {relatedData.summary && (
                  <Paragraph style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: '#4B5563' }}>
                    {relatedData.summary}
                  </Paragraph>
                )}
                {relatedData.knowledgePoints?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {relatedData.knowledgePoints.map((kp: string, i: number) => (
                      <Tag key={i} style={{ borderRadius: 9999, fontSize: 11 }}>{kp}</Tag>
                    ))}
                  </div>
                )}
              </div>
            )}
            {notification.relatedType === 'PERFORMANCE_FEEDBACK' && (
              <div>
                <Text>老师：{relatedData.teacher?.name || '-'}</Text>
                <Text style={{ marginLeft: 12 }}>学员：{relatedData.student?.name || '-'}</Text>
                {relatedData.content && (
                  <Paragraph style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: '#4B5563' }}>
                    {relatedData.content}
                  </Paragraph>
                )}
                {relatedData.mood && (
                  <Tag style={{ borderRadius: 9999, marginTop: 4 }}>{relatedData.mood}</Tag>
                )}
              </div>
            )}
            {notification.relatedType === 'EXAM_PAPER' && (
              <div>
                <Text>老师：{relatedData.teacher?.name || '-'}</Text>
                <Text style={{ marginLeft: 12 }}>学员：{relatedData.student?.name || '-'}</Text>
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">科目：{relatedData.subject}</Text>
                </div>
                {relatedData.imageUrls?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {relatedData.imageUrls.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`试卷 ${i + 1}`} style={{ width: 120, height: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid #F0DDD2' }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {hasMissingRelated && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 16, borderRadius: 10, background: '#FFFBF7', border: '1px solid #F0DDD2' }}
            message="关联内容暂不可查看"
            description={
              <div>
                <Text style={{ color: '#7A6A5A' }}>
                  这条通知本身已完整展示。关联的试卷或反馈可能已删除、尚未发布，或暂未匹配到当前家长账号。
                </Text>
                {fallbackAction && (
                  <div style={{ marginTop: 12 }}>
                    <Button
                      size="small"
                      style={{ borderRadius: 8 }}
                      onClick={() => router.push(fallbackAction.href)}
                    >
                      {fallbackAction.label}
                    </Button>
                  </div>
                )}
              </div>
            }
          />
        )}

        {notification.href && (
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              style={{ background: '#E8784A', borderColor: '#E8784A', borderRadius: 8 }}
              onClick={() => router.push(notification.href)}
            >
              查看完整内容
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
